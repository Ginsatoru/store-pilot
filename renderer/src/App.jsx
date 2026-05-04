import React, { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from './components/Navbar.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import ProfileModal from './components/ProfileModal.jsx';
import Products from './pages/Products.jsx';
import Sync from './pages/Sync.jsx';
import Orders from './pages/Orders.jsx';
import Placeholder from './pages/Placeholder.jsx';
import { loadSettings, fetchProducts, fetchOrders, dbLoadOrders, dbSaveOrders, dbLoadProducts, dbSaveProducts, dbLoadQueue, dbUpsertQueueItem, dbDeleteQueueItem, dbClearQueue, ftpUploadImage, createProduct, updateProduct, deleteProduct } from './services/woo.js';
import LicenseGate from './components/LicenseGate.jsx';

const COLORS = ['#6366f1','#f59e0b','#10b981','#3b82f6','#ec4899','#8b5cf6','#f97316','#14b8a6'];

export function normalizeProduct(p, existingColor) {
  const sku = p.sku && p.sku.trim() !== '' ? p.sku.trim() : String(p.id);
  return {
    id:                p.id,
    sku,
    name:              p.name || 'Untitled',
    slug:              p.slug || '',
    type:              p.type || 'simple',
    permalink:         p.permalink || '',
    status:            p.status === 'publish' ? 'Live' : 'Draft',
    _status:           p.status,
    price:             parseFloat(p.price || 0),
    regular_price:     parseFloat(p.regular_price || 0),
    sale_price:        parseFloat(p.sale_price || 0),
    on_sale:           p.on_sale || false,
    stock:             p.stock_quantity ?? 0,
    stock_status:      p.stock_status || 'instock',
    manage_stock:      p.manage_stock || false,
    category:          p.categories?.[0]?.name || 'Uncategorized',
    categories:        p.categories || [],
    tags:              p.tags || [],
    images:            p.images || [],
    description:       p.description || '',
    short_description: p.short_description || '',
    weight:            p.weight || '',
    dimensions:        p.dimensions || { length: '', width: '', height: '' },
    date:              p.date_created || new Date().toISOString(),
    date_modified:     p.date_modified || '',
    color:             existingColor || COLORS[p.id % COLORS.length],
    localPreview:      p.images?.[0]?.src || null,
    _pending:          false,
    _raw:              p,
  };
}

function tempId() {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// Returns true only for real WooCommerce integer IDs
function isValidWooId(id) {
  if (id === null || id === undefined) return false;
  if (typeof id === 'string' && (id.startsWith('local_') || id.startsWith('import_'))) return false;
  const n = Number(id);
  return Number.isInteger(n) && n > 0;
}

function buildWooPayload(product, imageUrl) {
  return {
    name:              product.name,
    sku:               product.sku || '',
    type:              product.type || 'simple',
    status:            product.status === 'Live' ? 'publish' : 'draft',
    regular_price:     String(product.regular_price || product.price || 0),
    sale_price:        product.sale_price > 0 ? String(product.sale_price) : '',
    stock_quantity:    product.stock ?? 0,
    manage_stock:      product.manage_stock ?? true,
    stock_status:      product.stock_status || 'instock',
    categories:        product.categories?.length
                         ? product.categories
                         : product.category ? [{ name: product.category }] : [],
    tags:              product.tags || [],
    weight:            product.weight || '',
    dimensions:        product.dimensions || { length: '', width: '', height: '' },
    short_description: product.short_description || '',
    description:       product.description || '',
    ...(imageUrl ? { images: [{ src: imageUrl }] } : {}),
  };
}

const INTERVAL_MS = {
  '5 minutes':  5  * 60 * 1000,
  '15 minutes': 15 * 60 * 1000,
  '30 minutes': 30 * 60 * 1000,
  '1 hour':     60 * 60 * 1000,
  '2 hours':    2  * 60 * 60 * 1000,
  '6 hours':    6  * 60 * 60 * 1000,
};

function resolveTheme(theme) {
  if (theme === 'Dark')  return 'dark';
  if (theme === 'Light') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  const resolved = resolveTheme(theme);
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

export default function App() {
  const [page, setPage]                   = useState('Products');
  const [settingsOpen, setSettingsOpen]   = useState(false);
  const [profileOpen, setProfileOpen]     = useState(false);
  const [settings, setSettings]           = useState(null);
  const [syncSettings, setSyncSettings]   = useState({ autoSync: false, interval: '15 minutes' });
  const [theme, setTheme]                 = useState('Light');
  const [online, setOnline]               = useState(navigator.onLine);
  const [license, setLicense]             = useState(null);
  const [licenseInvalidReason, setLicenseInvalidReason] = useState(null);
  const [licenseWarning, setLicenseWarning] = useState(null);

  // Products
  const [productList, setProductList]       = useState([]);
  const [productLoading, setProductLoading] = useState(true);
  const [productError, setProductError]     = useState(null);
  const [fetched, setFetched]               = useState(false);

  // Orders
  const [orderList, setOrderList] = useState([]);

  // Sync
  const [pendingQueue, setPendingQueue] = useState({});
  const [syncing, setSyncing]           = useState(false);
  const [syncLog, setSyncLog]           = useState([]);

  const syncingRef      = useRef(false);
  const pendingQueueRef = useRef({});
  const productListRef  = useRef([]);   // always-current snapshot for async callbacks
  const settingsRef     = useRef(null);
  const autoSyncTimer   = useRef(null);

  useEffect(() => { pendingQueueRef.current = pendingQueue; }, [pendingQueue]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { productListRef.current = productList; }, [productList]);

  // ── Apply theme ───────────────────────────────────────────────────────────────
  useEffect(() => {
    applyTheme(theme);
    if (theme === 'System') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme('System');
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [theme]);

  // ── Online/offline ────────────────────────────────────────────────────────────
  useEffect(() => {
    const up   = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online',  up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);

  // ── License warning listener ──────────────────────────────────────────────────
  useEffect(() => {
    if (!window.electronAPI?.onLicenseWarning) return;
    const unsub = window.electronAPI.onLicenseWarning((payload) => {
      console.log('[App] license:warning', payload);
      setLicenseWarning(payload);
    });
    return () => unsub?.();
  }, []);

  // ── License invalid listener ──────────────────────────────────────────────────
  useEffect(() => {
    if (!window.electronAPI?.onLicenseInvalid) return;
    const unsub = window.electronAPI.onLicenseInvalid(async (reason) => {
      console.log('[App] license:invalid', reason);
      setLicenseWarning(null);
      await window.electronAPI.licenseClear();
      setLicenseInvalidReason(reason || 'Your license has been deactivated.');
      setLicense(null);
    });
    return () => unsub?.();
  }, []);

  const log = useCallback((type, msg) =>
    setSyncLog(prev => [...prev, { type, msg, time: new Date().toLocaleTimeString() }])
  , []);

  // ── Initial load after license confirmed ──────────────────────────────────────
  useEffect(() => {
    if (!license) return;

    setLicenseInvalidReason(null);
    setLicenseWarning(null);

    if (window.electronAPI?.dbLoadProfile && window.electronAPI?.dbSaveProfile) {
      window.electronAPI.dbLoadProfile().then(res => {
        if (!res?.ok || !res.data) {
          window.electronAPI.dbSaveProfile({
            key:           license.key,
            plan:          license.plan,
            label:         license.label,
            features:      license.features,
            expiresAt:     license.expiresAt,
            user:          license.user,
            lastValidated: Date.now(),
          }).catch(() => {});
        }
      }).catch(() => {});
    }

    // Restore cached products + queue from SQLite
    Promise.all([dbLoadProducts(), dbLoadQueue(), dbLoadOrders()]).then(([pRes, qRes, oRes]) => {
      if (pRes.ok && pRes.data?.length > 0) {
        setProductList(pRes.data);
        productListRef.current = pRes.data;
        setFetched(true);
        setProductLoading(false);
      }
      if (qRes.ok && qRes.data) {
        setPendingQueue(qRes.data);
        pendingQueueRef.current = qRes.data;
        if (pRes.ok && pRes.data?.length > 0) {
          const queuedSkus = new Set(
            Object.values(qRes.data).map(item => item.product?.sku || item.product?.id)
          );
          if (queuedSkus.size > 0) {
            setProductList(prev => {
              const next = prev.map(p =>
                queuedSkus.has(p.sku) || queuedSkus.has(String(p.id))
                  ? { ...p, _pending: true }
                  : p
              );
              productListRef.current = next;
              return next;
            });
          }
        }
      }
      if (oRes.ok && Array.isArray(oRes.data) && oRes.data.length > 0) {
        setOrderList(oRes.data);
      }
    }).catch(e => console.error('DB load error:', e));

    loadSettings().then(s => {
      if (s?.conn?.storeUrl && s?.conn?.consumerKey) {
        setSettings(s.conn);
        settingsRef.current = s.conn;
      } else {
        setProductError('No store connection configured. Open Settings to connect your store.');
        setProductLoading(false);
      }
      if (s?.sync)              setSyncSettings(s.sync);
      if (s?.appearance?.theme) setTheme(s.appearance.theme);
    }).catch(() => { setProductError('Failed to load settings.'); setProductLoading(false); });
  }, [license]);

  // ── Fetch products ────────────────────────────────────────────────────────────
  const doFetchProducts = useCallback(async (conn) => {
    setProductLoading(true);
    setProductError(null);
    try {
      const res = await fetchProducts(conn, { perPage: 100, page: 1 });
      if (res.ok) {
        const normalized = (res.data || []).map(p => normalizeProduct(p));
        const seen = new Map();
        for (const p of normalized) {
          if (!seen.has(p.sku)) seen.set(p.sku, p);
        }
        const deduped = Array.from(seen.values());
        const queuedSkus = new Set(
          Object.values(pendingQueueRef.current).map(item => item.product?.sku || item.product?.id)
        );
        const merged = deduped.map(p =>
          queuedSkus.has(p.sku) || queuedSkus.has(String(p.id))
            ? { ...p, _pending: true }
            : p
        );
        setProductList(merged);
        productListRef.current = merged;
        setFetched(true);
        dbSaveProducts(merged).catch(() => {});
      } else {
        setProductError(res.error || 'Failed to fetch products');
      }
    } catch (e) { setProductError(e.message || 'Unknown error'); }
    setProductLoading(false);
  }, []);

  useEffect(() => { if (settings && !fetched) doFetchProducts(settings); }, [settings, fetched]);

  const handleRefreshProducts = useCallback(() => {
    if (settings) doFetchProducts(settings);
  }, [settings, doFetchProducts]);

  // ── Core sync ─────────────────────────────────────────────────────────────────
  const runSync = useCallback(async () => {
    if (syncingRef.current) return;

    syncingRef.current = true;
    setSyncing(true);

    let s;
    try { s = await loadSettings(); }
    catch (e) { log('err', 'Failed to load settings: ' + e.message); syncingRef.current = false; setSyncing(false); return; }

    const conn = settingsRef.current;
    const ftpSettings = s?.conn?.ftpHost ? {
      host: s.conn.ftpHost, port: s.conn.ftpPort || '21',
      user: s.conn.ftpUser, pass: s.conn.ftpPass,
      path: s.conn.ftpPath || 'public_html/wp-content/uploads/',
    } : null;

    const entries = Object.entries(pendingQueueRef.current);
    if (entries.length > 0) {
      log('info', `Pushing ${entries.length} product change(s) to WooCommerce…`);
      let successCount = 0, failCount = 0;

      for (const [key, item] of entries) {
        let { action, product, imageFile, imagePreview } = item;
        const name = product?.name || `Product #${product?.id}`;

        // ── Resolve real WooCommerce ID by SKU from live productList ──────────
        let resolvedId = product.id;
        if (product.sku) {
          const live = productListRef.current.find(p => p.sku === product.sku);
          if (live && isValidWooId(live.id)) {
            resolvedId = live.id;
          }
        }

        // Fall back to create if still no valid ID for update
        if (action === 'update' && !isValidWooId(resolvedId)) {
          log('info', `"${name}" has no valid WooCommerce ID — treating as create.`);
          action = 'create';
        }

        // For delete, skip entirely if no valid ID — product never made it to Woo
        if (action === 'delete' && !isValidWooId(resolvedId)) {
          log('info', `"${name}" has no WooCommerce ID — removing from queue.`);
          setPendingQueue(prev => { const n = { ...prev }; delete n[key]; return n; });
          dbDeleteQueueItem(key).catch(() => {});
          successCount++;
          continue;
        }

        try {
          let imageUrl = null;
          if (imagePreview && imagePreview.startsWith('data:') && ftpSettings) {
            log('info', `Uploading image for "${name}"…`);
            const base64   = imagePreview.includes(',') ? imagePreview.split(',')[1] : imagePreview;
            const ext      = imageFile?.name?.split('.').pop() || 'jpg';
            const fileName = `product-${product.sku || product.id}-${Date.now()}.${ext}`;
            const upRes    = await ftpUploadImage({ ftpSettings, fileData: base64, fileName });
            if (upRes.ok) {
              const storeBase    = (s?.conn?.storeUrl || '').replace(/\/$/, '');
              const uploadFolder = (ftpSettings.path || '').replace(/^public_html/, '').replace(/\/$/, '');
              imageUrl = `${storeBase}${uploadFolder}/${fileName}`;
              log('info', `Image uploaded for "${name}".`);
            } else {
              log('err', `Image upload failed for "${name}": ${upRes.error}. Continuing without image.`);
            }
          } else if (imagePreview && imagePreview.startsWith('http')) {
            imageUrl = imagePreview;
          }

          const payload = buildWooPayload(product, imageUrl);

          if (action === 'create') {
            log('info', `Creating "${name}" in WooCommerce…`);
            const res = await createProduct(conn, payload);
            if (res.ok) {
              const synced = normalizeProduct(res.data, product.color);
              setPendingQueue(prev => { const n = { ...prev }; delete n[key]; return n; });
              dbDeleteQueueItem(key).catch(() => {});
              setProductList(prev => {
                const next = prev.map(p =>
                  (p.sku && p.sku === product.sku) || p.id === product.id
                    ? { ...synced, _pending: false } : p
                );
                productListRef.current = next;
                dbSaveProducts(next).catch(() => {});
                return next;
              });
              log('ok', `"${name}" created successfully.`);
              successCount++;
            } else { log('err', `Create failed for "${name}": ${res.error}`); failCount++; }

          } else if (action === 'update') {
            log('info', `Updating "${name}" in WooCommerce…`);
            const res = await updateProduct(conn, resolvedId, payload);
            if (res.ok) {
              const synced = normalizeProduct(res.data, product.color);
              setPendingQueue(prev => { const n = { ...prev }; delete n[key]; return n; });
              dbDeleteQueueItem(key).catch(() => {});
              setProductList(prev => {
                const next = prev.map(p =>
                  (p.sku && p.sku === synced.sku) || p.id === synced.id
                    ? { ...synced, _pending: false } : p
                );
                productListRef.current = next;
                dbSaveProducts(next).catch(() => {});
                return next;
              });
              log('ok', `"${name}" updated successfully.`);
              successCount++;
            } else { log('err', `Update failed for "${name}": ${res.error}`); failCount++; }

          } else if (action === 'delete') {
            log('info', `Deleting "${name}" from WooCommerce…`);
            const res = await deleteProduct(conn, resolvedId);
            if (res.ok) {
              setPendingQueue(prev => { const n = { ...prev }; delete n[key]; return n; });
              dbDeleteQueueItem(key).catch(() => {});
              setProductList(prev => {
                const next = prev.filter(p =>
                  !((p.sku && p.sku === product.sku) || p.id === product.id)
                );
                productListRef.current = next;
                dbSaveProducts(next).catch(() => {});
                return next;
              });
              log('ok', `"${name}" deleted successfully.`);
              successCount++;
            } else { log('err', `Delete failed for "${name}": ${res.error}`); failCount++; }
          }
        } catch (e) { log('err', `Error processing "${name}": ${e.message}`); failCount++; }
      }

      log(failCount === 0 ? 'ok' : 'info', `Products: ${successCount} pushed, ${failCount} failed.`);
    } else {
      log('info', 'No pending product changes to push.');
    }

    log('info', 'Fetching latest orders from WooCommerce…');
    try {
      const res = await fetchOrders(conn, { perPage: 100, page: 1 });
      if (res.ok) {
        const orders = res.data || [];
        setOrderList(orders);
        dbSaveOrders(orders).catch(() => {});
        log('ok', `Orders synced: ${orders.length} order(s) downloaded.`);
      } else {
        log('err', `Failed to fetch orders: ${res.error}`);
      }
    } catch (e) {
      log('err', `Orders fetch error: ${e.message}`);
    }

    log('ok', 'Sync complete.');
    syncingRef.current = false;
    setSyncing(false);
  }, [log]);

  // ── Auto sync timer ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (autoSyncTimer.current) clearInterval(autoSyncTimer.current);
    if (syncSettings.autoSync) {
      const ms = INTERVAL_MS[syncSettings.interval] || INTERVAL_MS['15 minutes'];
      autoSyncTimer.current = setInterval(() => runSync(), ms);
    }
    return () => { if (autoSyncTimer.current) clearInterval(autoSyncTimer.current); };
  }, [syncSettings, runSync]);

  // ── Queue management ──────────────────────────────────────────────────────────
  const handleQueueChange = useCallback(({ action, product, imageFile, imagePreview }) => {
    const key = `${action}_${product.sku || product.id}`;

    if (action === 'create') {
      const local = { ...product, id: product.id || tempId(), _pending: true };
      setProductList(prev => {
        const next = [local, ...prev];
        productListRef.current = next;
        return next;
      });
      const item = { action, product: local, imageFile, imagePreview };
      setPendingQueue(prev => {
        const next = { ...prev, [key]: item };
        pendingQueueRef.current = next;
        return next;
      });
      dbUpsertQueueItem(key, item).catch(() => {});
      dbSaveProducts([local]).catch(() => {});

    } else if (action === 'update') {
      const updated = { ...product, _pending: true };
      setProductList(prev => {
        const next = prev.map(p =>
          (p.sku && p.sku === product.sku) || p.id === product.id ? updated : p
        );
        productListRef.current = next;
        return next;
      });
      const item = { action, product: updated, imageFile, imagePreview };
      setPendingQueue(prev => {
        const next = { ...prev, [key]: item };
        pendingQueueRef.current = next;
        return next;
      });
      dbUpsertQueueItem(key, item).catch(() => {});
      dbSaveProducts([updated]).catch(() => {});

    } else if (action === 'delete') {
      // Resolve the real WooCommerce ID now, while the product is still in productList
      const live = productListRef.current.find(p =>
        (p.sku && p.sku === product.sku) || p.id === product.id
      );
      const productWithId = {
        ...product,
        id: (live && isValidWooId(live.id)) ? live.id : product.id,
      };
      setProductList(prev => {
        const next = prev.filter(p =>
          !((p.sku && p.sku === product.sku) || p.id === product.id)
        );
        productListRef.current = next;
        return next;
      });
      const item = { action, product: productWithId };
      setPendingQueue(prev => {
        const next = { ...prev, [key]: item };
        pendingQueueRef.current = next;
        return next;
      });
      dbUpsertQueueItem(key, item).catch(() => {});
    }
  }, []);

  const handleRemoveFromQueue = useCallback((key) => {
    setPendingQueue(prev => {
      const next = { ...prev };
      delete next[key];
      pendingQueueRef.current = next;
      return next;
    });
    dbDeleteQueueItem(key).catch(() => {});
  }, []);

  const handleClearQueue = useCallback(() => {
    setPendingQueue({});
    pendingQueueRef.current = {};
    dbClearQueue().catch(() => {});
  }, []);

  // ── Settings close ────────────────────────────────────────────────────────────
  const handleSettingsClose = useCallback(() => {
    setSettingsOpen(false);
    loadSettings().then(s => {
      if (s?.sync)              setSyncSettings(s.sync);
      if (s?.appearance?.theme) setTheme(s.appearance.theme);
      if (s?.conn?.storeUrl && s?.conn?.consumerKey) {
        setSettings(prev => {
          const changed =
            prev?.storeUrl       !== s.conn.storeUrl ||
            prev?.consumerKey    !== s.conn.consumerKey ||
            prev?.consumerSecret !== s.conn.consumerSecret;
          if (changed) {
            setFetched(false);
            setOrderList([]);
            dbSaveOrders([]).catch(() => {});
          }
          return s.conn;
        });
      }
    }).catch(() => {});
  }, []);

  // ── License gate ──────────────────────────────────────────────────────────────
  if (!license) {
    return <LicenseGate onActivated={setLicense} invalidReason={licenseInvalidReason} />;
  }

  // ── Main app ──────────────────────────────────────────────────────────────────
  const renderPage = () => {
    switch (page) {
      case 'Products':
        return (
          <Products
            settings={settings}
            productList={productList}
            loading={productLoading}
            error={productError}
            setError={setProductError}
            onRefresh={handleRefreshProducts}
            onQueueChange={handleQueueChange}
            pendingQueue={pendingQueue}
          />
        );
      case 'Orders':
        return <Orders orderList={orderList} syncing={syncing} />;
      case 'Sync':
        return (
          <Sync
            syncing={syncing}
            syncLog={syncLog}
            setSyncLog={setSyncLog}
            pendingQueue={pendingQueue}
            productList={productList}
            onSyncNow={runSync}
            onRemoveFromQueue={handleRemoveFromQueue}
            onClearQueue={handleClearQueue}
            syncSettings={syncSettings}
            online={online}
          />
        );
      default:
        return <Placeholder title={page} />;
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[linear-gradient(to_top,#f3e7e9_0%,#e3eeff_99%,#e3eeff_100%)] dark:bg-none dark:bg-[#111110]">
      <Navbar
        active={page}
        onNavigate={setPage}
        onSettingsOpen={() => setSettingsOpen(true)}
        onProfileOpen={() => setProfileOpen(true)}
        pendingCount={Object.keys(pendingQueue).length}
        online={online}
        licenseWarning={licenseWarning}
      />
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {renderPage()}
      </div>
      {settingsOpen && <SettingsModal onClose={handleSettingsClose} />}
      {profileOpen  && <ProfileModal onClose={() => setProfileOpen(false)} license={license} />}
    </div>
  );
}