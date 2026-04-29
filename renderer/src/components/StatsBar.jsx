import React from 'react';

function StatBlock({ label, value, total, loading, dark, yellow }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] text-[#999] dark:text-white/30">{label}</span>
      <div className="flex items-center gap-2">
        {dark && (
          loading ? (
            <div className="w-10 h-5 rounded-xl bg-[#ddd9d2] dark:bg-white/10 animate-pulse" />
          ) : (
            <span className="text-[11px] font-semibold bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a] px-2.5 py-0.5 rounded-xl">
              {pct}%
            </span>
          )
        )}
        {yellow && (
          loading ? (
            <div className="w-32 h-5 rounded-xl bg-[#ddd9d2] dark:bg-white/10 animate-pulse" />
          ) : (
            <div className="relative w-32 h-5 rounded-xl bg-[#ddd9d2] dark:bg-white/10 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-yellow-300 dark:bg-yellow-400 rounded-xl transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-start pl-2 text-[10px] font-semibold text-[#555] dark:text-white/60">
                {pct}%
              </span>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default function StatsBar({ stats, loading }) {
  const total = stats.total || 1;

  return (
    <div className="flex items-end justify-between py-2">
      <div className="flex items-center gap-8">
        <div className="flex items-start gap-4">
          <StatBlock label="Published" value={stats.published} total={total} loading={loading} dark />
          <StatBlock label="Draft"     value={stats.draft}     total={total} loading={loading} yellow />
        </div>
        <div className="w-px h-8 bg-[#ddd9d2] dark:bg-white/10" />
        <div className="flex items-start gap-4">
          <StatBlock label="In Stock"  value={stats.inStock}  total={total} loading={loading} dark />
          <StatBlock label="Low Stock" value={stats.lowStock} total={total} loading={loading} yellow />
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {['Directory', 'Org Chart', 'Insights'].map(btn => (
          <button
            key={btn}
            className="flex items-center gap-1.5 text-[12px] font-medium text-[#555] dark:text-white/50 bg-white dark:bg-white/10 rounded-xl px-3 py-1.5 hover:bg-[#1a1a1a] dark:hover:bg-white hover:text-white dark:hover:text-[#1a1a1a] transition-all duration-150"
          >
            {btn}
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
              <path d="M2 3.5L4.5 6 7 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}