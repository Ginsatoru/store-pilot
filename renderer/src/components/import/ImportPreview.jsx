import React from 'react';
import { RiErrorWarningLine } from 'react-icons/ri';
import { IMPORTABLE_FIELDS } from './ImportFields.jsx';

export default function ImportPreview({ resolvedRows, selectedFields, validationErrors, onBack, onConfirm, importing, progress }) {
  const matchCount  = resolvedRows.filter(r => r._match).length;
  const createCount = resolvedRows.length - matchCount;
  const failedCount = validationErrors.length;

  const pct = progress.total > 0 ? Math.min(Math.round((progress.done / progress.total) * 100), 100) : 0;

  return (
    <>
      <div className="flex flex-col gap-3 flex-1">
        <div className={`grid gap-2 ${failedCount > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <div className="rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/8 px-3 py-2.5">
            <p className="text-[10px] font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider">Update</p>
            <p className="text-[18px] font-bold text-[#1a1a1a] dark:text-white">{matchCount}</p>
            <p className="text-[10px] text-[#888] dark:text-white/40">existing products</p>
          </div>
          <div className="rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/8 px-3 py-2.5">
            <p className="text-[10px] font-semibold text-emerald-500 dark:text-emerald-400 uppercase tracking-wider">Create</p>
            <p className="text-[18px] font-bold text-[#1a1a1a] dark:text-white">{createCount}</p>
            <p className="text-[10px] text-[#888] dark:text-white/40">new products</p>
          </div>
          {failedCount > 0 && (
            <div className="rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/8 px-3 py-2.5">
              <p className="text-[10px] font-semibold text-red-500 dark:text-red-400 uppercase tracking-wider">Invalid</p>
              <p className="text-[18px] font-bold text-[#1a1a1a] dark:text-white">{failedCount}</p>
              <p className="text-[10px] text-[#888] dark:text-white/40">will be skipped</p>
            </div>
          )}
        </div>

        <div className="rounded-xl bg-gray-50 dark:bg-white/5 px-3 py-2.5 flex flex-col gap-1.5">
          <p className="text-[10px] font-semibold text-[#444] dark:text-white/60 uppercase tracking-wider">Importing fields</p>
          <div className="flex flex-wrap gap-1">
            {IMPORTABLE_FIELDS.filter(f => selectedFields.has(f.key)).map(f => (
              <span key={f.key} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a]">
                {f.label}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-white/10">
          <div className="grid grid-cols-[1fr_1fr_80px] bg-gray-50 dark:bg-white/5 px-3 py-2 border-b border-gray-100 dark:border-white/10">
            {['Name', 'SKU', 'Action'].map(h => (
              <span key={h} className="text-[10px] font-semibold text-[#444] dark:text-white/60 uppercase tracking-wider">{h}</span>
            ))}
          </div>
          {resolvedRows.slice(0, 6).map((row, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_80px] px-3 py-2 border-b border-gray-50 dark:border-white/5 last:border-0 items-center">
              <span className="text-[11px] font-medium text-[#1a1a1a] dark:text-white/80 truncate pr-2">{row.name}</span>
              <span className="text-[11px] font-mono text-[#555] dark:text-white/60 truncate pr-2">{row.sku}</span>
              <span className={`text-[10px] font-semibold w-fit ${
                row._match ? 'text-blue-500 dark:text-blue-400' : 'text-emerald-500 dark:text-emerald-400'
              }`}>
                {row._match ? 'Update' : 'Create'}
              </span>
            </div>
          ))}
          {resolvedRows.length > 6 && (
            <div className="px-3 py-2 bg-gray-50 dark:bg-white/5">
              <span className="text-[10px] text-[#555] dark:text-white/50">+{resolvedRows.length - 6} more rows</span>
            </div>
          )}
        </div>

        {failedCount > 0 && (
          <div className="rounded-xl border border-gray-100 dark:border-white/10 overflow-hidden">
            <div className="bg-gray-50 dark:bg-white/5 px-3 py-2 border-b border-gray-100 dark:border-white/10 flex items-center gap-2">
              <RiErrorWarningLine size={12} className="text-red-500 dark:text-red-400 flex-shrink-0" />
              <span className="text-[10px] font-semibold text-[#444] dark:text-white/60 uppercase tracking-wider">
                {failedCount} invalid {failedCount === 1 ? 'row' : 'rows'} will be skipped
              </span>
            </div>
            {validationErrors.slice(0, 4).map((e, i) => (
              <div key={i} className="grid grid-cols-[48px_1fr_1fr] px-3 py-2 border-b border-gray-50 dark:border-white/5 last:border-0 items-center">
                <span className="text-[10px] font-mono text-[#aaa] dark:text-white/30">#{e.row}</span>
                <span className="text-[11px] font-mono text-[#555] dark:text-white/60 truncate pr-2">{e.sku}</span>
                <span className="text-[10px] text-red-500 dark:text-red-400 truncate">{e.reason}</span>
              </div>
            ))}
            {validationErrors.length > 4 && (
              <div className="px-3 py-2 bg-gray-50 dark:bg-white/5">
                <span className="text-[10px] text-[#888] dark:text-white/40">+{validationErrors.length - 4} more · download the error log after import</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 mt-auto">
        <button
          onClick={onBack}
          disabled={importing}
          className="text-[12px] font-medium text-[#444] dark:text-white/60 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl px-4 py-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Back
        </button>

        {importing ? (
          <div className="flex-1 flex flex-col justify-center gap-1.5 bg-[#1a1a1a] dark:bg-white rounded-xl px-4 py-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-white dark:text-[#1a1a1a]">Importing…</span>
              <span className="text-[11px] font-mono font-semibold text-white/70 dark:text-[#1a1a1a]/60">{pct}%</span>
            </div>
            <div className="w-full h-1 rounded-full bg-white/20 dark:bg-black/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-white dark:bg-[#1a1a1a] transition-all duration-300 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        ) : (
          <button
            onClick={onConfirm}
            disabled={resolvedRows.length === 0}
            className="flex-1 flex items-center justify-center gap-1.5 text-[12px] font-semibold bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a] rounded-xl py-2 hover:bg-black dark:hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {failedCount > 0 ? `Import ${resolvedRows.length} valid rows` : 'Confirm Import'}
          </button>
        )}
      </div>
    </>
  );
}