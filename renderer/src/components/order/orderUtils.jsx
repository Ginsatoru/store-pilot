export const GRID_STYLE = {
  display: 'grid',
  gridTemplateColumns: '40px 1.2fr 2fr 1fr 1fr 1fr 1.1fr 1fr',
};

export const CELL       = 'px-3 py-2.5 flex items-center';
export const CELL_INNER = 'py-2.5 flex items-center px-3';

export const COL_HEADERS = [
  { key: 'number',       label: 'Order'    },
  { key: 'billing_name', label: 'Customer' },
  { key: 'status',       label: 'Status'   },
  { key: 'total',        label: 'Total'    },
  { key: 'items',        label: 'Items'    },
  { key: 'date_created', label: 'Date'     },
  { key: 'payment',      label: 'Payment'  },
];

export const DEFAULT_FILTERS = {
  status:      '',
  payment:     '',
  dateFrom:    '',
  dateTo:      '',
  customer:    '',
};

export function normalizeOrder(o) {
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