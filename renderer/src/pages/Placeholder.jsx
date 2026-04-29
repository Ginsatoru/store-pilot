import React from 'react';

export default function Placeholder({ title }) {
  return (
    <div className="flex-1 flex flex-col min-h-0 px-5 pb-3">
      <h1 className="text-[28px] font-bold text-[#1a1a1a] dark:text-white tracking-tight pt-4 pb-3">{title}</h1>
      <div className="flex-1 bg-white dark:bg-[#1c1c1b] rounded-xl border border-[#ddd9d2] dark:border-white/10 flex items-center justify-center">
        <div className="text-center text-[#ccc]">
          <p className="text-[13px] text-[#999] dark:text-white/30 font-medium">{title} coming soon</p>
          <p className="text-[11px] text-[#bbb] dark:text-white/20 mt-1">This section is under construction</p>
        </div>
      </div>
    </div>
  );
}