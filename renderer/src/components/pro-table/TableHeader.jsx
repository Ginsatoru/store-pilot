import React from 'react';

import { CELL, COL_HEADERS, TOGGLEABLE_COLS, buildGridStyle } from './tableUtils';

export default function TableHeader({
  products, selected, sortField, sortDir,
  onToggleAll, onSort, visibleCols,
}) {
  const allSelected = products.length > 0 && selected.size === products.length;
  const gridStyle   = buildGridStyle(visibleCols);

  const visibleHeaders = COL_HEADERS.filter(col =>
    col.key === 'name' || visibleCols[col.key]
  );

  return (
    <div className="border-b border-[#f5f3f0] dark:border-white/10 bg-white dark:bg-[#1c1c1b] flex-shrink-0">
      <div style={gridStyle}>
        <div className={CELL}>
          <input
            type="checkbox"
            checked={allSelected}
            onChange={onToggleAll}
            className="w-3.5 h-3.5 rounded border-[#ccc] dark:border-white/20 cursor-pointer accent-[#1a1a1a] dark:accent-white"
          />
        </div>
        {visibleHeaders.map(col => {
          // Name col: checkbox(40px) + pl-3 + avatar(w-6=24px) + gap-2.5(10px) = offset ~46px from cell start
          // Other cols: data uses px-3 (12px left pad)
          const isName = col.key === 'name';
          return (
            <button
              key={col.key}
              onClick={() => onSort(col.key)}
              className={`relative flex items-center py-2.5 text-[11px] font-medium text-[#888] dark:text-white/30 hover:text-[#333] dark:hover:text-white/60 transition-colors text-left group w-full ${
                isName ? 'pl-[58px] pr-2' : 'pl-2.5 pr-3'
              }`}
            >
              <span>{col.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}