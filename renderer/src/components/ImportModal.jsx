import React, { useState, useRef } from 'react';
import { RiCloseLine, RiUploadCloud2Line, RiFileTextLine, RiCheckLine, RiErrorWarningLine } from 'react-icons/ri';

const REQUIRED_COLS = ['name'];
const OPTIONAL_COLS = ['category', 'price', 'stock', 'status', 'date'];
const ALL_COLS      = [...REQUIRED_COLS, ...OPTIONAL_COLS];

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row.');

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));

  const nameIdx = headers.indexOf('name');
  if (nameIdx === -1) throw new Error('CSV must contain a "Name" column.');

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // handle quoted fields
    const cols = [];
    let inQuote = false, cur = '';
    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === ',' && !inQuote) { cols.push(cur); cur = ''; }
      else { cur += ch; }
    }
    cols.push(cur);

    const get = (key) => {
      const idx = headers.indexOf(key);
      return idx !== -1 ? (cols[idx] || '').trim() : '';
    };

    const name = get('name');
    if (!name) continue;

    const status = get('status');
    const normalizedStatus = status.toLowerCase() === 'live' ? 'Live' : 'Draft';

    rows.push({
      name,
      category: get('category') || 'Uncategorized',
      price:    parseFloat(get('price'))  || 0,
      stock:    parseInt(get('stock'))    || 0,
      status:   normalizedStatus,
      date:     get('date') ? new Date(get('date')).toISOString() : new Date().toISOString(),
    });
  }

  if (rows.length === 0) throw new Error('No valid rows found in CSV.');
  return rows;
}

export default function ImportModal({ onImport, onClose }) {
  const [stage, setStage]       = useState('upload'); // upload | preview | done
  const [dragging, setDragging] = useState(false);
  const [error, setError]       = useState(null);
  const [parsed, setParsed]     = useState([]);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef();

  const handleFile = (file) => {
    if (!file) return;
    if (!file.name.endsWith('.csv')) { setError('Please select a .csv file.'); return; }
    setError(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const rows = parseCSV(e.target.result);
        setParsed(rows);
        setStage('preview');
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

  const handleConfirm = () => {
    onImport(parsed);
    setStage('done');
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50 flex items-center justify-center p-6">
      <div className="bg-white dark:bg-[#1c1c1b] rounded-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/10">
          <div>
            <h2 className="text-[13px] font-semibold text-[#1a1a1a] dark:text-white">Import Products</h2>
            <span className="text-[10px] text-[#aaa] dark:text-white/30">
              {stage === 'upload'  && 'Upload a CSV file'}
              {stage === 'preview' && `${parsed.length} products found in ${fileName}`}
              {stage === 'done'    && 'Import complete'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-white/10 hover:bg-[#1a1a1a] dark:hover:bg-white hover:text-white dark:hover:text-[#1a1a1a] flex items-center justify-center text-[#777] dark:text-white/50 transition-colors"
          >
            <RiCloseLine size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">

          {error && (
            <div className="flex items-start gap-2 text-[12px] text-red-600 bg-red-50 dark:bg-red-950/50 dark:text-red-400 rounded-xl px-3 py-2.5">
              <RiErrorWarningLine size={14} className="flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {stage === 'upload' && (
            <>
              {/* Drop zone */}
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
                <span className="text-[12px] font-medium text-[#777] dark:text-white/40">
                  {dragging ? 'Drop to upload' : 'Click or drag & drop a CSV file'}
                </span>
                <span className="text-[11px] text-[#aaa] dark:text-white/25">Only .csv format supported</span>
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
              </div>

              {/* Expected columns */}
              <div className="rounded-xl bg-gray-50 dark:bg-white/5 px-4 py-3 flex flex-col gap-2">
                <p className="text-[10px] font-semibold text-gray-400 dark:text-white/30 uppercase tracking-wider">Expected columns</p>
                <div className="flex flex-wrap gap-1.5">
                  {REQUIRED_COLS.map(c => (
                    <span key={c} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a] font-semibold">
                      {c} *
                    </span>
                  ))}
                  {OPTIONAL_COLS.map(c => (
                    <span key={c} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-white/40">
                      {c}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-[#bbb] dark:text-white/20">* Required. Status values: "Live" or "Draft".</p>
              </div>
            </>
          )}

          {stage === 'preview' && (
            <div className="flex flex-col gap-2">
              <p className="text-[11px] text-[#888] dark:text-white/30">Preview first 5 rows shown</p>
              <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-white/10">
                {/* Preview header */}
                <div className="grid grid-cols-4 bg-gray-50 dark:bg-white/5 px-3 py-2 border-b border-gray-100 dark:border-white/10">
                  {['Name', 'Category', 'Price', 'Status'].map(h => (
                    <span key={h} className="text-[10px] font-semibold text-gray-400 dark:text-white/30 uppercase tracking-wider">{h}</span>
                  ))}
                </div>
                {/* Preview rows */}
                {parsed.slice(0, 5).map((row, i) => (
                  <div key={i} className="grid grid-cols-4 px-3 py-2 border-b border-gray-50 dark:border-white/5 last:border-0">
                    <span className="text-[11px] text-[#1a1a1a] dark:text-white/80 truncate pr-2 font-medium">{row.name}</span>
                    <span className="text-[11px] text-[#777] dark:text-white/40 truncate pr-2">{row.category}</span>
                    <span className="text-[11px] font-mono text-[#555] dark:text-white/50">${row.price.toFixed(2)}</span>
                    <span className={`text-[11px] font-medium ${row.status === 'Live' ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#999] dark:text-white/30'}`}>
                      {row.status}
                    </span>
                  </div>
                ))}
                {parsed.length > 5 && (
                  <div className="px-3 py-2 bg-gray-50 dark:bg-white/5">
                    <span className="text-[10px] text-[#aaa] dark:text-white/25">+{parsed.length - 5} more rows</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-[#888] dark:text-white/30 mt-1">
                <RiFileTextLine size={12} />
                {parsed.length} products will be added to the pending queue
              </div>
            </div>
          )}

          {stage === 'done' && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center">
                <RiCheckLine size={22} className="text-emerald-500 dark:text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="text-[13px] font-semibold text-[#1a1a1a] dark:text-white">{parsed.length} products imported</p>
                <p className="text-[11px] text-[#aaa] dark:text-white/30 mt-0.5">Added to pending queue. Sync when ready</p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-6 py-4 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5">
          {stage === 'upload' && (
            <>
              <button onClick={onClose} className="flex-1 text-[12px] font-medium text-[#777] dark:text-white/40 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl py-2 transition-colors">
                Cancel
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-1.5 text-[12px] font-semibold bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a] rounded-xl py-2 hover:bg-black dark:hover:bg-white/90 transition-colors"
              >
                Select File
              </button>
            </>
          )}
          {stage === 'preview' && (
            <>
              <button
                onClick={() => { setStage('upload'); setParsed([]); setFileName(''); setError(null); }}
                className="text-[12px] font-medium text-[#777] dark:text-white/40 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl px-4 py-2 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 flex items-center justify-center gap-1.5 text-[12px] font-semibold bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a] rounded-xl py-2 hover:bg-black dark:hover:bg-white/90 transition-colors"
              >
                Import {parsed.length} Products
              </button>
            </>
          )}
          {stage === 'done' && (
            <button
              onClick={onClose}
              className="flex-1 text-[12px] font-semibold bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a] rounded-xl py-2 hover:bg-black dark:hover:bg-white/90 transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}