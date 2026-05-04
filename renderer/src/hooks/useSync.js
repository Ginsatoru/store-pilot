import { useState, useCallback, useRef, useEffect } from 'react';
import {
  loadSettings, fetchOrders,
  dbLoadProducts, dbSaveProducts,
  dbLoadQueue, dbDeleteQueueItem,
  dbSaveOrders,
  ftpUploadImage, createProduct, updateProduct, deleteProduct,
} from '../services/woo';
import { normalizeProduct } from './useProducts';

const BATCH_SIZE = 10;

const INTERVAL_MS = {
  '5 minutes':  5  * 60 * 1000,
  '15 minutes': 15 * 60 * 1000,
  '30 minutes': 30 * 60 * 1000,
  '1 hour':     60 * 60 * 1000,
  '2 hours':    2  * 60 * 60 * 1000,
  '6 hours':    6  * 60 * 60 * 1000,
};

// Log entry types with labels and colors (used in SyncLog UI)
export const LOG_TYPES = {
  info:    { icon: '●', label: 'info',    color: 'text-blue-400'  },
  ok:      { icon: '✓', label: 'ok',      color: 'text-green-400' },
  err:     { icon: '✕', label: 'error',   color: 'text-red-400'   },
  section: { icon: '—', label: 'section', color: 'text-zinc-500'  },
};

function isValidWooId(id) {
  if (id === null || id === undefined) return false;
  if (typeof id === 'string' && (id.startsWith('local_') || id.startsWith('import_'))) return false;
  const n = Number(id);
  return Number.isInteger(n) && n > 0;
}

function buildWooPayload(product, imageUrl) {
  const resolvedImage =
    imageUrl ||
    (product.localPreview && product.localPreview.startsWith('http') ? product.localPreview : null);
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
    ...(resolvedImage ? { images: [{ src: resolvedImage }] } : {}),
  };
}

export function useSync({ settingsRef, setProductList, setPendingQueue, setOrderList, syncSettings }) {
  const [syncing, setSyncing]   = useState(false);
  const [syncLog, setSyncLog]   = useState([]);
  const syncingRef              = useRef(false);
  const autoSyncTimer           = useRef(null);

  // Each entry: { type, msg, time, group? }
  const log = useCallback((type, msg, group) =>
    setSyncLog(prev => [...prev, { type, msg, group, time: new Date().toLocaleTimeString() }])
  , []);

  const section = useCallback((msg) => log('section', msg), [log]);

  const runSync = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    setSyncLog([]);

    let s;
    try { s = await loadSettings(); }
    catch (e) {
      log('err', 'Failed to load settings: ' + e.message);
      syncingRef.current = false;
      setSyncing(false);
      return;
    }

    const conn = settingsRef.current;
    const ftpSettings = s?.conn?.ftpHost ? {
      host: s.conn.ftpHost, port: s.conn.ftpPort || '21',
      user: s.conn.ftpUser, pass: s.conn.ftpPass,
      path: s.conn.ftpPath || 'public_html/wp-content/uploads/',
    } : null;

    // ── Products ─────────────────────────────────────────────────────────────
    const qRes = await dbLoadQueue();
    const queue = (qRes.ok && qRes.data) ? qRes.data : {};
    const entries = Object.entries(queue);

    section('Products');

    if (entries.length === 0) {
      log('info', 'No pending changes.');
    } else {
      log('info', `${entries.length} change(s) · batches of ${BATCH_SIZE}`);

      // Load current local DB state as working set
      const pRes = await dbLoadProducts();
      let latestProducts = pRes.ok ? [...pRes.data] : [];

      let successCount = 0;
      let failCount    = 0;

      const processEntry = async ([key, item]) => {
        let { action, product, imagePreview } = item;
        const name = product?.name || `#${product?.id}`;

        let resolvedId = product.id;
        if (product.sku) {
          const live = latestProducts.find(p => p.sku === product.sku);
          if (live && isValidWooId(live.id)) resolvedId = live.id;
        }

        if (action === 'update' && !isValidWooId(resolvedId)) action = 'create';

        if (action === 'delete' && !isValidWooId(resolvedId)) {
          // Product was local-only — just remove from queue, already removed from DB
          await dbDeleteQueueItem(key);
          return { key, action: 'delete_local', product, ok: true };
        }

        try {
          let imageUrl     = null;
          let finalPreview = product.localPreview || null;

          if (imagePreview && imagePreview.startsWith('data:') && ftpSettings) {
            const base64   = imagePreview.includes(',') ? imagePreview.split(',')[1] : imagePreview;
            const fileName = `product-${product.sku || product.id}-${Date.now()}.jpg`;
            const upRes    = await ftpUploadImage({ ftpSettings, fileData: base64, fileName });
            if (upRes.ok) {
              const storeBase    = (s?.conn?.storeUrl || '').replace(/\/$/, '');
              const uploadFolder = (ftpSettings.path || '').replace(/^public_html/, '').replace(/\/$/, '');
              imageUrl     = `${storeBase}${uploadFolder}/${fileName}`;
              finalPreview = imageUrl;
            } else {
              log('err', `Image upload failed for "${name}": ${upRes.error}`);
            }
          } else if (imagePreview && imagePreview.startsWith('http')) {
            finalPreview = imagePreview;
          }

          const payload = buildWooPayload({ ...product, localPreview: finalPreview }, imageUrl);

          if (action === 'create') {
            const res = await createProduct(conn, payload);
            if (res.ok) {
              await dbDeleteQueueItem(key);
              return { key, action, product, synced: normalizeProduct(res.data, product.color, finalPreview), ok: true };
            }
            return { key, action, product, ok: false, error: res.error };

          } else if (action === 'update') {
            const res = await updateProduct(conn, resolvedId, payload);
            if (res.ok) {
              await dbDeleteQueueItem(key);
              return { key, action, product, synced: normalizeProduct(res.data, product.color, finalPreview), ok: true };
            }
            return { key, action, product, ok: false, error: res.error };

          } else if (action === 'delete') {
            const res = await deleteProduct(conn, resolvedId);
            if (res.ok) {
              await dbDeleteQueueItem(key);
              return { key, action, product, ok: true };
            }
            return { key, action, product, ok: false, error: res.error };
          }
        } catch (e) {
          return { key, action, product, ok: false, error: e.message };
        }
      };

      for (let i = 0; i < entries.length; i += BATCH_SIZE) {
        const batch        = entries.slice(i, i + BATCH_SIZE);
        const batchNum     = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(entries.length / BATCH_SIZE);

        log('info', `Batch ${batchNum}/${totalBatches} (${batch.length} items)`, 'batch');

        const results = await Promise.all(batch.map(processEntry));

        for (const result of results) {
          const name = result.product?.name || `#${result.product?.id}`;

          if (!result.ok) {
            log('err', `${name}: ${result.error}`);
            failCount++;
            continue;
          }

          if (result.action === 'delete_local') {
            log('info', `${name} — removed (local only)`);
            successCount++;
          } else if (result.action === 'create') {
            // Replace temp local product with the real WooCommerce product
            latestProducts = latestProducts.map(p =>
              (p.sku && p.sku === result.product.sku) || p.id === result.product.id
                ? { ...result.synced, _pending: false } : p
            );
            log('ok', `Created ${name}`);
            successCount++;
          } else if (result.action === 'update') {
            latestProducts = latestProducts.map(p =>
              (p.sku && p.sku === result.synced.sku) || p.id === result.synced.id
                ? { ...result.synced, _pending: false } : p
            );
            log('ok', `Updated ${name}`);
            successCount++;
          } else if (result.action === 'delete') {
            latestProducts = latestProducts.filter(p =>
              !((p.sku && p.sku === result.product.sku) || p.id === result.product.id)
            );
            log('ok', `Deleted ${name}`);
            successCount++;
          }

          setPendingQueue(prev => { const n = { ...prev }; delete n[result.key]; return n; });
        }

        // Persist updated product list back to DB after every batch
        await dbSaveProducts(latestProducts);
      }

      // Re-read from DB as the single source of truth and update UI
      const finalDbRes = await dbLoadProducts();
      const finalProducts = finalDbRes.ok ? finalDbRes.data : latestProducts;
      setProductList([...finalProducts]);

      log(
        failCount === 0 ? 'ok' : 'info',
        `${successCount} succeeded${failCount > 0 ? `, ${failCount} failed` : ''}`
      );
    }

    // ── Orders ────────────────────────────────────────────────────────────────
    section('Orders');
    try {
      const res = await fetchOrders(conn, { perPage: 100, page: 1 });
      if (res.ok) {
        const orders = res.data || [];
        // Save orders to local DB
        await dbSaveOrders(orders);
        setOrderList(orders);
        log('ok', `${orders.length} orders downloaded`);
      } else {
        log('err', `Fetch failed: ${res.error}`);
      }
    } catch (e) {
      log('err', e.message);
    }

    section('Done');

    syncingRef.current = false;
    setSyncing(false);
  }, [log, section, settingsRef, setProductList, setPendingQueue, setOrderList]);

  useEffect(() => {
    if (autoSyncTimer.current) clearInterval(autoSyncTimer.current);
    if (syncSettings?.autoSync) {
      const ms = INTERVAL_MS[syncSettings.interval] || INTERVAL_MS['15 minutes'];
      autoSyncTimer.current = setInterval(() => runSync(), ms);
    }
    return () => { if (autoSyncTimer.current) clearInterval(autoSyncTimer.current); };
  }, [syncSettings, runSync]);

  return { syncing, syncLog, setSyncLog, runSync };
}