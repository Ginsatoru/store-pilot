import React from 'react';

const STATUS_MAP = {
  pending:    { label: 'Pending',    color: 'text-yellow-600 dark:text-yellow-400',   dot: 'bg-yellow-400'  },
  processing: { label: 'Processing', color: 'text-blue-600 dark:text-blue-400',       dot: 'bg-blue-400'    },
  'on-hold':  { label: 'On Hold',    color: 'text-orange-500 dark:text-orange-400',   dot: 'bg-orange-400'  },
  completed:  { label: 'Completed',  color: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-400' },
  cancelled:  { label: 'Cancelled',  color: 'text-red-500 dark:text-red-400',         dot: 'bg-red-400'     },
  refunded:   { label: 'Refunded',   color: 'text-purple-500 dark:text-purple-400',   dot: 'bg-purple-400'  },
  failed:     { label: 'Failed',     color: 'text-red-400',                           dot: 'bg-red-300'     },
  shipped:    { label: 'Shipped',    color: 'text-teal-600 dark:text-teal-400',       dot: 'bg-teal-400'    },
};

export function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || { label: status, color: 'text-gray-500 dark:text-white/30', dot: 'bg-gray-300 dark:bg-white/20' };
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${s.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
      {s.label}
    </span>
  );
}