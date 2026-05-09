import React from 'react';
import { StatusBadge } from './StatusBadge';

export function OrderDetailPanel({ order, onClose }) {
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
            <div key={label} className="bg-gray-100 dark:bg-white/10 rounded-xl px-3 py-2">
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
            <div className="bg-gray-100 dark:bg-white/10 rounded-xl px-3 py-2 text-[11px] text-[#555] dark:text-white/50 leading-relaxed">
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