import React from 'react';

function StatCard({ label, value, percent, color, barColor, showBar = false }) {
  return (
    <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm p-4 flex flex-col gap-2 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 dark:text-white/40">{label}</span>
        {percent !== undefined && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: color + '18', color }}>
            {percent}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-slate-800 dark:text-white/80">{value}</div>
      {showBar && (
        <div className="h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${percent}%`, background: barColor }}
          />
        </div>
      )}
    </div>
  );
}

export default function StatsCards({ stats }) {
  const publishedPct = Math.round((stats.published / stats.total) * 100);
  const draftPct     = Math.round((stats.draft     / stats.total) * 100);

  return (
    <div className="grid grid-cols-4 gap-3">
      <StatCard label="Published" value={stats.published} percent={publishedPct} color="#2563eb" barColor="#2563eb" showBar />
      <StatCard label="Draft"     value={stats.draft}     percent={draftPct}     color="#f59e0b" barColor="#f59e0b" showBar />
      <StatCard label="In Stock"  value={stats.inStock}   percent={0}            color="#10b981" barColor="#10b981" showBar />
      <StatCard label="Low Stock" value={stats.lowStock}  percent={0}            color="#ef4444" barColor="#ef4444" showBar />
    </div>
  );
}