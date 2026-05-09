import React from 'react';
import { RiCheckLine, RiDownloadLine } from 'react-icons/ri';

function downloadErrorLog(errors, fileName) {
  const lines = [
    `Import Error Log`,
    `Source file: ${fileName}`,
    `Generated: ${new Date().toLocaleString()}`,
    `Total failed rows: ${errors.length}`,
    ``,
    `Row\tSKU\tReason`,
    ...errors.map(e => `${e.row}\t${e.sku}\t${e.reason}`),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `import-errors-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ImportDone({ importResult, fileName, onClose }) {
  return (
    <>
      <div className="flex flex-col gap-4 flex-1">
        <div className={`grid gap-2 ${importResult.failed > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <div className="rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/8 px-3 py-3 text-center">
            <p className="text-[10px] font-semibold text-emerald-500 dark:text-emerald-400 uppercase tracking-wider">Created</p>
            <p className="text-[22px] font-bold text-[#1a1a1a] dark:text-white">{importResult.created}</p>
          </div>
          <div className="rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/8 px-3 py-3 text-center">
            <p className="text-[10px] font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider">Updated</p>
            <p className="text-[22px] font-bold text-[#1a1a1a] dark:text-white">{importResult.updated}</p>
          </div>
          {importResult.failed > 0 && (
            <div className="rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/8 px-3 py-3 text-center">
              <p className="text-[10px] font-semibold text-red-500 dark:text-red-400 uppercase tracking-wider">Failed</p>
              <p className="text-[22px] font-bold text-[#1a1a1a] dark:text-white">{importResult.failed}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-1 py-2">
          <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center">
            <RiCheckLine size={20} className="text-[#1a1a1a] dark:text-white" />
          </div>
          <p className="text-[13px] font-semibold text-[#1a1a1a] dark:text-white mt-1">Import complete</p>
          <p className="text-[11px] text-[#555] dark:text-white/55">Sync when ready to push changes to WooCommerce.</p>
        </div>

        {importResult.failed > 0 && (
          <button
            onClick={() => downloadErrorLog(importResult.errors, fileName)}
            className="flex items-center justify-center gap-2 w-full text-[12px] font-medium text-[#444] dark:text-white/60 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl py-2.5 transition-colors"
          >
            <RiDownloadLine size={14} />
            Download error log ({importResult.failed} failed {importResult.failed === 1 ? 'row' : 'rows'})
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto">
        <button onClick={onClose} className="w-full text-[12px] font-semibold bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a] rounded-xl py-2 hover:bg-black dark:hover:bg-white/90 transition-colors">
          Done
        </button>
      </div>
    </>
  );
}