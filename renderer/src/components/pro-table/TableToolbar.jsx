import React, { useState, useRef, useEffect } from "react";
import {
  RiSearchLine,
  RiAddLine,
  RiFilter3Line,
  RiDownloadLine,
  RiUploadLine,
  RiDeleteBin2Line,
  RiSaveLine,
  RiArrowGoBackLine,
  RiArrowGoForwardLine,
  RiCloseLine,
  RiCheckLine,
  RiLayoutColumnLine,
} from "react-icons/ri";
import { STOCK_STATUS_OPTIONS, STATUS_OPTIONS, COL_HEADERS } from "./tableUtils";

// ── Columns Panel ─────────────────────────────────────────────────────────────

function ColumnsPanel({ visibleCols, onChange, onReset, onClose }) {
  // name is always visible, skip it
  const toggleable = COL_HEADERS.filter(c => c.key !== 'name');

  return (
    <div className="absolute left-0 top-full mt-1.5 z-50 w-48 bg-white dark:bg-[#1c1c1b] border border-[#f0ede8] dark:border-white/10 rounded-2xl shadow-xl p-3 flex flex-col gap-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[12px] font-semibold text-[#1a1a1a] dark:text-white/80">Columns</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onReset}
            className="text-[11px] text-[#aaa] dark:text-white/30 hover:text-[#555] dark:hover:text-white/60 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={onClose}
            className="w-5 h-5 flex items-center justify-center rounded-lg text-[#ccc] dark:text-white/20 hover:text-[#555] dark:hover:text-white/60 transition-colors"
          >
            <RiCloseLine size={13} />
          </button>
        </div>
      </div>

      {/* Name — always on */}
      <div className="flex items-center justify-between px-2 py-1.5 rounded-xl bg-gray-50 dark:bg-white/5">
        <span className="text-[12px] text-[#1a1a1a] dark:text-white/60">Name</span>
        <span className="text-[10px] text-[#bbb] dark:text-white/20">Always</span>
      </div>

      {toggleable.map(col => (
        <button
          key={col.key}
          onClick={() => onChange(col.key, !visibleCols[col.key])}
          className="flex items-center justify-between px-2 py-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group"
        >
          <span className={`text-[12px] transition-colors ${
            visibleCols[col.key]
              ? 'text-[#1a1a1a] dark:text-white/80'
              : 'text-[#bbb] dark:text-white/25'
          }`}>
            {col.label}
          </span>
          <span className={`w-4 h-4 rounded-md flex items-center justify-center transition-colors ${
            visibleCols[col.key]
              ? 'bg-[#1a1a1a] dark:bg-white'
              : 'bg-gray-100 dark:bg-white/10'
          }`}>
            {visibleCols[col.key] && <RiCheckLine size={10} className="text-white dark:text-[#1a1a1a]" />}
          </span>
        </button>
      ))}
    </div>
  );
}

// ── Filter Panel ──────────────────────────────────────────────────────────────

function FilterPanel({ filters, onChange, onReset, onClose }) {
  return (
    <div className="absolute left-0 top-full mt-1.5 z-50 w-64 bg-white dark:bg-[#1c1c1b] border border-[#f0ede8] dark:border-white/10 rounded-2xl shadow-xl p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold text-[#1a1a1a] dark:text-white/80">Filters</span>
        <div className="flex items-center gap-1.5">
          <button onClick={onReset} className="text-[11px] text-[#aaa] dark:text-white/30 hover:text-[#555] dark:hover:text-white/60 transition-colors">Reset</button>
          <button onClick={onClose} className="w-5 h-5 flex items-center justify-center rounded-lg text-[#ccc] dark:text-white/20 hover:text-[#555] dark:hover:text-white/60 transition-colors">
            <RiCloseLine size={13} />
          </button>
        </div>
      </div>

      {/* Status */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-medium text-[#888] dark:text-white/30 uppercase tracking-wide">Status</label>
        <div className="flex gap-1.5 flex-wrap">
          {['all', ...STATUS_OPTIONS].map(opt => (
            <button
              key={opt}
              onClick={() => onChange('status', opt === 'all' ? '' : opt)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-medium transition-colors duration-150 ${
                (filters.status === '' && opt === 'all') || filters.status === opt
                  ? 'bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a]'
                  : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/40 hover:bg-gray-200 dark:hover:bg-white/15'
              }`}
            >
              {opt === 'all' ? 'All' : opt}
            </button>
          ))}
        </div>
      </div>

      {/* Stock Status */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-medium text-[#888] dark:text-white/30 uppercase tracking-wide">Stock Status</label>
        <div className="flex gap-1.5 flex-wrap">
          {['all', ...STOCK_STATUS_OPTIONS].map(opt => {
            const labels = { all: 'All', instock: 'In Stock', outofstock: 'Out of Stock', onbackorder: 'Backorder' };
            return (
              <button
                key={opt}
                onClick={() => onChange('stock_status', opt === 'all' ? '' : opt)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-medium transition-colors duration-150 ${
                  (filters.stock_status === '' && opt === 'all') || filters.stock_status === opt
                    ? 'bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a]'
                    : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/40 hover:bg-gray-200 dark:hover:bg-white/15'
                }`}
              >
                {labels[opt]}
              </button>
            );
          })}
        </div>
      </div>

      {/* On Sale */}
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-medium text-[#888] dark:text-white/30 uppercase tracking-wide">On Sale</label>
        <button
          onClick={() => onChange('onSale', !filters.onSale)}
          style={{ width: 32, height: 18, flexShrink: 0 }}
          className={`relative rounded-full transition-colors duration-200 ${filters.onSale ? 'bg-yellow-400' : 'bg-gray-200 dark:bg-white/15'}`}
        >
          <span style={{
            position: 'absolute', top: 2,
            left: filters.onSale ? 14 : 2,
            width: 14, height: 14, borderRadius: '50%',
            background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            transition: 'left 0.2s',
          }} />
        </button>
      </div>

      {/* Price Range */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-medium text-[#888] dark:text-white/30 uppercase tracking-wide">Price Range</label>
        <div className="flex items-center gap-2">
          <input type="number" placeholder="Min" value={filters.priceMin} onChange={e => onChange('priceMin', e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-xl text-[12px] bg-gray-100 dark:bg-white/10 text-[#1a1a1a] dark:text-white/80 placeholder-gray-400 dark:placeholder-white/20 outline-none border border-transparent focus:border-yellow-300 dark:focus:border-yellow-400/50" />
          <span className="text-[11px] text-[#ccc] dark:text-white/20 flex-shrink-0">–</span>
          <input type="number" placeholder="Max" value={filters.priceMax} onChange={e => onChange('priceMax', e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-xl text-[12px] bg-gray-100 dark:bg-white/10 text-[#1a1a1a] dark:text-white/80 placeholder-gray-400 dark:placeholder-white/20 outline-none border border-transparent focus:border-yellow-300 dark:focus:border-yellow-400/50" />
        </div>
      </div>

      {/* Category */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-medium text-[#888] dark:text-white/30 uppercase tracking-wide">Category</label>
        <input type="text" placeholder="e.g. Shirts" value={filters.category} onChange={e => onChange('category', e.target.value)}
          className="w-full px-2.5 py-1.5 rounded-xl text-[12px] bg-gray-100 dark:bg-white/10 text-[#1a1a1a] dark:text-white/80 placeholder-gray-400 dark:placeholder-white/20 outline-none border border-transparent focus:border-yellow-300 dark:focus:border-yellow-400/50" />
      </div>
    </div>
  );
}

// ── Toolbar ───────────────────────────────────────────────────────────────────

export default function TableToolbar({
  search, onSearch, onAddNew, onImport, onExport,
  onBulkDelete, onSaveChanges, onUndo, onRedo,
  canUndo, canRedo, loading, sorted, selected, dirtyCount,
  filters, onFilterChange, onFilterReset, activeFilterCount,
  visibleCols, onColChange, onColReset,
}) {
  const [colsOpen,   setColsOpen]   = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const colsRef   = useRef(null);
  const filterRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (colsOpen   && colsRef.current   && !colsRef.current.contains(e.target))   setColsOpen(false);
      if (filterOpen && filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [colsOpen, filterOpen]);

  const hiddenColCount = Object.values(visibleCols).filter(v => !v).length;

  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-[#f5f3f0] dark:border-white/10 flex-shrink-0">

      {/* LEFT — Columns, Filter, Search */}
      <div className="flex items-center gap-1.5 flex-wrap">

        {/* Columns */}
        <div className="relative" ref={colsRef}>
          <button
            onClick={() => { setColsOpen(o => !o); setFilterOpen(false); }}
            className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[12px] font-medium transition-colors duration-150 ${
              colsOpen || hiddenColCount > 0
                ? 'bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a]'
                : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/50 hover:bg-[#1a1a1a] dark:hover:bg-white hover:text-white dark:hover:text-[#1a1a1a]'
            }`}
          >
            <RiLayoutColumnLine size={12} />
            Columns
            {hiddenColCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-yellow-400 text-[#1a1a1a] text-[8px] font-bold flex items-center justify-center leading-none">
                {hiddenColCount}
              </span>
            )}
          </button>
          {colsOpen && (
            <ColumnsPanel
              visibleCols={visibleCols}
              onChange={onColChange}
              onReset={onColReset}
              onClose={() => setColsOpen(false)}
            />
          )}
        </div>

        {/* Filter */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => { setFilterOpen(o => !o); setColsOpen(false); }}
            className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[12px] font-medium transition-colors duration-150 ${
              filterOpen || activeFilterCount > 0
                ? 'bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a]'
                : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/50 hover:bg-[#1a1a1a] dark:hover:bg-white hover:text-white dark:hover:text-[#1a1a1a]'
            }`}
          >
            <RiFilter3Line size={12} />
            Filter
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-yellow-400 text-[#1a1a1a] text-[8px] font-bold flex items-center justify-center leading-none">
                {activeFilterCount}
              </span>
            )}
          </button>
          {filterOpen && (
            <FilterPanel
              filters={filters}
              onChange={onFilterChange}
              onReset={onFilterReset}
              onClose={() => setFilterOpen(false)}
            />
          )}
        </div>

        {/* Search */}
        <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-white/10 rounded-xl px-2.5 py-1.5">
          <RiSearchLine className="text-gray-400 dark:text-white/30 flex-shrink-0" size={13} />
          <input
            type="text"
            placeholder="Search name, SKU…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            className="text-[12px] bg-transparent outline-none text-gray-700 dark:text-white/80 placeholder-gray-400 dark:placeholder-white/25 w-36"
          />
        </div>
      </div>

      {/* RIGHT — actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">

        {/* Undo / Redo */}
        <button onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)"
          className="w-7 h-7 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/50 hover:bg-[#1a1a1a] dark:hover:bg-white hover:text-white dark:hover:text-[#1a1a1a] transition-colors duration-150 disabled:opacity-25 disabled:cursor-not-allowed">
          <RiArrowGoBackLine size={13} />
        </button>
        <button onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)"
          className="w-7 h-7 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/50 hover:bg-[#1a1a1a] dark:hover:bg-white hover:text-white dark:hover:text-[#1a1a1a] transition-colors duration-150 disabled:opacity-25 disabled:cursor-not-allowed">
          <RiArrowGoForwardLine size={13} />
        </button>

        {/* Save */}
        {dirtyCount > 0 && (
          <button onClick={onSaveChanges} disabled={loading} title="Save (Ctrl+S)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-yellow-300 dark:bg-yellow-400 text-[#555] dark:text-[#1a1a1a] hover:bg-yellow-400 dark:hover:bg-yellow-300 transition-colors duration-150 text-[12px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed">
            <RiSaveLine size={13} />
            Save {dirtyCount} change{dirtyCount !== 1 ? "s" : ""}
          </button>
        )}

        {/* Bulk delete */}
        {selected.size > 0 && (
          <button onClick={onBulkDelete} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-500 dark:text-red-400 hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-colors duration-150 text-[12px] font-medium disabled:opacity-40 disabled:cursor-not-allowed">
            <RiDeleteBin2Line size={12} />
            Delete {selected.size}
          </button>
        )}

        <button onClick={onAddNew}
          className="w-7 h-7 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/50 hover:bg-[#1a1a1a] dark:hover:bg-white hover:text-white dark:hover:text-[#1a1a1a] transition-colors duration-150">
          <RiAddLine size={14} />
        </button>

        <button onClick={onImport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/50 hover:bg-[#1a1a1a] dark:hover:bg-white hover:text-white dark:hover:text-[#1a1a1a] transition-colors duration-150 text-[12px] font-medium">
          <RiUploadLine size={12} />
          Import
        </button>
        <button onClick={onExport} disabled={loading || sorted.length === 0}
          title={selected.size > 0 ? `Export ${selected.size} selected` : `Export all ${sorted.length} products`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/50 hover:bg-[#1a1a1a] dark:hover:bg-white hover:text-white dark:hover:text-[#1a1a1a] transition-colors duration-150 text-[12px] font-medium disabled:opacity-40 disabled:cursor-not-allowed">
          <RiDownloadLine size={12} />
          Export{selected.size > 0 ? ` (${selected.size})` : ""}
        </button>
      </div>
    </div>
  );
}