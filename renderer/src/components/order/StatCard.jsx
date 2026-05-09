import React from 'react';

export function StatCard({ label, value, icon: Icon, accent = 'text-[#1a1a1a] dark:text-white/80' }) {
  return (
    <div className="flex-1 bg-white dark:bg-white/5 rounded-xl px-4 py-3 flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
        <Icon size={14} className="text-[#888] dark:text-white/40" />
      </div>
      <div>
        <p className="text-[10px] font-semibold text-[#aaa] dark:text-white/30 uppercase tracking-wider">{label}</p>
        <p className={`text-[16px] font-bold leading-tight ${accent}`}>{value}</p>
      </div>
    </div>
  );
}