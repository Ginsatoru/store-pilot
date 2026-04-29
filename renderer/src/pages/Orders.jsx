import React, { useState } from 'react';
import {
  RiSearchLine, RiFilter3Line,
  RiArrowUpLine, RiArrowDownLine,
  RiShoppingBag3Line, RiTimeLine, RiCheckLine,
  RiMoneyDollarCircleLine,
} from 'react-icons/ri';

const GRID_STYLE = {
  display: 'grid',
  gridTemplateColumns: '40px 1.2fr 2fr 1fr 1fr 1fr 1.1fr 1fr',
};

const CELL       = 'px-3 py-2.5 flex items-center';
const CELL_INNER = 'py-2.5 flex items-center px-3';

const COL_HEADERS = [
  { key: 'number',       label: 'Order'    },
  { key: 'billing_name', label: 'Customer' },
  { key: 'status',       label: 'Status'   },
  { key: 'total',        label: 'Total'    },
  { key: 'items',        label: 'Items'    },
  { key: 'date_created', label: 'Date'     },
  { key: 'payment',      label: 'Payment'  },
];

const STATUS_MAP = {
  pending:    { label: 'Pending',    color: 'text-yellow-600 dark:text-yellow-400',  dot: 'bg-yellow-400'  },
  processing: { label: 'Processing', color: 'text-blue-600 dark:text-blue-400',      dot: 'bg-blue-400'    },
  'on-hold':  { label: 'On Hold',    color: 'text-orange-500 dark:text-orange-400',  dot: 'bg-orange-400'  },
  completed:  { label: 'Completed',  color: 'text-emerald-600 dark:text-emerald-400',dot: 'bg-emerald-400' },
  cancelled:  { label: 'Cancelled',  color: 'text-red-500 dark:text-red-400',        dot: 'bg-red-400'     },
  refunded:   { label: 'Refunded',   color: 'text-purple-500 dark:text-purple-400',  dot: 'bg-purple-400'  },
  failed:     { label: 'Failed',     color: 'text-red-400',                          dot: 'bg-red-300'     },
  shipped:    { label: 'Shipped',    color: 'text-teal-600 dark:text-teal-400',      dot: 'bg-teal-400'    },
};

const FILTERS = ['Status', 'Payment', 'Date Range', 'Customer'];

function normalizeOrder(o) {
  return {
    id:            o.id,
    number:        o.number || o.id,
    status:        o.status,
    total:         parseFloat(o.total || 0),
    currency:      o.currency || 'USD',
    date_created:  o.date_created,
    billing_name:  [o.billing?.first_name, o.billing?.last_name].filter(Boolean).join(' ') || 'Guest',
    billing_email: o.billing?.email || '',
    payment:       o.payment_method_title || o.payment_method || '—',
    items:         o.line_items?.length ?? 0,
    line_items:    o.line_items || [],
    _raw:          o,
  };
}

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || { label: status, color: 'text-gray-500 dark:text-white/30', dot: 'bg-gray-300 dark:bg-white/20' };
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${s.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
      {s.label}
    </span>
  );
}

function OrderDetailPanel({ order, onClose }) {
  if (!order) return null;
  const items = order.line_items || [];
  return (
    <div className="w-72 flex-shrink-0 bg-white dark:bg-[#1c1c1b] rounded-xl overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#f5f3f0] dark:border-white/10">
        <div>
          <p className="text-[13px] font-semibold text-[#1a1a1a] dark:text-white/90">Order #{order.number}</p>
          <p className="text-[11px] text-[#aaa] dark:text-white/30 mt-0.5">{order.billing_email}</p>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-white/10 hover:bg-gray-900 dark:hover:bg-white hover:text-white dark:hover:text-[#1a1a1a] text-gray-400 dark:text-white/40 flex items-center justify-center transition-colors text-[14px]"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <StatusBadge status={order.status} />
          <span className="text-[13px] font-bold text-[#1a1a1a] dark:text-white/90">
            {order.currency} {order.total.toFixed(2)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Date',     value: new Date(order.date_created).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' }) },
            { label: 'Payment',  value: order.payment },
            { label: 'Items',    value: order.items },
            { label: 'Customer', value: order.billing_name },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[#f5f4ef] dark:bg-white/5 rounded-xl px-3 py-2">
              <p className="text-[10px] font-semibold text-[#aaa] dark:text-white/30 uppercase tracking-wider">{label}</p>
              <p className="text-[12px] font-medium text-[#1a1a1a] dark:text-white/80 mt-0.5 truncate">{value}</p>
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-semibold text-[#aaa] dark:text-white/30 uppercase tracking-wider">Line Items</p>
            {items.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-[#f5f3f0] dark:border-white/5 last:border-0">
                <div className="flex-1 min-w-0 mr-2">
                  <p className="text-[12px] font-medium text-[#1a1a1a] dark:text-white/80 truncate">{item.name}</p>
                  <p className="text-[10px] text-[#aaa] dark:text-white/30">× {item.quantity}</p>
                </div>
                <span className="text-[12px] font-mono text-[#555] dark:text-white/50 flex-shrink-0">
                  ${parseFloat(item.total || 0).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}

        {order._raw?.billing && (
          <div>
            <p className="text-[10px] font-semibold text-[#aaa] dark:text-white/30 uppercase tracking-wider mb-1.5">Billing Address</p>
            <div className="bg-[#f5f4ef] dark:bg-white/5 rounded-xl px-3 py-2 text-[11px] text-[#555] dark:text-white/50 leading-relaxed">
              {[
                order._raw.billing.address_1,
                order._raw.billing.address_2,
                order._raw.billing.city,
                order._raw.billing.state,
                order._raw.billing.postcode,
                order._raw.billing.country,
              ].filter(Boolean).join(', ')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, accent = 'text-[#1a1a1a] dark:text-white/80' }) {
  return (
    <div className="flex-1 bg-white dark:bg-white/5 rounded-xl px-4 py-3 flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-[#f5f4ef] dark:bg-white/10 flex items-center justify-center flex-shrink-0">
        <Icon size={14} className="text-[#888] dark:text-white/40" />
      </div>
      <div>
        <p className="text-[10px] font-semibold text-[#aaa] dark:text-white/30 uppercase tracking-wider">{label}</p>
        <p className={`text-[16px] font-bold leading-tight ${accent}`}>{value}</p>
      </div>
    </div>
  );
}

export default function Orders({ orderList, syncing }) {
  const [search, setSearch]           = useState('');
  const [sortField, setSortField]     = useState('date_created');
  const [sortDir, setSortDir]         = useState('desc');
  const [selected, setSelected]       = useState(new Set());
  const [activeOrder, setActiveOrder] = useState(null);

  const normalized = (orderList || []).map(normalizeOrder);

  const filtered = normalized.filter(o => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      String(o.number).includes(q) ||
      o.billing_name.toLowerCase().includes(q) ||
      o.billing_email.toLowerCase().includes(q) ||
      o.status.toLowerCase().includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    let va = a[sortField], vb = b[sortField];
    if (sortField === 'date_created') { va = new Date(va); vb = new Date(vb); }
    if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const allSelected = sorted.length > 0 && selected.size === sorted.length;
  const toggleAll   = () => setSelected(allSelected ? new Set() : new Set(sorted.map(o => o.id)));
  const toggleOne   = id => { const n = new Set(selected); n.has(id) ? n.delete(id) : n.add(id); setSelected(n); };

  const handleSort = field => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const totalRevenue = normalized.reduce((s, o) =>
    s + (['cancelled', 'refunded', 'failed'].includes(o.status) ? 0 : o.total), 0
  );
  const byStatus = normalized.reduce((acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc; }, {});

  return (
    <div className="flex-1 overflow-hidden px-5 pb-5 pt-2 flex flex-col gap-4">
      <div className="flex-shrink-0">
        <h1 className="text-[28px] font-bold tracking-tight text-[#1a1a1a] dark:text-white leading-none">Orders</h1>
      </div>

      <div className="flex gap-3 flex-shrink-0">
        <StatCard label="Total Revenue"  value={`$${totalRevenue.toFixed(2)}`} icon={RiMoneyDollarCircleLine} />
        <StatCard label="Total Orders"   value={normalized.length}              icon={RiShoppingBag3Line}      />
        <StatCard label="Processing"     value={byStatus['processing'] || 0}    icon={RiShoppingBag3Line}      accent="text-blue-600 dark:text-blue-400"    />
        <StatCard label="Completed"      value={byStatus['completed']  || 0}    icon={RiCheckLine}             accent="text-emerald-600 dark:text-emerald-400" />
        <StatCard label="Pending"        value={byStatus['pending']    || 0}    icon={RiTimeLine}              accent="text-yellow-600 dark:text-yellow-400"  />
      </div>

      <div className="flex-1 overflow-hidden flex gap-3">
        <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#1c1c1b] rounded-xl overflow-hidden">

          {/* Toolbar */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#f5f3f0] dark:border-white/10 flex-shrink-0">
            <div className="flex items-center gap-1 flex-wrap">
              {FILTERS.map(f => (
                <button key={f} className="flex items-center gap-0.5 px-2.5 py-1 rounded-xl text-[12px] font-medium text-gray-500 dark:text-white/40 bg-gray-100 dark:bg-white/10 hover:bg-[#1a1a1a] dark:hover:bg-white hover:text-white dark:hover:text-[#1a1a1a] transition-colors">
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
                  placeholder="Search orders…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="text-[12px] bg-transparent outline-none text-gray-700 dark:text-white/70 placeholder-gray-400 dark:placeholder-white/25 w-36"
                />
              </div>
            </div>
            <button className="w-7 h-7 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/40 hover:bg-[#1a1a1a] dark:hover:bg-white hover:text-white dark:hover:text-[#1a1a1a] transition-colors">
              <RiFilter3Line size={13} />
            </button>
          </div>

          {/* Column headers */}
          <div className="border-b border-[#f5f3f0] dark:border-white/10 bg-white dark:bg-[#1c1c1b] flex-shrink-0">
            <div style={GRID_STYLE}>
              <div className={CELL}>
                <input type="checkbox" checked={allSelected} onChange={toggleAll}
                  className="w-3.5 h-3.5 rounded border-[#ccc] dark:border-white/20 cursor-pointer accent-[#1a1a1a] dark:accent-white" />
              </div>
              {COL_HEADERS.map(col => (
                <button key={col.key} onClick={() => handleSort(col.key)}
                  className="relative flex items-center py-2.5 text-[11px] font-medium text-[#888] dark:text-white/30 hover:text-[#333] dark:hover:text-white/60 transition-colors text-left group w-full px-3"
                >
                  <span className="absolute left-3 text-[#ccc] dark:text-white/15 group-hover:text-[#aaa] dark:group-hover:text-white/30 transition-colors">
                    {sortField === col.key
                      ? (sortDir === 'asc' ? <RiArrowUpLine size={10} /> : <RiArrowDownLine size={10} />)
                      : <RiArrowUpLine size={10} />}
                  </span>
                  <span className="pl-3.5">{col.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-auto">
            {sorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <span className="text-5xl">🛍️</span>
                <div className="text-center">
                  <p className="text-[13px] font-medium text-[#555] dark:text-white/40">No orders yet</p>
                  <p className="text-[11px] text-[#aaa] dark:text-white/25 mt-0.5">
                    {search ? 'Try adjusting your search' : 'Run a sync from the Sync page to fetch your orders'}
                  </p>
                </div>
              </div>
            ) : (
              sorted.map(order => {
                const isSelected = selected.has(order.id);
                const isActive   = activeOrder?.id === order.id;
                return (
                  <div
                    key={order.id}
                    onClick={() => setActiveOrder(isActive ? null : order)}
                    style={GRID_STYLE}
                    className={`border-b border-[#f5f3f0] dark:border-white/5 cursor-pointer transition-colors duration-100 ${
                      isActive ? 'bg-yellow-50 dark:bg-yellow-400/10' : isSelected ? 'bg-blue-50/40 dark:bg-blue-400/5' : 'hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className={CELL} onClick={e => { e.stopPropagation(); toggleOne(order.id); }}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleOne(order.id)}
                        className="w-3.5 h-3.5 rounded border-[#ccc] dark:border-white/20 cursor-pointer accent-[#1a1a1a] dark:accent-white" />
                    </div>
                    <div className={`${CELL_INNER} font-mono`}>
                      <span className="text-[12px] font-semibold text-[#1a1a1a] dark:text-white/80">#{order.number}</span>
                    </div>
                    <div className={`${CELL_INNER} flex-col items-start gap-0`}>
                      <span className="text-[12px] font-medium text-[#1a1a1a] dark:text-white/80 truncate max-w-full">{order.billing_name}</span>
                      <span className="text-[10px] text-[#aaa] dark:text-white/30 truncate max-w-full">{order.billing_email}</span>
                    </div>
                    <div className={CELL_INNER}><StatusBadge status={order.status} /></div>
                    <div className={CELL_INNER}>
                      <span className="text-[12px] font-mono font-semibold text-[#1a1a1a] dark:text-white/80">${order.total.toFixed(2)}</span>
                    </div>
                    <div className={CELL_INNER}>
                      <span className="text-[12px] text-[#777] dark:text-white/40">{order.items} item{order.items !== 1 ? 's' : ''}</span>
                    </div>
                    <div className={CELL_INNER}>
                      <span className="text-[11px] font-mono text-[#888] dark:text-white/35">
                        {new Date(order.date_created).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </span>
                    </div>
                    <div className={CELL_INNER}>
                      <span className="text-[11px] text-[#777] dark:text-white/40 truncate">{order.payment}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-[#f5f3f0] dark:border-white/10 bg-white dark:bg-[#1c1c1b] flex-shrink-0">
            <span className="text-[11px] text-[#aaa] dark:text-white/30">{sorted.length} of {normalized.length} orders</span>
            {syncing && (
              <span className="text-[11px] text-blue-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                Syncing…
              </span>
            )}
          </div>
        </div>

        {activeOrder && <OrderDetailPanel order={activeOrder} onClose={() => setActiveOrder(null)} />}
      </div>
    </div>
  );
}