import { useState, useEffect, useRef } from 'react';

// ── Layout constants ──────────────────────────────────────────────────────────
export const GRID_STYLE = {
  display: 'grid',
  gridTemplateColumns: '40px 2fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr',
};

export const CELL       = 'px-3 py-2.5 flex items-center';
export const CELL_INNER = 'px-3 py-2.5 flex items-center';

// Only Columns remains — Status/Stock/Category moved to filter panel
export const FILTERS = ['Columns'];

export const COL_HEADERS = [
  { key: 'name',          label: 'Name'         },
  { key: 'sku',           label: 'SKU'          },
  { key: 'category',      label: 'Category'     },
  { key: 'regular_price', label: 'Price'        },
  { key: 'sale_price',    label: 'Sale'         },
  { key: 'stock',         label: 'Stock'        },
  { key: 'stock_status',  label: 'Stock Status' },
  { key: 'status',        label: 'Status'       },
];

// Columns that can be hidden (name is always visible)
export const TOGGLEABLE_COLS = ['sku', 'category', 'regular_price', 'sale_price', 'stock', 'stock_status', 'status'];

export const DEFAULT_VISIBLE_COLS = {
  sku:           true,
  category:      true,
  regular_price: true,
  sale_price:    true,
  stock:         true,
  stock_status:  true,
  status:        true,
};

// Columns that support inline editing and their type
export const EDITABLE_COLS = {
  name:          'text',
  category:      'text',
  regular_price: 'number',
  sale_price:    'number',
  stock:         'integer',
  stock_status:  'select',
  status:        'select',
};

export const STOCK_STATUS_OPTIONS = ['instock', 'outofstock', 'onbackorder'];
export const STATUS_OPTIONS       = ['Live', 'Draft'];

// ── Dynamic grid style based on visible cols ──────────────────────────────────
export function buildGridStyle(visibleCols) {
  // name col is always shown (2fr), then each visible extra col gets 1fr
  const extras = TOGGLEABLE_COLS.filter(k => visibleCols[k]);
  const cols   = ['40px', '2fr', ...extras.map(() => '1fr')];
  return { display: 'grid', gridTemplateColumns: cols.join(' ') };
}

// ── CSV export ────────────────────────────────────────────────────────────────
export function esc(val) {
  return `"${String(val ?? '').replace(/"/g, '""')}"`;
}

export function exportToCSV(products) {
  const headers = [
    'sku', 'name', 'category', 'regular_price', 'sale_price',
    'stock', 'stock_status', 'status', 'weight', 'short_description',
    'description', 'type', 'slug', 'tags', 'on_sale', 'manage_stock',
    'length', 'width', 'height', 'date_created', 'date_modified', 'permalink',
  ];

  const rows = products.map(p => [
    esc(p.sku),
    esc(p.name),
    esc(p.category),
    p.regular_price != null ? p.regular_price.toFixed(2) : '0.00',
    p.sale_price > 0 ? p.sale_price.toFixed(2) : '',
    p.stock ?? 0,
    esc(p.stock_status),
    esc(p.status === 'Live' ? 'Live' : 'Draft'),
    esc(p.weight),
    esc(p.short_description),
    esc(p.description),
    esc(p.type),
    esc(p.slug),
    esc((p.tags || []).map(t => t.name || t).join('|')),
    p.on_sale ? 'true' : 'false',
    p.manage_stock ? 'true' : 'false',
    esc(p.dimensions?.length),
    esc(p.dimensions?.width),
    esc(p.dimensions?.height),
    esc(p.date ? new Date(p.date).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' }) : ''),
    esc(p.date_modified ? new Date(p.date_modified).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' }) : ''),
    esc(p.permalink),
  ]);

  const csv  = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `products_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Animated percent counter ──────────────────────────────────────────────────
export function useAnimatedPercent(targetPercent, active) {
  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!active) { setDisplayed(0); return; }
    const target = targetPercent ?? 0;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const tick = () => {
      setDisplayed(prev => {
        if (prev >= target) return prev;
        const gap  = target - prev;
        const step = gap > 20 ? 3 : gap > 10 ? 2 : 1;
        return Math.min(prev + step, target);
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [targetPercent, active]);

  useEffect(() => {
    if (displayed >= (targetPercent ?? 0) && rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, [displayed, targetPercent]);

  return displayed;
}

// ── Badges ────────────────────────────────────────────────────────────────────
export function Avatar({ name, color, active, image }) {
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

export function StatusBadge({ status }) {
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

export function StockStatusBadge({ status }) {
  const map = {
    instock:     { label: 'In Stock',     color: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-400' },
    outofstock:  { label: 'Out of Stock', color: 'text-red-500 dark:text-red-400',         dot: 'bg-red-400'     },
    onbackorder: { label: 'Backorder',    color: 'text-yellow-600 dark:text-yellow-400',   dot: 'bg-yellow-400'  },
  };
  const s = map[status] || { label: status || '—', color: 'text-[#999] dark:text-white/30', dot: 'bg-[#ccc] dark:bg-white/20' };
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${s.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}