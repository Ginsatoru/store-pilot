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

function applyQueueToProducts(products, queue) {
  const deleteSkus = new Set();
  const deleteIds = new Set();
  const pendingSkus = new Set();

  for (const item of Object.values(queue)) {
    if (item.action === 'delete') {
      if (item.product?.sku) deleteSkus.add(item.product.sku);
      if (item.product?.id) deleteIds.add(String(item.product.id));
    } else {
      if (item.product?.sku) pendingSkus.add(item.product.sku);
    }
  }

  return products
    .filter(p => !deleteSkus.has(p.sku) && !deleteIds.has(String(p.id)))
    .map(p => ({ ...p, _pending: pendingSkus.has(p.sku) || false }));
}

export function useProducts() {
  const [productList, setProductList] = useState([]);
  const [productLoading, setProductLoading] = useState(true);
  const [productError, setProductError] = useState(null);
  const [fetched, setFetched] = useState(false);
  const [pendingQueue, setPendingQueue] = useState({});
  const [fetchProgress, setFetchProgress] = useState(null);

  // ─────────────────────────────
  // LOAD FROM SQLITE (BOOTSTRAP)
  // ─────────────────────────────
  const loadFromDb = useCallback(async (conn) => {
    setProductLoading(true);
    setProductError(null);

    const [pRes, qRes] = await Promise.all([
      dbLoadProducts(),
      dbLoadQueue()
    ]);

    const queue = qRes.ok ? qRes.data : {};
    setPendingQueue(queue);

    const products = pRes.ok ? pRes.data : [];

    if (products.length > 0) {
      const merged = applyQueueToProducts(products, queue);
      setProductList(merged);
      setFetched(true);
    } else {
      // DB empty → auto bootstrap from Woo
      if (conn) {
        await doFetchProducts(conn);
      } else {
        setProductList([]);
        setFetched(false);
      }
    }

    setProductLoading(false);
  }, []);

  // ─────────────────────────────
  // FETCH FROM WOOCOMMERCE → SAVE → RELOAD SQLITE
  // ─────────────────────────────
  const doFetchProducts = useCallback(async (conn) => {
    setProductLoading(true);
    setProductError(null);
    setFetchProgress({ loaded: 0, total: 0, percent: 0 });

    const unsub = window.electronAPI?.onFetchProgress?.(setFetchProgress);

    try {
      const res = await fetchProducts(conn);

      if (!res.ok) {
        setProductError(res.error || 'Fetch failed');
        setProductLoading(false);
        return;
      }

      const all = res.data || [];

      if (all.length === 0) {
        setProductLoading(false);
        return;
      }

      const dbRes = await dbLoadProducts();
      const existingMap = new Map((dbRes.ok ? dbRes.data : []).map(p => [p.sku, p]));

      const seen = new Map();

      for (const p of all) {
        const skuKey = p.sku?.trim() || String(p.id);
        const existing = existingMap.get(skuKey);

        const normalized = normalizeProduct(
          p,
          existing?.color,
          existing?.localPreview
        );

        if (!seen.has(normalized.sku)) {
          seen.set(normalized.sku, normalized);
        }
      }

      const products = Array.from(seen.values());

      // SAVE FIRST
      await dbSaveProducts(products);

      // THEN TRUST SQLITE ONLY
      const reload = await dbLoadProducts();
      const finalProducts = reload.ok ? reload.data : [];

      const qRes = await dbLoadQueue();
      const queue = qRes.ok ? qRes.data : {};
      setPendingQueue(queue);

      const merged = applyQueueToProducts(finalProducts, queue);

      setProductList(merged);
      setFetched(true);

    } catch (e) {
      setProductError(e.message || 'Unknown error');
    }

    unsub?.();
    setFetchProgress(null);
    setProductLoading(false);
  }, []);

  // ─────────────────────────────
  // QUEUE OPS
  // ─────────────────────────────
  const handleQueueChange = useCallback(async ({ action, product, imagePreview }) => {
    const key = `${action}_${product.sku || product.id}`;

    const dbRes = await dbLoadProducts();
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

    } else if (action === 'delete') {
      await dbSaveProducts(
        existing.filter(p =>
          !(p.sku === product.sku || p.id === product.id)
        )
      );

      await dbUpsertQueueItem(key, {
        action,
        product,
      });

      setProductList(prev =>
        prev.filter(p =>
          !(p.sku === product.sku || p.id === product.id)
        )
      );
    }

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
    productLoading,
    productError,
    fetched,
    pendingQueue,
    fetchProgress,
    loadFromDb,
    doFetchProducts,
    handleQueueChange,
    handleRemoveFromQueue,
    handleClearQueue,
  };
}