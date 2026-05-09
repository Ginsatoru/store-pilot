import { useState, useCallback } from 'react';
import {
  fetchProducts,
  dbLoadProducts, dbSaveProducts,
  dbLoadQueue, dbUpsertQueueItem, dbDeleteQueueItem, dbClearQueue,
} from '../services/woo';

const COLORS = ['#6366f1','#f59e0b','#10b981','#3b82f6','#ec4899','#8b5cf6','#f97316','#14b8a6'];

export function normalizeProduct(p, existingColor, existingLocalPreview) {
  const sku = p.sku && p.sku.trim() !== '' ? p.sku.trim() : String(p.id);

  const localPreview =
    existingLocalPreview !== undefined
      ? existingLocalPreview
      : p.localPreview !== undefined
        ? p.localPreview
        : p.images?.[0]?.src || null;

  return {
    id: p.id,
    sku,
    name: p.name || 'Untitled',
    slug: p.slug || '',
    type: p.type || 'simple',
    permalink: p.permalink || '',
    status: p.status === 'publish' ? 'Live' : 'Draft',
    _status: p.status,
    price: parseFloat(p.price || 0),
    regular_price: parseFloat(p.regular_price || 0),
    sale_price: parseFloat(p.sale_price || 0),
    on_sale: p.on_sale || false,
    stock: p.stock_quantity ?? p.stock ?? 0,
    stock_status: p.stock_status || 'instock',
    manage_stock: p.manage_stock || false,
    category: p.categories?.[0]?.name || 'Uncategorized',
    categories: p.categories || [],
    tags: p.tags || [],
    images: p.images || [],
    description: p.description || '',
    short_description: p.short_description || '',
    weight: p.weight || '',
    dimensions: p.dimensions || { length: '', width: '', height: '' },
    date: p.date_created || new Date().toISOString(),
    date_modified: p.date_modified || '',
    color: existingColor || COLORS[Math.abs(p.id || 0) % COLORS.length],
    localPreview,
    _pending: p._pending || false,
    _raw: p,
  };
}

// Rebuild the full product list from DB + queue.
// Queue create/update entries that have no matching DB row are re-inserted
// so imported products that were wiped from the DB still appear in the UI.
function mergeProductsWithQueue(products, queue) {
  const deleteSkus  = new Set();
  const deleteIds   = new Set();
  const pendingSkus = new Set();

  // Collect queue-sourced products (create/update) keyed by SKU
  const queueProducts = new Map();

  for (const item of Object.values(queue)) {
    if (item.action === 'delete') {
      if (item.product?.sku) deleteSkus.add(item.product.sku);
      if (item.product?.id)  deleteIds.add(String(item.product.id));
    } else {
      if (item.product?.sku) {
        pendingSkus.add(item.product.sku);
        // Store the queue product in case it's missing from DB
        if (!queueProducts.has(item.product.sku)) {
          queueProducts.set(item.product.sku, {
            ...item.product,
            _pending: true,
            localPreview: item.imagePreview || item.product?.localPreview || null,
          });
        }
      }
    }
  }

  // Build map from DB products
  const productMap = new Map(
    products
      .filter(p => !deleteSkus.has(p.sku) && !deleteIds.has(String(p.id)))
      .map(p => [p.sku, { ...p, _pending: pendingSkus.has(p.sku) || p._pending || false }])
  );

  // Re-insert any queue products that are missing from DB (e.g. wiped by a WooCommerce refresh)
  for (const [sku, qp] of queueProducts) {
    if (!productMap.has(sku)) {
      productMap.set(sku, qp);
    }
  }

  return Array.from(productMap.values());
}

export function useProducts() {
  const [productList,    setProductList]    = useState([]);
  const [productLoading, setProductLoading] = useState(true);
  const [productError,   setProductError]   = useState(null);
  const [fetched,        setFetched]        = useState(false);
  const [pendingQueue,   setPendingQueue]   = useState({});
  const [fetchProgress,  setFetchProgress]  = useState(null);

  // ── LOAD FROM SQLITE (BOOTSTRAP) ──────────────────────────────────────────
  const loadFromDb = useCallback(async () => {
    setProductLoading(true);
    setProductError(null);

    const [pRes, qRes] = await Promise.all([
      dbLoadProducts(),
      dbLoadQueue(),
    ]);

    const queue    = qRes.ok ? qRes.data : {};
    const products = pRes.ok ? pRes.data : [];

    setPendingQueue(queue);

    // mergeProductsWithQueue re-inserts any queue items missing from DB
    const merged = mergeProductsWithQueue(products, queue);

    if (merged.length > 0) {
      setProductList(merged);
      setFetched(true);
    } else {
      setProductList([]);
      setFetched(false);
    }

    setProductLoading(false);
  }, []);

  // ── FETCH FROM WOOCOMMERCE ────────────────────────────────────────────────
  const doFetchProducts = useCallback(async (conn) => {
    setProductLoading(true);
    setProductError(null);

    setFetchProgress({ loaded: 0, total: 0, percent: 0 });

    const unsub = window.electronAPI?.onFetchProgress?.((progress) => {
      const loaded  = progress.loaded  ?? 0;
      const total   = progress.total   ?? 0;
      const percent = progress.percent != null
        ? progress.percent
        : total > 0 ? Math.min(Math.round((loaded / total) * 100), 99) : 0;
      setFetchProgress({ loaded, total, percent });
    });

    try {
      const res = await fetchProducts(conn);

      if (!res.ok) {
        setProductError(res.error || 'Fetch failed');
        unsub?.();
        setFetchProgress(null);
        setProductLoading(false);
        return;
      }

      const all = res.data || [];

      if (all.length === 0) {
        unsub?.();
        setFetchProgress(null);
        setProductLoading(false);
        return;
      }

      setFetchProgress({ loaded: all.length, total: all.length, percent: 100 });

      const qRes  = await dbLoadQueue();
      const queue = qRes.ok ? qRes.data : {};

      const deleteSkus = new Set();
      const deleteIds  = new Set();
      for (const item of Object.values(queue)) {
        if (item.action === 'delete') {
          if (item.product?.sku) deleteSkus.add(String(item.product.sku));
          if (item.product?.id)  deleteIds.add(String(item.product.id));
        }
      }

      const dbRes      = await dbLoadProducts();
      const existingDB = dbRes.ok ? dbRes.data : [];
      const existingMap = new Map(existingDB.map(p => [p.sku, p]));
      const seen = new Map();

      for (const p of all) {
        const skuKey = p.sku?.trim() || String(p.id);
        const idStr  = String(p.id);

        if (deleteSkus.has(skuKey) || deleteIds.has(idStr)) continue;

        const existing   = existingMap.get(skuKey);
        const normalized = normalizeProduct(p, existing?.color, existing?.localPreview);
        if (!seen.has(normalized.sku)) seen.set(normalized.sku, normalized);
      }

      const wooProducts = Array.from(seen.values());
      await dbSaveProducts(wooProducts);

      const reload        = await dbLoadProducts();
      const finalProducts = reload.ok ? reload.data : wooProducts;

      setPendingQueue(queue);

      // Use mergeProductsWithQueue so pending/imported items from the queue
      // are always visible even if they aren't in the DB yet
      const merged = mergeProductsWithQueue(finalProducts, queue);
      setProductList(merged);
      setFetched(true);

    } catch (e) {
      setProductError(e.message || 'Unknown error');
    }

    unsub?.();
    setFetchProgress(null);
    setProductLoading(false);
  }, []);

  // ── QUEUE OPS ─────────────────────────────────────────────────────────────
  const handleQueueChange = useCallback(async ({ action, product, imagePreview }) => {
    const key = `${action}_${product.sku || product.id}`;

    const dbRes    = await dbLoadProducts();
    const existing = dbRes.ok ? dbRes.data : [];

    if (action === 'create') {
      const local = {
        ...product,
        localPreview: imagePreview || null,
        _pending: true,
      };

      await dbSaveProducts([local, ...existing]);
      await dbUpsertQueueItem(key, {
        action,
        product: local,
        imagePreview: imagePreview || null,
      });

      setProductList(prev => [local, ...prev]);
      setPendingQueue(prev => ({
        ...prev,
        [key]: { action, product: local, imagePreview: imagePreview || null },
      }));

    } else if (action === 'update') {
      const updated = {
        ...product,
        localPreview: imagePreview || null,
        _pending: true,
      };

      await dbSaveProducts(
        existing.map(p =>
          (p.sku === product.sku || p.id === product.id) ? updated : p
        )
      );
      await dbUpsertQueueItem(key, {
        action,
        product: updated,
        imagePreview: imagePreview || null,
      });

      setProductList(prev =>
        prev.map(p =>
          (p.sku === product.sku || p.id === product.id) ? updated : p
        )
      );
      setPendingQueue(prev => ({
        ...prev,
        [key]: { action, product: updated, imagePreview: imagePreview || null },
      }));

    } else if (action === 'delete') {
      await dbSaveProducts(
        existing.filter(p =>
          !(p.sku === product.sku || p.id === product.id)
        )
      );
      await dbUpsertQueueItem(key, { action, product });

      setProductList(prev =>
        prev.filter(p =>
          !(p.sku === product.sku || p.id === product.id)
        )
      );
      setPendingQueue(prev => ({
        ...prev,
        [key]: { action, product },
      }));
    }
  }, []);

  // ── BATCH IMPORT ALL — single DB write + single state update ─────────────
  const handleBatchImport = useCallback(async (importItems) => {
    const [dbRes, qRes] = await Promise.all([
      dbLoadProducts(),
      dbLoadQueue(),
    ]);

    const existing = dbRes.ok ? dbRes.data : [];
    const queue    = qRes.ok ? qRes.data : {};

    const productMap      = new Map(existing.map(p => [p.sku, p]));
    const newQueueEntries = { ...queue };

    const CHUNK = 500;
    for (let i = 0; i < importItems.length; i += CHUNK) {
      const slice = importItems.slice(i, i + CHUNK);
      for (const { action, product, imagePreview } of slice) {
        const key   = `${action}_${product.sku || product.id}`;
        const local = { ...product, localPreview: imagePreview || null, _pending: true };
        productMap.set(local.sku, local);
        newQueueEntries[key] = { action, product: local, imagePreview: imagePreview || null };
      }
      await new Promise(r => setTimeout(r, 0));
    }

    const updatedProducts = Array.from(productMap.values());

    await dbSaveProducts(updatedProducts);

    await Promise.all(
      Object.entries(newQueueEntries).map(([key, item]) =>
        dbUpsertQueueItem(key, item)
      )
    );

    const merged = mergeProductsWithQueue(updatedProducts, newQueueEntries);
    setProductList(merged);
    setPendingQueue(newQueueEntries);
  }, []);

  const handleRemoveFromQueue = useCallback(async (key) => {
    await dbDeleteQueueItem(key);
    setPendingQueue(prev => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  }, []);

  const handleClearQueue = useCallback(async () => {
    await dbClearQueue();
    setPendingQueue({});
  }, []);

  return {
    productList,
    setProductList,
    productLoading,
    setProductLoading,
    productError,
    setProductError,
    fetched,
    setFetched,
    pendingQueue,
    setPendingQueue,
    fetchProgress,
    loadFromDb,
    doFetchProducts,
    handleQueueChange,
    handleBatchImport,
    handleRemoveFromQueue,
    handleClearQueue,
  };
}