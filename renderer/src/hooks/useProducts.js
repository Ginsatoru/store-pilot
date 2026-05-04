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
    id:                p.id,
    sku,
    name:              p.name || 'Untitled',
    slug:              p.slug || '',
    type:              p.type || 'simple',
    permalink:         p.permalink || '',
    status:            p.status === 'publish' ? 'Live' : (p.status === 'Live' ? 'Live' : 'Draft'),
    _status:           p.status,
    price:             parseFloat(p.price || 0),
    regular_price:     parseFloat(p.regular_price || 0),
    sale_price:        parseFloat(p.sale_price || 0),
    on_sale:           p.on_sale || false,
    stock:             p.stock_quantity ?? p.stock ?? 0,
    stock_status:      p.stock_status || 'instock',
    manage_stock:      p.manage_stock || false,
    category:          p.categories?.[0]?.name || p.category || 'Uncategorized',
    categories:        p.categories || [],
    tags:              p.tags || [],
    images:            p.images || [],
    description:       p.description || '',
    short_description: p.short_description || '',
    weight:            p.weight || '',
    dimensions:        p.dimensions || { length: '', width: '', height: '' },
    date:              p.date_created || p.date || new Date().toISOString(),
    date_modified:     p.date_modified || '',
    color:             existingColor || p.color || COLORS[Math.abs(p.id || 0) % COLORS.length],
    localPreview,
    _pending:          p._pending || false,
    _raw:              p._raw || p,
  };
}

function tempId() {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// Apply pending queue state to product list so UI is always accurate
function applyQueueToProducts(products, queue) {
  const deleteSkus  = new Set();
  const deleteIds   = new Set();
  const pendingSkus = new Set();

  for (const item of Object.values(queue)) {
    if (item.action === 'delete') {
      if (item.product?.sku) deleteSkus.add(item.product.sku);
      if (item.product?.id)  deleteIds.add(String(item.product.id));
    } else {
      if (item.product?.sku) pendingSkus.add(item.product.sku);
    }
  }

  return products
    .filter(p => !deleteSkus.has(p.sku) && !deleteIds.has(String(p.id)))
    .map(p => ({ ...p, _pending: pendingSkus.has(p.sku) || p._pending || false }));
}

export function useProducts() {
  const [productList, setProductList]       = useState([]);
  const [productLoading, setProductLoading] = useState(true);
  const [productError, setProductError]     = useState(null);
  const [fetched, setFetched]               = useState(false);
  const [pendingQueue, setPendingQueue]     = useState({});

  // ── Boot: load from SQLite, apply queue ───────────────────────────────────
  const loadFromDb = useCallback(async () => {
    const [pRes, qRes] = await Promise.all([dbLoadProducts(), dbLoadQueue()]);
    const queue = (qRes.ok && qRes.data) ? qRes.data : {};
    setPendingQueue(queue);

    if (pRes.ok && pRes.data?.length > 0) {
      const products = applyQueueToProducts(pRes.data, queue);
      setProductList(products);
      setFetched(true);
      setProductLoading(false);
    }

    return queue;
  }, []);

  // ── Fetch from WooCommerce ─────────────────────────────────────────────────
  const doFetchProducts = useCallback(async (conn) => {
    setProductLoading(true);
    setProductError(null);
    try {
      let all = [], page = 1;
      while (true) {
        const res = await fetchProducts(conn, { perPage: 100, page });
        if (!res.ok) { setProductError(res.error || 'Failed to fetch products'); break; }
        const batch = res.data || [];
        all = all.concat(batch);
        if (batch.length < 100) break;
        page++;
      }

      if (all.length > 0) {
        const dbRes = await dbLoadProducts();
        const existingMap = new Map((dbRes.ok ? dbRes.data : []).map(p => [p.sku, p]));

        const seen = new Map();
        for (const p of all) {
          const existing = existingMap.get(p.sku && p.sku.trim() !== '' ? p.sku.trim() : String(p.id));
          const normalized = normalizeProduct(p, existing?.color, existing?.localPreview);
          if (!seen.has(normalized.sku)) seen.set(normalized.sku, normalized);
        }
        const products = Array.from(seen.values());
        await dbSaveProducts(products);

        const qRes = await dbLoadQueue();
        const queue = (qRes.ok && qRes.data) ? qRes.data : {};
        setProductList(applyQueueToProducts(products, queue));
        setFetched(true);
      }
    } catch (e) { setProductError(e.message || 'Unknown error'); }
    setProductLoading(false);
  }, []);

  // ── Queue operations ───────────────────────────────────────────────────────
  const handleQueueChange = useCallback(async ({ action, product, imageFile, imagePreview }) => {
    const key = `${action}_${product.sku || product.id}`;

    if (action === 'create') {
      const local = {
        ...product,
        id:           product.id || tempId(),
        localPreview: imagePreview || product.localPreview || null,
        _pending:     true,
      };
      const dbRes = await dbLoadProducts();
      const existing = dbRes.ok ? dbRes.data : [];
      await dbSaveProducts([local, ...existing.filter(p => p.sku !== local.sku && p.id !== local.id)]);

      const item = { action, product: local, imageFile: null, imagePreview: imagePreview || null };
      await dbUpsertQueueItem(key, item);

      setProductList(prev => [local, ...prev.filter(p => p.sku !== local.sku && p.id !== local.id)]);
      setPendingQueue(prev => ({ ...prev, [key]: item }));

    } else if (action === 'update') {
      const updated = {
        ...product,
        localPreview: imagePreview || product.localPreview || null,
        _pending:     true,
      };
      const dbRes = await dbLoadProducts();
      const existing = dbRes.ok ? dbRes.data : [];
      await dbSaveProducts(existing.map(p =>
        (p.sku && p.sku === product.sku) || p.id === product.id ? updated : p
      ));

      const item = { action, product: updated, imageFile: null, imagePreview: imagePreview || null };
      await dbUpsertQueueItem(key, item);

      setProductList(prev => prev.map(p =>
        (p.sku && p.sku === product.sku) || p.id === product.id ? updated : p
      ));
      setPendingQueue(prev => ({ ...prev, [key]: item }));

    } else if (action === 'delete') {
      const dbRes = await dbLoadProducts();
      const existing = dbRes.ok ? dbRes.data : [];
      await dbSaveProducts(existing.filter(p =>
        !((p.sku && p.sku === product.sku) || p.id === product.id)
      ));

      const item = { action, product, imageFile: null, imagePreview: null };
      await dbUpsertQueueItem(key, item);

      setProductList(prev => prev.filter(p =>
        !((p.sku && p.sku === product.sku) || p.id === product.id)
      ));
      setPendingQueue(prev => ({ ...prev, [key]: item }));
    }
  }, []);

  const handleRemoveFromQueue = useCallback(async (key) => {
    await dbDeleteQueueItem(key);
    setPendingQueue(prev => { const n = { ...prev }; delete n[key]; return n; });
  }, []);

  const handleClearQueue = useCallback(async () => {
    await dbClearQueue();
    setPendingQueue({});
  }, []);

  return {
    productList, setProductList,
    productLoading, setProductLoading,
    productError, setProductError,
    fetched, setFetched,
    pendingQueue, setPendingQueue,
    loadFromDb,
    doFetchProducts,
    handleQueueChange,
    handleRemoveFromQueue,
    handleClearQueue,
  };
}