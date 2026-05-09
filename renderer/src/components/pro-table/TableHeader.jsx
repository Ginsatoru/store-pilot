import React from 'react';
import { RiArrowUpLine, RiArrowDownLine } from 'react-icons/ri';
import { GRID_STYLE, CELL, COL_HEADERS } from './tableUtils';

export default function TableHeader({
  products, selected, sortField, sortDir,
  onToggleAll, onSort,
}) {
  const allSelected = products.length > 0 && selected.size === products.length;

  return (
    <div className="border-b border-[#f5f3f0] dark:border-white/10 bg-white dark:bg-[#1c1c1b] flex-shrink-0">
      <div style={GRID_STYLE}>
        <div className={CELL}>
          <input
            type="checkbox"
            checked={allSelected}
            onChange={onToggleAll}
            className="w-3.5 h-3.5 rounded border-[#ccc] dark:border-white/20 cursor-pointer accent-[#1a1a1a] dark:accent-white"
          />
        </div>
        {COL_HEADERS.map(col => (
          <button
            key={col.key}
            onClick={() => onSort(col.key)}
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
  );
}