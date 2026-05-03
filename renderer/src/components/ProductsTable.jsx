import React, { useState } from 'react';
import {
  RiArrowUpLine, RiArrowDownLine, RiRefreshLine,
  RiSearchLine, RiAddLine, RiFilter3Line, RiDownloadLine, RiUploadLine,
} from 'react-icons/ri';

const GRID_STYLE = {
  display: 'grid',
  gridTemplateColumns: '40px 2fr 1fr 1fr 1fr 1.2fr 1fr 1fr',
};

const CELL               = 'px-3 py-2.5 flex items-center';
const CELL_INDENT        = 'py-2.5 flex items-center';
const INDENT_STYLE       = { paddingLeft: 'calc(0.75rem + 14px)', paddingRight: '0.75rem' };
const STATUS_INDENT_STYLE = { paddingLeft: 'calc(0.75rem + 18px)', paddingRight: '0.75rem' };

const FILTERS = ['Columns', 'Department', 'Site', 'Lifecycle', 'Status', 'Entity'];

const COL_HEADERS = [
  { key: 'name',      label: 'Name'       },
  { key: 'category',  label: 'Category'   },
  { key: 'price',     label: 'Price'      },
  { key: 'stock',     label: 'Stock Qty'  },
  { key: 'date',      label: 'Start date' },
  { key: 'lifecycle', label: 'Lifecycle'  },
  { key: 'status',    label: 'Status', statusCol: true },
];

function exportToCSV(products) {
  const headers = ['ID', 'Name', 'Category', 'Price', 'Stock', 'Status', 'Date'];
  const rows = products.map(p => [
    p.id,
    `"${(p.name || '').replace(/"/g, '""')}"`,
    `"${(p.category || '').replace(/"/g, '""')}"`,
    p.price?.toFixed(2) ?? '0.00',
    p.stock ?? 0,
    p.status || '',
    p.date ? new Date(p.date).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `products_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ProductsTable({ products, allProducts, search, onSearch, onRefresh, onAddNew, onRowClick, onImport, loading }) {
  const [selected, setSelected]   = useState(new Set());
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir]     = useState('asc');

  const allSelected = products.length > 0 && selected.size === products.length;

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(products.map(p => p.id)));

  const toggleOne = id => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const handleSort = field => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const sorted = [...products].sort((a, b) => {
    if (!sortField) return 0;
    let va = a[sortField], vb = b[sortField];
    if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const handleExport = () => {
    const toExport = selected.size > 0
      ? sorted.filter(p => selected.has(p.id))
      : sorted;
    exportToCSV(toExport);
  };

  const total = allProducts?.length ?? products.length;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#1c1c1b] rounded-xl overflow-hidden">

      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#f5f3f0] dark:border-white/10 flex-shrink-0">
        <div className="flex items-center gap-1 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f}
              className="flex items-center gap-0.5 px-2.5 py-1 rounded-xl text-[12px] font-medium text-gray-500 dark:text-white/50 bg-gray-100 dark:bg-white/10 hover:bg-[#1a1a1a] dark:hover:bg-white hover:text-white dark:hover:text-[#1a1a1a] transition-colors duration-150"
            >
              {f}
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                <path d="M2 3.5L4.5 6 7 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ))}
          <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-white/10 rounded-xl px-2.5 py-1.5 ml-1">
            <RiSearchLine className="text-gray-400 dark:text-white/30 flex-shrink-0" size={13} />
            <input
              type="text"
              placeholder="Search"
              value={search}
              onChange={e => onSearch(e.target.value)}
              className="text-[12px] bg-transparent outline-none text-gray-700 dark:text-white/80 placeholder-gray-400 dark:placeholder-white/25 w-36"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={onAddNew}
            className="w-7 h-7 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/50 hover:bg-[#1a1a1a] dark:hover:bg-white hover:text-white dark:hover:text-[#1a1a1a] transition-colors duration-150"
          >
            <RiAddLine size={14} />
          </button>
          <button className="w-7 h-7 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/50 hover:bg-[#1a1a1a] dark:hover:bg-white hover:text-white dark:hover:text-[#1a1a1a] transition-colors duration-150">
            <RiFilter3Line size={13} />
          </button>
          <button
            onClick={onImport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/50 hover:bg-[#1a1a1a] dark:hover:bg-white hover:text-white dark:hover:text-[#1a1a1a] transition-colors duration-150 text-[12px] font-medium"
          >
            <RiUploadLine size={12} />
            Import
          </button>
          <button
            onClick={handleExport}
            disabled={loading || sorted.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/50 hover:bg-[#1a1a1a] dark:hover:bg-white hover:text-white dark:hover:text-[#1a1a1a] transition-colors duration-150 text-[12px] font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            title={selected.size > 0 ? `Export ${selected.size} selected` : `Export all ${sorted.length} products`}
          >
            <RiDownloadLine size={12} />
            Export{selected.size > 0 ? ` (${selected.size})` : ''}
          </button>
        </div>
      </div>

      {/* Column Headers */}
      <div className="border-b border-[#f5f3f0] dark:border-white/10 bg-white dark:bg-[#1c1c1b] flex-shrink-0">
        <div style={GRID_STYLE}>
          <div className={CELL}>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="w-3.5 h-3.5 rounded border-[#ccc] dark:border-white/20 cursor-pointer accent-[#1a1a1a] dark:accent-white"
            />
          </div>
          {COL_HEADERS.map(col => (
            <button
              key={col.key}
              onClick={() => handleSort(col.key)}
              className="relative flex items-center py-2.5 text-[11px] font-medium text-[#888] dark:text-white/30 hover:text-[#333] dark:hover:text-white/60 transition-colors text-left group w-full"
              style={{ paddingLeft: '0.75rem', paddingRight: '0.75rem' }}
            >
              <span className="absolute text-[#ccc] dark:text-white/15 group-hover:text-[#aaa] dark:group-hover:text-white/30 transition-colors" style={{ left: '0.75rem' }}>
                {sortField === col.key
                  ? (sortDir === 'asc' ? <RiArrowUpLine size={10} /> : <RiArrowDownLine size={10} />)
                  : <RiArrowUpLine size={10} />}
              </span>
              <span style={{ paddingLeft: col.statusCol ? '12px' : '14px' }}>{col.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex flex-col gap-0">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={GRID_STYLE} className="border-b border-[#f5f3f0] dark:border-white/5 animate-pulse">
                <div className={CELL}><div className="w-3.5 h-3.5 rounded bg-gray-100 dark:bg-white/10" /></div>
                <div className={`${CELL} gap-2.5`}>
                  <div className="w-6 h-6 rounded bg-gray-100 dark:bg-white/10 flex-shrink-0" />
                  <div className="h-3 rounded bg-gray-100 dark:bg-white/10 w-36" />
                </div>
                {[80, 60, 40, 72, 40, 50].map((w, j) => (
                  <div key={j} className={CELL_INDENT} style={INDENT_STYLE}>
                    <div className="h-3 rounded bg-gray-100 dark:bg-white/10" style={{ width: w }} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <span className="text-5xl">📦</span>
            <div className="text-center">
              <p className="text-[13px] font-medium text-[#555] dark:text-white/40">No products found</p>
              <p className="text-[11px] text-[#aaa] dark:text-white/25 mt-0.5">Try adjusting your search or filters</p>
            </div>
          </div>
        ) : (
          sorted.map(product => {
            const isSelected = selected.has(product.id);
            return (
              <div
                key={product.id}
                onClick={() => onRowClick?.(product)}
                style={GRID_STYLE}
                className={`border-b border-[#f5f3f0] dark:border-white/5 cursor-pointer transition-colors duration-100 ${
                  isSelected ? 'bg-yellow-50 dark:bg-yellow-400/10' : 'hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                <div className={CELL} onClick={e => { e.stopPropagation(); toggleOne(product.id); }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleOne(product.id)}
                    className="w-3.5 h-3.5 rounded border-[#ccc] dark:border-white/20 cursor-pointer accent-[#1a1a1a] dark:accent-white"
                  />
                </div>
                <div className={`${CELL} gap-2.5 min-w-0`}>
                  <Avatar name={product.name} color={product.color} active={isSelected} image={product.localPreview || product._raw?.images?.[0]?.src} />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[12px] font-medium text-[#1a1a1a] dark:text-white/80 truncate" title={product.name}>
                      {product.name}
                    </span>
                    {product._pending && (
                      <span className="text-[10px] text-yellow-600 dark:text-yellow-400 font-medium">Pending sync</span>
                    )}
                  </div>
                </div>
                <div className={CELL_INDENT} style={INDENT_STYLE}>
                  <span className="text-[12px] text-[#777] dark:text-white/40">{product.category}</span>
                </div>
                <div className={CELL_INDENT} style={INDENT_STYLE}>
                  <span className="text-[12px] font-mono text-[#1a1a1a] dark:text-white/70">${product.price.toFixed(2)}</span>
                </div>
                <div className={CELL_INDENT} style={INDENT_STYLE}>
                  <span className={`text-[12px] ${product.stock === 0 ? 'text-[#ccc] dark:text-white/20' : 'text-[#555] dark:text-white/50'}`}>
                    {product.stock === 0 ? '—' : product.stock}
                  </span>
                </div>
                <div className={CELL_INDENT} style={INDENT_STYLE}>
                  <span className="text-[11px] font-mono text-[#888] dark:text-white/35">
                    {new Date(product.date).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </span>
                </div>
                <div className={CELL_INDENT} style={INDENT_STYLE}>
                  <span className="text-[11px] text-[#ccc] dark:text-white/15">—</span>
                </div>
                <div className={CELL_INDENT} style={STATUS_INDENT_STYLE}>
                  <StatusBadge status={product.status} />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-[#f5f3f0] dark:border-white/10 bg-white dark:bg-[#1c1c1b] flex-shrink-0">
        <span className="text-[11px] text-[#aaa] dark:text-white/30">
          {loading
            ? 'Loading…'
            : products.length === total
              ? `${total} of ${total} products`
              : `${products.length} of ${total} products`}
          {selected.size > 0 && (
            <span className="ml-2 text-yellow-600 dark:text-yellow-400 font-medium">{selected.size} selected</span>
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

function Avatar({ name, color, active, image }) {
  return (
    <div
      className={`w-6 h-6 rounded flex-shrink-0 overflow-hidden ${active ? 'ring-2 ring-yellow-400' : ''}`}
      style={{ background: color || '#1a1a1a' }}
    >
      {image ? (
        <img src={image} alt={name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white text-[9px] font-bold">
          {(name?.[0] || '?').toUpperCase()}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const isLive = status === 'Live';
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${
      isLive ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#999] dark:text-white/30'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-400' : 'bg-[#ccc] dark:bg-white/20'}`} />
      {status}
    </span>
  );
}