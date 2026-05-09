import React, { useRef, useState } from 'react';
import { RiUploadCloud2Line, RiErrorWarningLine } from 'react-icons/ri';

export default function ImportUpload({ onFileParsed, onClose }) {
  const [dragging, setDragging] = useState(false);
  const [error, setError]       = useState(null);
  const fileRef = useRef();

  const handleFile = (file) => {
    if (!file) return;
    if (!file.name.endsWith('.csv')) { setError('Please select a .csv file.'); return; }
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        onFileParsed(e.target.result, file.name);
      } catch (err) {
        setError(err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  return (
    <>
      {error && (
        <div className="flex items-start gap-2 text-[12px] text-red-600 bg-red-50 dark:bg-red-950/50 dark:text-red-400 rounded-xl px-3 py-2.5">
          <RiErrorWarningLine size={14} className="flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`w-full aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
          dragging
            ? 'border-[#1a1a1a] dark:border-white bg-gray-100 dark:bg-white/10'
            : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:border-gray-400 dark:hover:border-white/20 hover:bg-gray-100 dark:hover:bg-white/10'
        }`}
      >
        <RiUploadCloud2Line size={28} className="text-gray-400 dark:text-white/20" />
        <span className="text-[12px] font-medium text-[#444] dark:text-white/70">
          {dragging ? 'Drop to upload' : 'Click or drag and drop a CSV file'}
        </span>
        <span className="text-[11px] text-[#666] dark:text-white/50">Only .csv format supported</span>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
      </div>

      <div className="rounded-xl bg-gray-50 dark:bg-white/5 px-4 py-3 flex flex-col gap-2">
        <p className="text-[10px] font-semibold text-[#444] dark:text-white/60 uppercase tracking-wider">Supported columns</p>
        <div className="flex flex-wrap gap-1.5">
          {['sku / barcode / code *', 'name **', 'category', 'regular_price', 'sale_price', 'stock', 'stock_status', 'status', 'weight', 'short_description', 'description'].map(c => (
            <span key={c} className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${c.includes('*') ? 'bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a] font-semibold' : 'bg-gray-200 dark:bg-white/15 text-[#333] dark:text-white/70'}`}>
              {c}
            </span>
          ))}
        </div>
        <p className="text-[10px] text-[#555] dark:text-white/50">* Matched by SKU only. Rows with a matching SKU update, all others create new products.</p>
        <p className="text-[10px] text-[#555] dark:text-white/50">** Required. SKU must be alphanumeric (hyphens allowed). Excel scientific notation will be rejected.</p>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 mt-auto">
        <button onClick={onClose} className="flex-1 text-[12px] font-medium text-[#444] dark:text-white/60 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl py-2 transition-colors">
          Cancel
        </button>
        <button onClick={() => fileRef.current?.click()} className="flex-1 flex items-center justify-center gap-1.5 text-[12px] font-semibold bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a] rounded-xl py-2 hover:bg-black dark:hover:bg-white/90 transition-colors">
          Select File
        </button>
      </div>
    </>
  );
}