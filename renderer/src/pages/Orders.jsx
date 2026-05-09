import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  RiSearchLine, RiFilter3Line,
  RiShoppingBag3Line, RiTimeLine, RiCheckLine,
  RiMoneyDollarCircleLine,
} from 'react-icons/ri';

import { StatusBadge } from '../components/order/StatusBadge';
import { FilterPanel } from '../components/order/FilterPanel';
import { OrderDetailPanel } from '../components/order/OrderDetailPanel';
import { StatCard } from '../components/order/StatCard';
import { GRID_STYLE, CELL, CELL_INNER, COL_HEADERS, DEFAULT_FILTERS, normalizeOrder } from '../components/order/orderUtils';

export default function Orders({ orderList, syncing }) {
  const [search,      setSearch]      = useState('');
  const [sortField,   setSortField]   = useState('date_created');
  const [sortDir,     setSortDir]     = useState('desc');
  const [selected,    setSelected]    = useState(new Set());
  const [activeOrder, setActiveOrder] = useState(null);
  const [filters,     setFilters]     = useState(DEFAULT_FILTERS);
  const [filterOpen,  setFilterOpen]  = useState(false);
  const filterRef = useRef(null);

  // Close filter panel on outside click
  useEffect(() => {
    if (!filterOpen) return;
    const handler = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [filterOpen]);

  const normalized = useMemo(() => (orderList || []).map(normalizeOrder), [orderList]);

  // Derive unique payment methods from data
  const paymentMethods = useMemo(() => {
    const set = new Set(normalized.map(o => o.payment).filter(p => p && p !== '—'));
    return Array.from(set);
  }, [normalized]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status)   count++;
    if (filters.payment)  count++;
    if (filters.customer) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    return count;
  }, [filters]);

  const handleFilterChange = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));
  const handleFilterReset  = () => setFilters(DEFAULT_FILTERS);

  const filtered = useMemo(() => {
    return normalized.filter(o => {
      // Search
      if (search) {
        const q = search.toLowerCase();
        const match =
          String(o.number).includes(q) ||
          o.billing_name.toLowerCase().includes(q) ||
          o.billing_email.toLowerCase().includes(q) ||
          o.status.toLowerCase().includes(q);
        if (!match) return false;
      }
      // Status
      if (filters.status && o.status !== filters.status) return false;
      // Payment
      if (filters.payment && o.payment !== filters.payment) return false;
      // Customer
      if (filters.customer) {
        const q = filters.customer.toLowerCase();
        if (!o.billing_name.toLowerCase().includes(q) && !o.billing_email.toLowerCase().includes(q)) return false;
      }
      // Date range
      if (filters.dateFrom) {
        if (new Date(o.date_created) < new Date(filters.dateFrom)) return false;
      }
      if (filters.dateTo) {
        if (new Date(o.date_created) > new Date(filters.dateTo + 'T23:59:59')) return false;
      }
      return true;
    });
  }, [normalized, search, filters]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let va = a[sortField], vb = b[sortField];
      if (sortField === 'date_created') { va = new Date(va); vb = new Date(vb); }
      if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortField, sortDir]);

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
        <StatCard label="Total Revenue" value={`$${totalRevenue.toFixed(2)}`} icon={RiMoneyDollarCircleLine} />
        <StatCard label="Total Orders"  value={normalized.length}              icon={RiShoppingBag3Line} />
        <StatCard label="Processing"    value={byStatus['processing'] || 0}    icon={RiShoppingBag3Line} accent="text-blue-600 dark:text-blue-400" />
        <StatCard label="Completed"     value={byStatus['completed']  || 0}    icon={RiCheckLine}        accent="text-emerald-600 dark:text-emerald-400" />
        <StatCard label="Pending"       value={byStatus['pending']    || 0}    icon={RiTimeLine}         accent="text-yellow-600 dark:text-yellow-400" />
      </div>

      <div className="flex-1 overflow-hidden flex gap-3">
        <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#1c1c1b] rounded-xl overflow-hidden">

          {/* Toolbar */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#f5f3f0] dark:border-white/10 flex-shrink-0">
            <div className="flex items-center gap-1.5 flex-wrap">

              {/* Filter button */}
              <div className="relative" ref={filterRef}>
                <button
                  onClick={() => setFilterOpen(o => !o)}
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
                    onChange={handleFilterChange}
                    onReset={handleFilterReset}
                    onClose={() => setFilterOpen(false)}
                    paymentMethods={paymentMethods}
                  />
                )}
              </div>

              {/* Search */}
              <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-white/10 rounded-xl px-2.5 py-1.5">
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
                  className="flex items-center py-2.5 text-[11px] font-medium text-[#888] dark:text-white/30 hover:text-[#333] dark:hover:text-white/60 transition-colors text-left w-full pl-2.5 pr-3"
                >
                  {col.label}
                </button>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-auto">
            {sorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <RiShoppingBag3Line size={40} className="text-[#ccc] dark:text-white/15" />
                <div className="text-center">
                  <p className="text-[13px] font-medium text-[#555] dark:text-white/40">No orders found</p>
                  <p className="text-[11px] text-[#aaa] dark:text-white/25 mt-0.5">
                    {search || activeFilterCount > 0 ? 'Try adjusting your search or filters' : 'Run a sync from the Sync page to fetch your orders'}
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
                    <div className={CELL} onClick={e => e.stopPropagation()}>
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
            <span className="text-[11px] text-[#aaa] dark:text-white/30">
              {activeFilterCount > 0 ? `${sorted.length} of ${normalized.length} orders (filtered)` : `${sorted.length} of ${normalized.length} orders`}
            </span>
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