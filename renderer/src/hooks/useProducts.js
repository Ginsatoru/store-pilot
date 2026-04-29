import { useState, useCallback, useRef } from 'react';
import { fetchProducts, dbLoadProducts, dbSaveProducts, dbUpsertQueueItem, dbDeleteQueueItem, dbClearQueue, dbLoadQueue } from '../services/woo';

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

export function tempId() {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function useProducts() {
  const [productList, setProductList]       = useState([]);
  const [productLoading, setProductLoading] = useState(true);
  const [productError, setProductError]     = useState(null);
  const [fetched, setFetched]               = useState(false);
  const [pendingQueue, setPendingQueue]     = useState({});

  const pendingQueueRef = useRef({});

  // Keep ref in sync
  const updateQueue = useCallback((updater) => {
    setPendingQueue(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      pendingQueueRef.current = next;
      return next;
    });
  }, []);

  // ── Load cached products + queue from SQLite ────────────────────────────────
  const loadFromDb = useCallback(async () => {
    try {
      const [pRes, qRes] = await Promise.all([dbLoadProducts(), dbLoadQueue()]);
      if (pRes.ok && pRes.data.length > 0) {
        setProductList(pRes.data);
        setFetched(true);
        setProductLoading(false);
      }
      if (qRes.ok) updateQueue(qRes.data);
    } catch (e) {
      console.error('DB load error:', e);
    }
  }, [updateQueue]);

  // ── Fetch from WooCommerce and cache ─────────────────────────────────────────
  const doFetchProducts = useCallback(async (conn) => {
    setProductLoading(true);
    setProductError(null);
    try {
      const res = await fetchProducts(conn, { perPage: 100, page: 1 });
      if (res.ok) {
        const normalized = (res.data || []).map(p => normalizeProduct(p));
        setProductList(normalized);
        setFetched(true);
        dbSaveProducts(normalized).catch(() => {});
      } else {
        setProductError(res.error || 'Failed to fetch products');
      }
    } catch (e) {
      // Offline — use cached data silently if we already have it
      if (!fetched) setProductError(e.message || 'Unknown error');
    }
    setProductLoading(false);
  }, [fetched]);

  // ── Queue management ──────────────────────────────────────────────────────────
  const handleQueueChange = useCallback(({ action, product, imageFile, imagePreview }) => {
    const key = `${action}_${product.id}`;

    if (action === 'create') {
      const local = { ...product, id: product.id || tempId(), _pending: true };
      setProductList(prev => [local, ...prev]);
      const item = { action, product: local, imageFile, imagePreview };
      updateQueue(prev => ({ ...prev, [key]: item }));
      dbUpsertQueueItem(key, item).catch(() => {});

    } else if (action === 'update') {
      setProductList(prev => prev.map(p => p.id === product.id ? { ...product, _pending: true } : p));
      const item = { action, product, imageFile, imagePreview };
      updateQueue(prev => ({ ...prev, [key]: item }));
      dbUpsertQueueItem(key, item).catch(() => {});

    } else if (action === 'delete') {
      setProductList(prev => prev.filter(p => p.id !== product.id));
      const item = { action, product };
      updateQueue(prev => ({ ...prev, [key]: item }));
      dbUpsertQueueItem(key, item).catch(() => {});
    }
  }, [updateQueue]);

  const handleRemoveFromQueue = useCallback((key) => {
    updateQueue(prev => { const n = { ...prev }; delete n[key]; return n; });
    dbDeleteQueueItem(key).catch(() => {});
  }, [updateQueue]);

  const handleClearQueue = useCallback(() => {
    updateQueue({});
    dbClearQueue().catch(() => {});
  }, [updateQueue]);

  return {
    productList, setProductList,
    productLoading, setProductLoading,
    productError, setProductError,
    fetched, setFetched,
    pendingQueue, pendingQueueRef,
    loadFromDb,
    doFetchProducts,
    handleQueueChange,
    handleRemoveFromQueue,
    handleClearQueue,
  };
}