import React, { useRef, useEffect } from 'react';
import {
  RiRefreshLine, RiDeleteBinLine, RiCheckLine,
  RiCheckboxCircleLine, RiCloseCircleLine, RiInformationLine,
  RiUploadCloud2Line, RiFileList3Line, RiImageLine,
  RiAddLine, RiEditLine, RiDeleteBin2Line, RiTimeLine,
} from 'react-icons/ri';

export default function Sync({
  syncing, syncLog, setSyncLog,
  pendingQueue, productList,
  onSyncNow, onRemoveFromQueue, onClearQueue,
  syncSettings, online,
}) {
  const logRef = useRef(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [syncLog]);

  const pendingEntries = Object.entries(pendingQueue || {});

  const handleClearAll = () => {
    if (!confirm('Discard all pending changes? This cannot be undone.')) return;
    onClearQueue();
  };

  const handleSyncNow = () => {
    if (!online) return;
    onSyncNow();
  };

  return (
    <div className="flex-1 overflow-hidden px-5 pb-5 pt-2 flex flex-col gap-4">
      <div className="flex-shrink-0">
        <h1 className="text-[28px] font-bold tracking-tight text-[#1a1a1a] dark:text-white leading-none">Synchronization</h1>
      </div>

      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-[#1a1a1a] dark:text-white/80">Pending Changes</span>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            pendingEntries.length > 0 ? 'bg-yellow-100 dark:bg-yellow-400/15 text-yellow-700 dark:text-yellow-400' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
          }`}>
            {pendingEntries.length}
          </span>
          {syncSettings?.autoSync && (
            <span className="text-[11px] text-[#aaa] dark:text-white/30 flex items-center gap-1">
              <RiTimeLine size={11} /> Auto sync every {syncSettings.interval}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {pendingEntries.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-[12px] font-medium text-gray-500 dark:text-white/40 bg-gray-100 dark:bg-white/10 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-600 dark:hover:text-red-400 px-4 py-2 rounded-xl transition-colors"
            >
              Clear All
            </button>
          )}
          <button
            onClick={handleSyncNow}
            disabled={syncing || !online}
            title={!online ? 'You are offline' : undefined}
            className="flex items-center gap-1.5 text-[12px] font-medium bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/40 px-4 py-2 rounded-xl hover:bg-[#1a1a1a] dark:hover:bg-white hover:text-white dark:hover:text-[#1a1a1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RiRefreshLine size={13} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex gap-4">
        {/* Queue */}
        <div className="flex flex-col gap-2 w-52 flex-shrink-0 overflow-y-auto">
          {pendingEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center py-16">
              <RiCheckLine size={24} className="text-[#bbb] dark:text-white/20" />
              <p className="text-[12px] font-medium text-[#888] dark:text-white/35">All synced</p>
              <p className="text-[11px] text-[#bbb] dark:text-white/20">No pending changes.</p>
            </div>
          ) : (
            pendingEntries.map(([key, item]) => (
              <div key={key} className="bg-gray-100 dark:bg-white/10 rounded-xl px-3.5 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-200 dark:bg-white/10 flex-shrink-0 flex items-center justify-center">
                  {item.imagePreview
                    ? <img src={item.imagePreview} alt="" className="w-full h-full object-cover" />
                    : item.product?.localPreview || item.product?._raw?.images?.[0]?.src
                      ? <img src={item.product.localPreview || item.product._raw.images[0].src} alt="" className="w-full h-full object-cover" />
                      : <RiImageLine size={14} className="text-gray-300 dark:text-white/20" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-[#1a1a1a] dark:text-white/80 truncate">{item.product?.name}</p>
                  <ActionBadge action={item.action} hasImage={!!item.imagePreview} />
                </div>
                <button
                  onClick={() => onRemoveFromQueue(key)}
                  className="w-6 h-6 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-500 dark:hover:text-red-400 text-[#ccc] dark:text-white/20 flex items-center justify-center transition-colors flex-shrink-0"
                >
                  <RiDeleteBinLine size={13} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Log */}
        <div className="flex-1 bg-white dark:bg-[#1c1c1b] rounded-xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <RiFileList3Line size={13} className="text-[#888] dark:text-white/30" />
              <span className="text-[12px] font-medium text-[#555] dark:text-white/50">Sync Log</span>
              {syncLog.length > 0 && (
                <span className="text-[10px] text-[#aaa] dark:text-white/25 font-medium">{syncLog.length} entries</span>
              )}
            </div>
            {syncLog.length > 0 && (
              <button onClick={() => setSyncLog([])} className="text-[11px] text-[#aaa] dark:text-white/30 hover:text-[#555] dark:hover:text-white/60 transition-colors">
                Clear
              </button>
            )}
          </div>

          <div ref={logRef} className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-1.5">
            {syncLog.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                <RiFileList3Line size={28} className="text-[#ccc] dark:text-white/15" />
                <p className="text-[12px] text-[#bbb] dark:text-white/25">No log yet. Press Sync Now to start.</p>
              </div>
            ) : (
              syncLog.map((entry, i) => <LogRow key={i} entry={entry} />)
            )}
            {syncing && (
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40">
                <RiRefreshLine size={13} className="animate-spin text-blue-400 flex-shrink-0" />
                <span className="text-[12px] text-blue-500 dark:text-blue-400 font-medium">Processing...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionBadge({ action, hasImage }) {
  const map = {
    update: { label: 'Update', cls: 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400',            Icon: RiEditLine       },
    create: { label: 'Create', cls: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400', Icon: RiAddLine        },
    delete: { label: 'Delete', cls: 'bg-red-50 dark:bg-red-950/50 text-red-500 dark:text-red-400',                Icon: RiDeleteBin2Line },
  };
  const { label, cls, Icon } = map[action] || { label: action, cls: 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/40', Icon: RiInformationLine };
  return (
    <div className="flex items-center gap-1 mt-0.5">
      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-lg flex items-center gap-0.5 ${cls}`}>
        <Icon size={9} />{label}
      </span>
      {hasImage && (
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-lg bg-yellow-50 dark:bg-yellow-400/15 text-yellow-600 dark:text-yellow-400 flex items-center gap-0.5">
          <RiUploadCloud2Line size={9} />Img
        </span>
      )}
    </div>
  );
}

function LogRow({ entry }) {
  const styles = {
    ok:   { bg: 'bg-emerald-50 dark:bg-emerald-950/40',  text: 'text-emerald-700 dark:text-emerald-400', sub: 'text-emerald-500 dark:text-emerald-500', Icon: RiCheckboxCircleLine },
    err:  { bg: 'bg-red-50 dark:bg-red-950/40',          text: 'text-red-700 dark:text-red-400',         sub: 'text-red-400',                           Icon: RiCloseCircleLine    },
    info: { bg: 'bg-gray-100 dark:bg-white/10',          text: 'text-[#555] dark:text-white/60',         sub: 'text-[#aaa] dark:text-white/25',          Icon: RiInformationLine    },
  };
  const isUpload = entry.msg?.toLowerCase().includes('upload');
  const { bg, text, sub, Icon } = styles[entry.type] || styles.info;
  const RowIcon = isUpload && entry.type === 'info' ? RiUploadCloud2Line : Icon;
  return (
    <div className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl ${bg}`}>
      <RowIcon size={13} className={`${sub} flex-shrink-0 mt-0.5`} />
      <p className={`flex-1 text-[12px] font-medium ${text} leading-snug`}>{entry.msg}</p>
      <span className="text-[10px] text-[#aaa] dark:text-white/25 font-mono flex-shrink-0 mt-0.5">{entry.time}</span>
    </div>
  );
}