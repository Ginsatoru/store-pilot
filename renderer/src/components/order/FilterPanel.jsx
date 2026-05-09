import React from 'react';
import { RiCloseLine } from 'react-icons/ri';

const STATUS_MAP = {
  pending:    { label: 'Pending' },
  processing: { label: 'Processing' },
  'on-hold':  { label: 'On Hold' },
  completed:  { label: 'Completed' },
  cancelled:  { label: 'Cancelled' },
  refunded:   { label: 'Refunded' },
  failed:     { label: 'Failed' },
  shipped:    { label: 'Shipped' },
};

export function FilterPanel({ filters, onChange, onReset, onClose, paymentMethods }) {
  const statuses = Object.keys(STATUS_MAP);

  return (
    <div className="absolute left-0 top-full mt-1.5 z-50 w-64 bg-white dark:bg-[#1c1c1b] border border-[#f0ede8] dark:border-white/10 rounded-2xl shadow-xl p-3 flex flex-col gap-3">
      {/* Header */}
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
          <button
            onClick={() => onChange('status', '')}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-medium transition-colors duration-150 ${
              filters.status === ''
                ? 'bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a]'
                : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/40 hover:bg-gray-200 dark:hover:bg-white/15'
            }`}
          >
            All
          </button>
          {statuses.map(s => (
            <button
              key={s}
              onClick={() => onChange('status', s)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-medium transition-colors duration-150 ${
                filters.status === s
                  ? 'bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a]'
                  : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/40 hover:bg-gray-200 dark:hover:bg-white/15'
              }`}
            >
              {STATUS_MAP[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Payment */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-medium text-[#888] dark:text-white/30 uppercase tracking-wide">Payment</label>
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => onChange('payment', '')}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-medium transition-colors duration-150 ${
              filters.payment === ''
                ? 'bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a]'
                : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/40 hover:bg-gray-200 dark:hover:bg-white/15'
            }`}
          >
            All
          </button>
          {paymentMethods.map(p => (
            <button
              key={p}
              onClick={() => onChange('payment', p)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-medium transition-colors duration-150 ${
                filters.payment === p
                  ? 'bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a]'
                  : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/40 hover:bg-gray-200 dark:hover:bg-white/15'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Date Range */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-medium text-[#888] dark:text-white/30 uppercase tracking-wide">Date Range</label>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filters.dateFrom}
            onChange={e => onChange('dateFrom', e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-xl text-[11px] bg-gray-100 dark:bg-white/10 text-[#1a1a1a] dark:text-white/80 outline-none border border-transparent focus:border-yellow-300 dark:focus:border-yellow-400/50"
          />
          <span className="text-[11px] text-[#ccc] dark:text-white/20 flex-shrink-0">–</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={e => onChange('dateTo', e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-xl text-[11px] bg-gray-100 dark:bg-white/10 text-[#1a1a1a] dark:text-white/80 outline-none border border-transparent focus:border-yellow-300 dark:focus:border-yellow-400/50"
          />
        </div>
      </div>

      {/* Customer */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-medium text-[#888] dark:text-white/30 uppercase tracking-wide">Customer</label>
        <input
          type="text"
          placeholder="Name or email…"
          value={filters.customer}
          onChange={e => onChange('customer', e.target.value)}
          className="w-full px-2.5 py-1.5 rounded-xl text-[12px] bg-gray-100 dark:bg-white/10 text-[#1a1a1a] dark:text-white/80 placeholder-gray-400 dark:placeholder-white/20 outline-none border border-transparent focus:border-yellow-300 dark:focus:border-yellow-400/50"
        />
      </div>
    </div>
  );
}