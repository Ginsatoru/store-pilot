import { useState, useCallback, useRef, useEffect } from 'react';
import {
  loadSettings,
  fetchOrders, createProduct, updateProduct, deleteProduct, ftpUploadImage,
  dbSaveOrders,
} from '../services/woo';
import { normalizeProduct } from './useProducts';

const INTERVAL_MS = {
  '5 minutes':  5  * 60 * 1000,
  '15 minutes': 15 * 60 * 1000,
  '30 minutes': 30 * 60 * 1000,
  '1 hour':     60 * 60 * 1000,
  '2 hours':    2  * 60 * 60 * 1000,
  '6 hours':    6  * 60 * 60 * 1000,
};

export function useSync({ settingsRef, pendingQueueRef, setProductList, setPendingQueue, setOrderList, handleClearQueue }) {
  const [syncing, setSyncing]       = useState(false);
  const [syncLog, setSyncLog]       = useState([]);
  const [syncSettings, setSyncSettings] = useState({ autoSync: false, interval: '15 minutes' });

  const syncingRef    = useRef(false);
  const autoSyncTimer = useRef(null);

  const log = useCallback((type, msg) =>
    setSyncLog(prev => [...prev, { type, msg, time: new Date().toLocaleTimeString() }])
  , []);

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

    // ── Phase 1: Push pending product changes ──────────────────────────────────
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

    // ── Phase 2: Pull orders ───────────────────────────────────────────────────
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
  }, [log, settingsRef, pendingQueueRef, setProductList, setPendingQueue, setOrderList]);

  // ── Auto sync timer ────────────────────────────────────────────────────────
  useEffect(() => {
    if (autoSyncTimer.current) clearInterval(autoSyncTimer.current);
    if (syncSettings.autoSync) {
      const ms = INTERVAL_MS[syncSettings.interval] || INTERVAL_MS['15 minutes'];
      autoSyncTimer.current = setInterval(() => runSync(), ms);
    }
    return () => { if (autoSyncTimer.current) clearInterval(autoSyncTimer.current); };
  }, [syncSettings, runSync]);

  return {
    syncing, syncLog, setSyncLog,
    syncSettings, setSyncSettings,
    runSync,
  };
}