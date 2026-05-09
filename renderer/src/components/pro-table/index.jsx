import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { RiRefreshLine } from 'react-icons/ri';
import TableToolbar from './TableToolbar';
import TableHeader  from './TableHeader';
import TableBody    from './TableBody';
import { exportToCSV, useAnimatedPercent, COL_HEADERS } from './tableUtils';

const EDITABLE_KEYS = ['name', 'category', 'regular_price', 'sale_price', 'stock', 'stock_status', 'status'];
const MAX_HISTORY   = 50;

const DEFAULT_FILTERS = {
  status:       '',
  stock_status: '',
  onSale:       false,
  priceMin:     '',
  priceMax:     '',
  category:     '',
};

export default function ProductsTable({
  products, allProducts, search, onSearch,
  onRefresh, onAddNew, onRowClick, onImport,
  onBulkDelete, onQueueChange,
  loading, fetchProgress,
}) {
  const [selected,  setSelected]  = useState(new Set());
  const [sortField, setSortField] = useState(null);
  const [sortDir,   setSortDir]   = useState('asc');
  const [dirtyMap,  setDirtyMap]  = useState({});
  const [filters,   setFilters]   = useState(DEFAULT_FILTERS);

  // Undo/redo
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const skipHistoryRef = useRef(false);

  const pushHistory = useCallback((prevDirtyMap) => {
    if (skipHistoryRef.current) return;
    setUndoStack(prev => {
      const next = [...prev, prevDirtyMap];
      return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
    });
    setRedoStack([]);
  }, []);

  const undo = useCallback(() => {
    setUndoStack(prev => {
      if (prev.length === 0) return prev;
      const snapshot = prev[prev.length - 1];
      const next = prev.slice(0, -1);
      skipHistoryRef.current = true;
      setRedoStack(r => [...r, dirtyMap]);
      setDirtyMap(snapshot);
      skipHistoryRef.current = false;
      return next;
    });
  }, [dirtyMap]);

  const redo = useCallback(() => {
    setRedoStack(prev => {
      if (prev.length === 0) return prev;
      const snapshot = prev[prev.length - 1];
      const next = prev.slice(0, -1);
      skipHistoryRef.current = true;
      setUndoStack(u => [...u, dirtyMap]);
      setDirtyMap(snapshot);
      skipHistoryRef.current = false;
      return next;
    });
  }, [dirtyMap]);

  const toggleAll = () =>
    setSelected(
      selected.size === products.length && products.length > 0
        ? new Set()
        : new Set(products.map(p => p.sku || p.id))
    );

  const toggleOne = key => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleSort = field => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  // ── Sort ──────────────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    if (!sortField) return products;
    return [...products].sort((a, b) => {
      let va = a[sortField], vb = b[sortField];
      if (typeof va === 'string') { va = va.toLowerCase(); vb = (vb || '').toLowerCase(); }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [products, sortField, sortDir]);

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return sorted.filter(p => {
      if (filters.status       && p.status       !== filters.status)       return false;
      if (filters.stock_status && p.stock_status  !== filters.stock_status) return false;
      if (filters.onSale       && !p.on_sale)                               return false;
      if (filters.category     && !(p.category || '').toLowerCase().includes(filters.category.toLowerCase())) return false;
      if (filters.priceMin !== '' && (p.regular_price ?? 0) < parseFloat(filters.priceMin)) return false;
      if (filters.priceMax !== '' && (p.regular_price ?? 0) > parseFloat(filters.priceMax)) return false;
      return true;
    });
  }, [sorted, filters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status)       count++;
    if (filters.stock_status) count++;
    if (filters.onSale)       count++;
    if (filters.category)     count++;
    if (filters.priceMin !== '' || filters.priceMax !== '') count++;
    return count;
  }, [filters]);

  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleFilterReset = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  // ── Cell commit ───────────────────────────────────────────────────────────
  const handleCellCommit = useCallback((rowKey, field, value) => {
    setDirtyMap(prev => {
      pushHistory(prev);
      return {
        ...prev,
        [rowKey]: { ...(prev[rowKey] || {}), [field]: value },
      };
    });
  }, [pushHistory]);

  // ── Keyboard navigation ───────────────────────────────────────────────────
  const handleNavigate = useCallback((rowKey, field, dir) => {
    const rowIdx = filtered.findIndex(p => (p.sku || p.id) === rowKey);
    const colIdx = EDITABLE_KEYS.indexOf(field);

    let nextRowIdx = rowIdx;
    let nextColIdx = colIdx;

    if (dir === 'down')  nextRowIdx = Math.min(filtered.length - 1, rowIdx + 1);
    if (dir === 'up')    nextRowIdx = Math.max(0, rowIdx - 1);
    if (dir === 'right') {
      if (colIdx < EDITABLE_KEYS.length - 1) nextColIdx = colIdx + 1;
      else { nextColIdx = 0; nextRowIdx = Math.min(filtered.length - 1, rowIdx + 1); }
    }
    if (dir === 'left') {
      if (colIdx > 0) nextColIdx = colIdx - 1;
      else { nextColIdx = EDITABLE_KEYS.length - 1; nextRowIdx = Math.max(0, rowIdx - 1); }
    }

    const nextKey   = filtered[nextRowIdx]?.sku || filtered[nextRowIdx]?.id;
    const nextField = EDITABLE_KEYS[nextColIdx];
    if (!nextKey) return;

    const el = document.querySelector(`[data-rowkey="${nextKey}"][data-field="${nextField}"]`);
    if (el) {
      el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [filtered]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSaveChanges = useCallback(() => {
    const entries = Object.entries(dirtyMap);
    if (entries.length === 0) return;

    for (const [rowKey, changes] of entries) {
      const product = products.find(p => (p.sku || p.id) === rowKey || p.sku === rowKey);
      if (!product) continue;

      const updated = {
        ...product,
        ...changes,
        manage_stock: 'stock' in changes ? true : product.manage_stock,
        on_sale: (changes.sale_price ?? product.sale_price) > 0,
        price:   changes.regular_price ?? product.regular_price,
      };

      onQueueChange({ action: 'update', product: updated, imagePreview: null });
    }

    setDirtyMap({});
    setUndoStack([]);
    setRedoStack([]);
  }, [dirtyMap, products, onQueueChange]);

  // ── Global shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const mod   = isMac ? e.metaKey : e.ctrlKey;
      if (!mod) return;

      if (e.key === 's' || e.key === 'S') { e.preventDefault(); handleSaveChanges(); return; }
      if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
        return;
      }
      if (e.key === 'y' || e.key === 'Y') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSaveChanges, undo, redo]);

  const dirtyCount = Object.keys(dirtyMap).length;

  const handleExport = () => {
    const toExport = selected.size > 0
      ? filtered.filter(p => selected.has(p.sku || p.id))
      : filtered;
    exportToCSV(toExport);
  };

  const handleBulkDelete = () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Delete ${selected.size} selected product(s) locally? This will not delete them from WooCommerce.`)) return;
    const selectedProducts = filtered.filter(p => selected.has(p.sku || p.id));
    onBulkDelete(selectedProducts);
    setSelected(new Set());
  };

  const total = allProducts?.length ?? products.length;

  const realPercent = fetchProgress
    ? (fetchProgress.percent ?? (fetchProgress.total > 0
        ? Math.min(Math.round((fetchProgress.loaded / fetchProgress.total) * 100), 99)
        : 0))
    : 0;

  const hasProgress     = loading && fetchProgress && fetchProgress.total > 0;
  const animatedPercent = useAnimatedPercent(realPercent, hasProgress);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#1c1c1b] rounded-xl overflow-hidden">

      {/* Progress bar */}
      <div className="relative flex-shrink-0">
        {hasProgress ? (
          <div className="h-[2px] w-full bg-gray-100 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full bg-yellow-300 dark:bg-yellow-400 transition-all duration-100 ease-out"
              style={{ width: `${animatedPercent}%` }}
            />
          </div>
        ) : (
          <div className="h-[1px] w-full bg-[#f5f3f0] dark:bg-white/10" />
        )}
      </div>

      <TableToolbar
        search={search}
        onSearch={onSearch}
        onAddNew={onAddNew}
        onImport={onImport}
        onExport={handleExport}
        onBulkDelete={handleBulkDelete}
        onSaveChanges={handleSaveChanges}
        onUndo={undo}
        onRedo={redo}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        loading={loading}
        sorted={filtered}
        selected={selected}
        dirtyCount={dirtyCount}
        filters={filters}
        onFilterChange={handleFilterChange}
        onFilterReset={handleFilterReset}
        activeFilterCount={activeFilterCount}
      />

      <TableHeader
        products={filtered}
        selected={selected}
        sortField={sortField}
        sortDir={sortDir}
        onToggleAll={toggleAll}
        onSort={handleSort}
      />

      <div className="flex-1 overflow-hidden">
        <TableBody
          loading={loading}
          sorted={filtered}
          selected={selected}
          onRowClick={onRowClick}
          onToggleOne={toggleOne}
          dirtyMap={dirtyMap}
          onCellCommit={handleCellCommit}
          onNavigate={handleNavigate}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-[#f5f3f0] dark:border-white/10 bg-white dark:bg-[#1c1c1b] flex-shrink-0">
        <span className="text-[11px] text-[#aaa] dark:text-white/30">
          {loading
            ? hasProgress
              ? `Fetching ${fetchProgress.loaded.toLocaleString()} of ${fetchProgress.total.toLocaleString()} products · ${animatedPercent}%`
              : 'Loading…'
            : activeFilterCount > 0
              ? `${filtered.length} of ${total} products (filtered)`
              : products.length === total
                ? `${total} of ${total} products`
                : `${products.length} of ${total} products`}
          {!loading && selected.size > 0 && (
            <span className="ml-2 text-yellow-600 dark:text-yellow-400 font-medium">{selected.size} selected</span>
          )}
          {dirtyCount > 0 && (
            <span className="ml-2 text-yellow-600 dark:text-yellow-400 font-medium">· {dirtyCount} unsaved</span>
          )}
        </span>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1 text-[11px] text-[#aaa] dark:text-white/30 hover:text-[#555] dark:hover:text-white/60 transition-colors disabled:opacity-40"
          >
            <RiRefreshLine size={11} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        )}
      </div>
    </div>
  );
}