import { useState, useCallback, useRef } from 'react';
import { fetchProducts, dbLoadProducts, dbSaveProducts, dbUpsertQueueItem, dbDeleteQueueItem, dbClearQueue, dbLoadQueue } from '../services/woo';

export function normalizeProduct(p, existingColor, existingLocalPreview) {
  const colors = ['#6366f1','#f59e0b','#10b981','#3b82f6','#ec4899','#8b5cf6','#f97316','#14b8a6'];
  const sku = p.sku && p.sku.trim() !== '' ? p.sku.trim() : String(p.id);

  // Priority: caller-supplied > already on object > WooCommerce image
  // Never let a WooCommerce pull overwrite a locally-set preview
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
    color:             existingColor || p.color || colors[p.id % colors.length],
    localPreview,
    _pending:          p._pending || false,
    _raw:              p._raw || p,
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
  // Always-current snapshot — safe to read inside async callbacks without stale closure
  const productListRef  = useRef([]);

  const updateQueue = useCallback((updater) => {
    setPendingQueue(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      pendingQueueRef.current = next;
      return next;
    });
  }, []);

  const setProductListSynced = useCallback((updater) => {
    setProductList(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      productListRef.current = next;
      return next;
    });
  }, []);

  // ── Load cached products + queue from SQLite ──────────────────────────────
  const loadFromDb = useCallback(async () => {
    try {
      const [pRes, qRes] = await Promise.all([dbLoadProducts(), dbLoadQueue()]);
      if (pRes.ok && pRes.data.length > 0) {
        // Migration: hydrate localPreview from images[0].src when missing
        let needsResave = false;
        const hydrated = pRes.data.map(p => {
          if (!p.localPreview && p.images?.[0]?.src) {
            needsResave = true;
            return { ...p, localPreview: p.images[0].src };
          }
          return p;
        });
        if (needsResave) dbSaveProducts(hydrated).catch(() => {});
        productListRef.current = hydrated;
        setProductList(hydrated);
        setFetched(true);
        setProductLoading(false);
      }
      if (qRes.ok) updateQueue(qRes.data);
    } catch (e) {
      console.error('DB load error:', e);
    }
  }, [updateQueue]);

  // ── Fetch all pages from WooCommerce ──────────────────────────────────────
  const doFetchProducts = useCallback(async (conn) => {
    setProductLoading(true);
    setProductError(null);
    try {
      let allProducts = [];
      let page = 1;
      const perPage = 100;

      while (true) {
        const res = await fetchProducts(conn, { perPage, page });
        if (!res.ok) {
          setProductError(res.error || 'Failed to fetch products');
          break;
        }
        const batch = res.data || [];
        allProducts = allProducts.concat(batch);
        if (batch.length < perPage) break;
        page++;
      }

      if (allProducts.length > 0) {
        // Use ref — not stale closure — to get the current list
        const existingMap = new Map(productListRef.current.map(p => [p.sku, p]));

        const seen = new Map();
        for (const p of allProducts) {
          const rawSku   = p.sku && p.sku.trim() !== '' ? p.sku.trim() : String(p.id);
          const existing = existingMap.get(rawSku);

          const normalized = normalizeProduct(
            p,
            existing?.color,
            // Preserve our localPreview; only fall back to Woo for brand-new products
            existing !== undefined ? existing.localPreview : undefined,
          );

          if (!seen.has(normalized.sku)) seen.set(normalized.sku, normalized);
        }

        const deduped = Array.from(seen.values());
        productListRef.current = deduped;
        setProductList(deduped);
        setFetched(true);
        dbSaveProducts(deduped).catch(() => {});
      }
    } catch (e) {
      if (!fetched) setProductError(e.message || 'Unknown error');
    }
    setProductLoading(false);
  }, [fetched]);

  // ── Queue management ──────────────────────────────────────────────────────
  const handleQueueChange = useCallback(({ action, product, imageFile, imagePreview }) => {
    const key = `${action}_${product.sku || product.id}`;

    if (action === 'create') {
      const local = {
        ...product,
        id:           product.id || tempId(),
        localPreview: imagePreview || product.localPreview || null,
        _pending:     true,
      };
      setProductListSynced(prev => {
        const next = [local, ...prev];
        dbSaveProducts(next).catch(() => {});
        return next;
      });
      const item = { action, product: local, imageFile, imagePreview };
      updateQueue(prev => ({ ...prev, [key]: item }));
      dbUpsertQueueItem(key, item).catch(() => {});

    } else if (action === 'update') {
      const updated = {
        ...product,
        localPreview: imagePreview || product.localPreview || null,
        _pending:     true,
      };
      setProductListSynced(prev => {
        const next = prev.map(p =>
          (p.sku && p.sku === product.sku) || p.id === product.id ? updated : p
        );
        dbSaveProducts(next).catch(() => {});
        return next;
      });
      const item = { action, product: updated, imageFile, imagePreview };
      updateQueue(prev => ({ ...prev, [key]: item }));
      dbUpsertQueueItem(key, item).catch(() => {});

    } else if (action === 'delete') {
      setProductListSynced(prev => {
        const next = prev.filter(p =>
          !((p.sku && p.sku === product.sku) || p.id === product.id)
        );
        dbSaveProducts(next).catch(() => {});
        return next;
      });
      const item = { action, product };
      updateQueue(prev => ({ ...prev, [key]: item }));
      dbUpsertQueueItem(key, item).catch(() => {});
    }
  }, [updateQueue, setProductListSynced]);

  const handleRemoveFromQueue = useCallback((key) => {
    updateQueue(prev => { const n = { ...prev }; delete n[key]; return n; });
    dbDeleteQueueItem(key).catch(() => {});
  }, [updateQueue]);

  const handleClearQueue = useCallback(() => {
    updateQueue({});
    dbClearQueue().catch(() => {});
  }, [updateQueue]);

  return {
    productList, setProductList: setProductListSynced,
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