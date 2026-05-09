import React from 'react';
import { RiCheckLine } from 'react-icons/ri';

export const IMPORTABLE_FIELDS = [
  { key: 'name',               label: 'Name'              },
  { key: 'category',           label: 'Category'          },
  { key: 'regular_price',      label: 'Regular Price'     },
  { key: 'sale_price',         label: 'Sale Price'        },
  { key: 'stock',              label: 'Stock Qty'         },
  { key: 'stock_status',       label: 'Stock Status'      },
  { key: 'status',             label: 'Publish Status'    },
  { key: 'weight',             label: 'Weight'            },
  { key: 'short_description',  label: 'Short Description' },
  { key: 'description',        label: 'Description'       },
];

export default function ImportFields({ parsedCount, selectedFields, onToggleField, onToggleAll, onBack, onNext }) {
  return (
    <>
      <div className="flex flex-col gap-2 flex-1">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-semibold text-[#444] dark:text-white/60 uppercase tracking-wider">
            Fields to import
          </label>
          <button onClick={onToggleAll} className="text-[10px] text-[#555] dark:text-white/50 hover:text-[#111] dark:hover:text-white/80 transition-colors">
            {selectedFields.size === IMPORTABLE_FIELDS.length ? 'Deselect all' : 'Select all'}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {IMPORTABLE_FIELDS.map(f => {
            const on = selectedFields.has(f.key);
            return (
              <button
                key={f.key}
                onClick={() => onToggleField(f.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-colors ${
                  on
                    ? 'bg-[#1a1a1a] dark:bg-white border-[#1a1a1a] dark:border-white text-white dark:text-[#1a1a1a]'
                    : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/15 text-[#444] dark:text-white/60 hover:border-gray-300 dark:hover:border-white/30'
                }`}
              >
                <span className={`w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0 border ${
                  on ? 'bg-white dark:bg-[#1a1a1a] border-transparent' : 'border-gray-300 dark:border-white/20'
                }`}>
                  {on && <RiCheckLine size={9} className="text-[#1a1a1a] dark:text-white" />}
                </span>
                <span className="text-[11px] font-medium">{f.label}</span>
              </button>
            );
          })}
        </div>
        {selectedFields.size === 0 && (
          <p className="text-[11px] text-yellow-600 dark:text-yellow-400">Select at least one field to import.</p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 mt-auto">
        <button onClick={onBack} className="text-[12px] font-medium text-[#444] dark:text-white/60 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl px-4 py-2 transition-colors">
          Back
        </button>
        <button
          onClick={onNext}
          disabled={selectedFields.size === 0}
          className="flex-1 flex items-center justify-center gap-1.5 text-[12px] font-semibold bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a] rounded-xl py-2 hover:bg-black dark:hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Preview Import
        </button>
      </div>
    </>
  );
}