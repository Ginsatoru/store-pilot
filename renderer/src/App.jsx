import React, { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from './components/Navbar.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import Products from './pages/Products.jsx';
import Sync from './pages/Sync.jsx';
import Orders from './pages/Orders.jsx';
import Placeholder from './pages/Placeholder.jsx';
import { loadSettings, fetchProducts, fetchOrders, dbLoadOrders, dbSaveOrders, ftpUploadImage, createProduct, updateProduct, deleteProduct } from './services/woo.js';

export function normalizeProduct(p, existingColor) {
  const colors = ['#6366f1','#f59e0b','#10b981','#3b82f6','#ec4899','#8b5cf6','#f97316','#14b8a6'];
  return {
    id:           p.id,
    name:         p.name || 'Untitled',
    category:     p.categories?.[0]?.name || 'Uncategorized',
    price:        parseFloat(p.price || p.regular_price || 0),
    stock:        p.stock_quantity ?? 0,
    date:         p.date_created || new Date().toISOString(),
    status:       p.status === 'publish' ? 'Live' : 'Draft',
    color:        existingColor || colors[p.id % colors.length],
    localPreview: null,
    _raw:         p,
  };
}

function tempId() {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

const INTERVAL_MS = {
  '5 minutes':  5  * 60 * 1000,
  '15 minutes': 15 * 60 * 1000,
  '30 minutes': 30 * 60 * 1000,
  '1 hour':     60 * 60 * 1000,
  '2 hours':    2  * 60 * 60 * 1000,
  '6 hours':    6  * 60 * 60 * 1000,
};

// ── Theme helper ──────────────────────────────────────────────────────────────
function resolveTheme(theme) {
  if (theme === 'Dark')  return 'dark';
  if (theme === 'Light') return 'light';
  // System: use OS preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  const resolved = resolveTheme(theme);
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

export default function App() {
  const [page, setPage]                   = useState('Products');
  const [settingsOpen, setSettingsOpen]   = useState(false);
  const [settings, setSettings]           = useState(null);
  const [syncSettings, setSyncSettings]   = useState({ autoSync: false, interval: '15 minutes' });
  const [theme, setTheme]                 = useState('Light');
  const [online, setOnline]               = useState(navigator.onLine);

  // Products
  const [productList, setProductList]         = useState([]);
  const [productLoading, setProductLoading]   = useState(true);
  const [productError, setProductError]       = useState(null);
  const [fetched, setFetched]                 = useState(false);

  // Orders — loaded from disk on startup, refreshed via sync
  const [orderList, setOrderList]             = useState([]);

  // Sync
  const [pendingQueue, setPendingQueue]       = useState({});
  const [syncing, setSyncing]                 = useState(false);
  const [syncLog, setSyncLog]                 = useState([]);

  const syncingRef      = useRef(false);
  const pendingQueueRef = useRef({});
  const settingsRef     = useRef(null);
  const autoSyncTimer   = useRef(null);

  useEffect(() => { pendingQueueRef.current = pendingQueue; }, [pendingQueue]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  // ── Apply theme whenever it changes ──────────────────────────────────────────
  useEffect(() => {
    applyTheme(theme);

    // If System, also listen for OS preference changes
    if (theme === 'System') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme('System');
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [theme]);

  // ── Online/offline tracking ───────────────────────────────────────────────────
  useEffect(() => {
    const up   = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online',  up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);

  const log = useCallback((type, msg) =>
    setSyncLog(prev => [...prev, { type, msg, time: new Date().toLocaleTimeString() }])
  , []);

  // ── Initial load ─────────────────────────────────────────────────────────────
  useEffect(() => {
    // Load persisted orders immediately
    dbLoadOrders().then(res => {
      if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
        setOrderList(res.data);
      }
    }).catch(() => {});

    loadSettings().then(s => {
      if (s?.conn?.storeUrl && s?.conn?.consumerKey) {
        setSettings(s.conn);
        settingsRef.current = s.conn;
      } else {
        setProductError('No store connection configured. Open Settings to connect your store.');
        setProductLoading(false);
      }
      if (s?.sync)       setSyncSettings(s.sync);
      if (s?.appearance?.theme) {
        setTheme(s.appearance.theme);
      }
    }).catch(() => { setProductError('Failed to load settings.'); setProductLoading(false); });
  }, []);

  // ── Fetch products (load / manual refresh only) ───────────────────────────────
  const doFetchProducts = useCallback(async (conn) => {
    setProductLoading(true);
    setProductError(null);
    try {
      const res = await fetchProducts(conn, { perPage: 100, page: 1 });
      if (res.ok) { setProductList((res.data || []).map(p => normalizeProduct(p))); setFetched(true); }
      else setProductError(res.error || 'Failed to fetch products');
    } catch (e) { setProductError(e.message || 'Unknown error'); }
    setProductLoading(false);
  }, []);

  useEffect(() => { if (settings && !fetched) doFetchProducts(settings); }, [settings, fetched]);

  const handleRefreshProducts = useCallback(() => { if (settings) doFetchProducts(settings); }, [settings, doFetchProducts]);

  // ── Core sync — Phase 1: push products, Phase 2: pull orders ─────────────────
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

    // ── Phase 1: Push pending product changes ─────────────────────────────────
    const entries = Object.entries(pendingQueueRef.current);
    if (entries.length > 0) {
      log('info', `Pushing ${entries.length} product change(s) to WooCommerce…`);
      let successCount = 0, failCount = 0;

      for (const [key, item] of entries) {
        const { action, product, imageFile, imagePreview } = item;
        const name = product?.name || `Product #${product?.id}`;

        try {
          let imageUrl = null;
          if (imagePreview && ftpSettings) {
            log('info', `Uploading image for "${name}"…`);
            const base64   = imagePreview.includes(',') ? imagePreview.split(',')[1] : imagePreview;
            const ext      = imageFile?.name?.split('.').pop() || 'jpg';
            const fileName = `product-${product.id}-${Date.now()}.${ext}`;
            const upRes    = await ftpUploadImage({ ftpSettings, fileData: base64, fileName });
            if (upRes.ok) {
              const storeBase    = (s?.conn?.storeUrl || '').replace(/\/$/, '');
              const uploadFolder = (ftpSettings.path || '').replace(/^public_html/, '').replace(/\/$/, '');
              imageUrl = `${storeBase}${uploadFolder}/${fileName}`;
              log('info', `Image uploaded for "${name}".`);
            } else {
              log('err', `Image upload failed for "${name}": ${upRes.error}. Continuing without image.`);
            }
          }

          const payload = {
            name:           product.name,
            regular_price:  String(product.price),
            stock_quantity: product.stock,
            manage_stock:   true,
            status:         product.status === 'Live' ? 'publish' : 'draft',
            categories:     product.category ? [{ name: product.category }] : [],
            ...(imageUrl ? { images: [{ src: imageUrl }] } : {}),
          };

          if (action === 'create') {
            log('info', `Creating "${name}" in WooCommerce…`);
            const res = await createProduct(conn, payload);
            if (res.ok) {
              const synced = normalizeProduct(res.data, product.color);
              setPendingQueue(prev => { const n = { ...prev }; delete n[key]; return n; });
              setProductList(prev => prev.map(p => p.id === product.id ? { ...synced, _pending: false } : p));
              log('ok', `"${name}" created successfully.`);
              successCount++;
            } else { log('err', `Create failed for "${name}": ${res.error}`); failCount++; }

          } else if (action === 'update') {
            log('info', `Updating "${name}" in WooCommerce…`);
            const res = await updateProduct(conn, product.id, payload);
            if (res.ok) {
              const synced = normalizeProduct(res.data, product.color);
              setPendingQueue(prev => { const n = { ...prev }; delete n[key]; return n; });
              setProductList(prev => prev.map(p => p.id === synced.id ? { ...synced, _pending: false } : p));
              log('ok', `"${name}" updated successfully.`);
              successCount++;
            } else { log('err', `Update failed for "${name}": ${res.error}`); failCount++; }

          } else if (action === 'delete') {
            log('info', `Deleting "${name}" from WooCommerce…`);
            const res = await deleteProduct(conn, product.id);
            if (res.ok) {
              setPendingQueue(prev => { const n = { ...prev }; delete n[key]; return n; });
              setProductList(prev => prev.filter(p => p.id !== product.id));
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

    // ── Phase 2: Pull orders from WooCommerce and persist ─────────────────────
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
    const key = `${action}_${product.id}`;
    if (action === 'create') {
      const local = { ...product, id: product.id || tempId(), _pending: true };
      setProductList(prev => [local, ...prev]);
      setPendingQueue(prev => ({ ...prev, [key]: { action, product: local, imageFile, imagePreview } }));
    } else if (action === 'update') {
      setProductList(prev => prev.map(p => p.id === product.id ? { ...product, _pending: true } : p));
      setPendingQueue(prev => ({ ...prev, [key]: { action, product, imageFile, imagePreview } }));
    } else if (action === 'delete') {
      setProductList(prev => prev.filter(p => p.id !== product.id));
      setPendingQueue(prev => ({ ...prev, [key]: { action, product } }));
    }
  }, []);

  const handleRemoveFromQueue = useCallback((key) => {
    setPendingQueue(prev => { const n = { ...prev }; delete n[key]; return n; });
  }, []);

  const handleClearQueue = useCallback(() => setPendingQueue({}), []);

  // ── Settings close ────────────────────────────────────────────────────────────
  const handleSettingsClose = useCallback(() => {
    setSettingsOpen(false);
    loadSettings().then(s => {
      if (s?.sync)             setSyncSettings(s.sync);
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
        return (
          <Orders
            orderList={orderList}
            syncing={syncing}
          />
        );
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
        pendingCount={Object.keys(pendingQueue).length}
        online={online}
      />
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {renderPage()}
      </div>
      {settingsOpen && <SettingsModal onClose={handleSettingsClose} />}
    </div>
  );
}
