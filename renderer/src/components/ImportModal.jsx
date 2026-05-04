import React, { useState, useRef } from 'react';
import {
  RiCloseLine, RiUploadCloud2Line, RiFileTextLine,
  RiCheckLine, RiErrorWarningLine, RiRefreshLine,
} from 'react-icons/ri';

// All fields user can choose to import
const IMPORTABLE_FIELDS = [
  { key: 'name',              label: 'Name'              },
  { key: 'category',         label: 'Category'          },
  { key: 'regular_price',    label: 'Regular Price'     },
  { key: 'sale_price',       label: 'Sale Price'        },
  { key: 'stock',            label: 'Stock Qty'         },
  { key: 'stock_status',     label: 'Stock Status'      },
  { key: 'status',           label: 'Publish Status'    },
  { key: 'weight',           label: 'Weight'            },
  { key: 'short_description',label: 'Short Description' },
  { key: 'description',      label: 'Description'       },
];

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row.');

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

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

    rows.push({
      _raw_headers: headers,
      _raw_cols:    cols,
      name,
      sku:               get('sku') || get('barcode') || get('code') || '',
      category:          get('category') || 'Uncategorized',
      regular_price:     get('regular_price') || get('price') || '',
      sale_price:        get('sale_price') || '',
      stock:             get('stock') || get('stock_quantity') || '',
      stock_status:      get('stock_status') || 'instock',
      status:            (get('status') || '').toLowerCase() === 'live' ? 'Live' : 'Draft',
      weight:            get('weight') || '',
      short_description: get('short_description') || '',
      description:       get('description') || '',
    });
  }

  if (rows.length === 0) throw new Error('No valid rows found in CSV.');
  return { headers, rows };
}

export default function ImportModal({ onImport, onClose, productList = [] }) {
  const [stage, setStage]           = useState('upload');   // upload | fields | preview | done
  const [dragging, setDragging]     = useState(false);
  const [error, setError]           = useState(null);
  const [parsed, setParsed]         = useState([]);
  const [headers, setHeaders]       = useState([]);
  const [fileName, setFileName]     = useState('');
  const [barcodeCol, setBarcodeCol] = useState('');         // which CSV column is the barcode/SKU
  const [selectedFields, setSelectedFields] = useState(    // which fields to import
    new Set(IMPORTABLE_FIELDS.map(f => f.key))
  );
  const fileRef = useRef();

  const handleFile = (file) => {
    if (!file) return;
    if (!file.name.endsWith('.csv')) { setError('Please select a .csv file.'); return; }
    setError(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const { headers: h, rows } = parseCSV(e.target.result);
        setHeaders(h);
        setParsed(rows);
        // Auto-detect barcode column
        const autoBarcode = h.find(c => ['sku', 'barcode', 'code', 'upc', 'ean'].includes(c)) || '';
        setBarcodeCol(autoBarcode);
        setStage('fields');
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

  const toggleField = (key) => {
    setSelectedFields(prev => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); } else { next.add(key); }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedFields.size === IMPORTABLE_FIELDS.length) {
      setSelectedFields(new Set());
    } else {
      setSelectedFields(new Set(IMPORTABLE_FIELDS.map(f => f.key)));
    }
  };

  // Build final rows with match info for preview
  const resolvedRows = parsed.map(row => {
    const barcode = barcodeCol ? (row._raw_cols[row._raw_headers.indexOf(barcodeCol)] || '').trim() : row.sku;
    const match = barcode
      ? productList.find(p => p.sku === barcode || String(p.id) === barcode)
      : null;
    return { ...row, _barcode: barcode, _match: match };
  });

  const matchCount  = resolvedRows.filter(r => r._match).length;
  const createCount = resolvedRows.length - matchCount;

  const handleConfirm = () => {
    onImport(resolvedRows, Array.from(selectedFields), barcodeCol);
    setStage('done');
  };

  const reset = () => {
    setStage('upload');
    setParsed([]);
    setHeaders([]);
    setFileName('');
    setBarcodeCol('');
    setError(null);
    setSelectedFields(new Set(IMPORTABLE_FIELDS.map(f => f.key)));
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50 flex items-center justify-center p-6">
      <div className="bg-white dark:bg-[#1c1c1b] rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/10 flex-shrink-0">
          <div>
            <h2 className="text-[13px] font-semibold text-[#1a1a1a] dark:text-white">Import Products</h2>
            <span className="text-[10px] text-[#aaa] dark:text-white/30">
              {stage === 'upload'  && 'Upload a CSV file'}
              {stage === 'fields'  && `${parsed.length} rows found. configure import`}
              {stage === 'preview' && `Preview · ${matchCount} update · ${createCount} create`}
              {stage === 'done'    && 'Import complete'}
            </span>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-white/10 hover:bg-[#1a1a1a] dark:hover:bg-white hover:text-white dark:hover:text-[#1a1a1a] flex items-center justify-center text-[#777] dark:text-white/50 transition-colors">
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

          {/* ── Stage: Upload ──────────────────────────────────────────── */}
          {stage === 'upload' && (
            <>
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

              <div className="rounded-xl bg-gray-50 dark:bg-white/5 px-4 py-3 flex flex-col gap-2">
                <p className="text-[10px] font-semibold text-gray-400 dark:text-white/30 uppercase tracking-wider">Supported columns</p>
                <div className="flex flex-wrap gap-1.5">
                  {['sku / barcode', 'name *', 'category', 'regular_price', 'sale_price', 'stock', 'stock_status', 'status', 'weight', 'short_description', 'description'].map(c => (
                    <span key={c} className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${c.includes('*') ? 'bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a] font-semibold' : 'bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-white/40'}`}>
                      {c}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-[#bbb] dark:text-white/20">* Required. Products matched by barcode/SKU. matched rows update, unmatched rows create.</p>
              </div>
            </>
          )}

          {/* ── Stage: Fields ──────────────────────────────────────────── */}
          {stage === 'fields' && (
            <>
              {/* Barcode column picker */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-semibold text-gray-400 dark:text-white/30 uppercase tracking-wider">
                  Barcode / SKU column (for matching)
                </label>
                <select
                  value={barcodeCol}
                  onChange={e => setBarcodeCol(e.target.value)}
                  className="w-full text-[12px] rounded-xl px-3 py-2.5 outline-none border bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-[#1a1a1a] dark:text-white/80 focus:border-[#1a1a1a] dark:focus:border-white/30"
                >
                  <option value="">— No matching (always create) —</option>
                  {headers.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                <p className="text-[10px] text-[#bbb] dark:text-white/25">
                  If a CSV row's barcode matches an existing product's SKU, it will be updated instead of created.
                </p>
              </div>

              <div className="border-t border-gray-100 dark:border-white/10" />

              {/* Field selector */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-semibold text-gray-400 dark:text-white/30 uppercase tracking-wider">
                    Fields to import
                  </label>
                  <button onClick={toggleAll} className="text-[10px] text-[#aaa] dark:text-white/30 hover:text-[#555] dark:hover:text-white/60 transition-colors">
                    {selectedFields.size === IMPORTABLE_FIELDS.length ? 'Deselect all' : 'Select all'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {IMPORTABLE_FIELDS.map(f => {
                    const on = selectedFields.has(f.key);
                    return (
                      <button
                        key={f.key}
                        onClick={() => toggleField(f.key)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-colors ${
                          on
                            ? 'bg-[#1a1a1a] dark:bg-white border-[#1a1a1a] dark:border-white text-white dark:text-[#1a1a1a]'
                            : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/40 hover:border-gray-300 dark:hover:border-white/20'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0 border ${
                          on ? 'bg-white dark:bg-[#1a1a1a] border-transparent' : 'border-gray-300 dark:border-white/20'
                        }`}>
                          {on && <RiCheckLine size={9} className="text-[#1a1a1a] dark:text-white" />}
                        </span>
                        <span className="text-[11px] font-medium">{f.label}</span>
                      </button>
                    );
                  })}
                </div>
                {selectedFields.size === 0 && (
                  <p className="text-[11px] text-yellow-600 dark:text-yellow-400">Select at least one field to import.</p>
                )}
              </div>
            </>
          )}

          {/* ── Stage: Preview ─────────────────────────────────────────── */}
          {stage === 'preview' && (
            <div className="flex flex-col gap-3">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-blue-50 dark:bg-blue-950/40 px-3 py-2.5">
                  <p className="text-[10px] font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider">Update</p>
                  <p className="text-[18px] font-bold text-blue-600 dark:text-blue-400">{matchCount}</p>
                  <p className="text-[10px] text-blue-400 dark:text-blue-500">existing products</p>
                </div>
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2.5">
                  <p className="text-[10px] font-semibold text-emerald-500 dark:text-emerald-400 uppercase tracking-wider">Create</p>
                  <p className="text-[18px] font-bold text-emerald-600 dark:text-emerald-400">{createCount}</p>
                  <p className="text-[10px] text-emerald-400 dark:text-emerald-500">new products</p>
                </div>
              </div>

              {/* Fields being imported */}
              <div className="rounded-xl bg-gray-50 dark:bg-white/5 px-3 py-2.5 flex flex-col gap-1.5">
                <p className="text-[10px] font-semibold text-gray-400 dark:text-white/30 uppercase tracking-wider">Importing fields</p>
                <div className="flex flex-wrap gap-1">
                  {IMPORTABLE_FIELDS.filter(f => selectedFields.has(f.key)).map(f => (
                    <span key={f.key} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a]">
                      {f.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Row preview */}
              <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-white/10">
                <div className="grid grid-cols-[1fr_1fr_80px] bg-gray-50 dark:bg-white/5 px-3 py-2 border-b border-gray-100 dark:border-white/10">
                  {['Name', 'Barcode / SKU', 'Action'].map(h => (
                    <span key={h} className="text-[10px] font-semibold text-gray-400 dark:text-white/30 uppercase tracking-wider">{h}</span>
                  ))}
                </div>
                {resolvedRows.slice(0, 6).map((row, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_80px] px-3 py-2 border-b border-gray-50 dark:border-white/5 last:border-0 items-center">
                    <span className="text-[11px] font-medium text-[#1a1a1a] dark:text-white/80 truncate pr-2">{row.name}</span>
                    <span className="text-[11px] font-mono text-[#888] dark:text-white/40 truncate pr-2">{row._barcode || '—'}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg w-fit ${
                      row._match
                        ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
                        : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {row._match ? 'Update' : 'Create'}
                    </span>
                  </div>
                ))}
                {resolvedRows.length > 6 && (
                  <div className="px-3 py-2 bg-gray-50 dark:bg-white/5">
                    <span className="text-[10px] text-[#aaa] dark:text-white/25">+{resolvedRows.length - 6} more rows</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Stage: Done ────────────────────────────────────────────── */}
          {stage === 'done' && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center">
                <RiCheckLine size={22} className="text-emerald-500 dark:text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="text-[13px] font-semibold text-[#1a1a1a] dark:text-white">{parsed.length} products queued</p>
                <p className="text-[11px] text-[#888] dark:text-white/30 mt-0.5">
                  {matchCount > 0 && `${matchCount} updated · `}{createCount > 0 && `${createCount} created · `}Sync when ready.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-6 py-4 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex-shrink-0">
          {stage === 'upload' && (
            <>
              <button onClick={onClose} className="flex-1 text-[12px] font-medium text-[#777] dark:text-white/40 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl py-2 transition-colors">
                Cancel
              </button>
              <button onClick={() => fileRef.current?.click()} className="flex-1 flex items-center justify-center gap-1.5 text-[12px] font-semibold bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a] rounded-xl py-2 hover:bg-black dark:hover:bg-white/90 transition-colors">
                Select File
              </button>
            </>
          )}
          {stage === 'fields' && (
            <>
              <button onClick={reset} className="text-[12px] font-medium text-[#777] dark:text-white/40 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl px-4 py-2 transition-colors">
                Back
              </button>
              <button
                onClick={() => setStage('preview')}
                disabled={selectedFields.size === 0}
                className="flex-1 flex items-center justify-center gap-1.5 text-[12px] font-semibold bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a] rounded-xl py-2 hover:bg-black dark:hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Preview Import
              </button>
            </>
          )}
          {stage === 'preview' && (
            <>
              <button onClick={() => setStage('fields')} className="text-[12px] font-medium text-[#777] dark:text-white/40 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl px-4 py-2 transition-colors">
                Back
              </button>
              <button onClick={handleConfirm} className="flex-1 flex items-center justify-center gap-1.5 text-[12px] font-semibold bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a] rounded-xl py-2 hover:bg-black dark:hover:bg-white/90 transition-colors">
                Confirm Import
              </button>
            </>
          )}
          {stage === 'done' && (
            <button onClick={onClose} className="flex-1 text-[12px] font-semibold bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a] rounded-xl py-2 hover:bg-black dark:hover:bg-white/90 transition-colors">
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}