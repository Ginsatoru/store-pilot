import React, { useState } from 'react';
import { RiCloseLine } from 'react-icons/ri';
import ImportUpload from './ImportUpload.jsx';
import ImportFields, { IMPORTABLE_FIELDS } from './ImportFields.jsx';
import ImportPreview from './ImportPreview.jsx';
import ImportDone from './ImportDone.jsx';

// ── CSV parsing utils ────────────────────────────────────────────────────────

function normalizeSku(val) {
  if (!val) return '';
  const s = val.trim();
  const m = s.match(/^=["'](.+)["']$/) || s.match(/^="(.+)"$/) || s.match(/^='(.+)'$/);
  if (m) return m[1].trim();
  return s;
}

function isValidBarcode(barcode) {
  const str = String(barcode).trim();
  if (!str) return false;
  if (/^\d+(\.\d+)?e[+\-]?\d+$/i.test(str)) return false;
  return /^[a-zA-Z0-9-]+$/.test(str);
}

function tokenizeCSV(text) {
  const rows = [];
  let cur = '';
  let inQuote = false;
  let cols = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuote) {
      if (ch === '"' && next === '"') { cur += '"'; i++; }
      else if (ch === '"') { inQuote = false; }
      else { cur += ch; }
    } else {
      if (ch === '"') { inQuote = true; }
      else if (ch === ',') { cols.push(cur); cur = ''; }
      else if (ch === '\r' && next === '\n') {
        cols.push(cur); cur = ''; rows.push(cols); cols = []; i++;
      } else if (ch === '\n') {
        cols.push(cur); cur = ''; rows.push(cols); cols = [];
      } else { cur += ch; }
    }
  }

  if (cur || cols.length > 0) { cols.push(cur); rows.push(cols); }
  return rows;
}

function parseCSV(text) {
  const allRows = tokenizeCSV(text.trim());
  if (allRows.length < 2) throw new Error('CSV must have a header row and at least one data row.');

  const headers = allRows[0].map(h => h.trim().toLowerCase());
  const get = (cols, key) => {
    const idx = headers.indexOf(key);
    return idx !== -1 ? (cols[idx] || '').trim() : '';
  };

  const rows = [];
  for (let i = 1; i < allRows.length; i++) {
    const cols = allRows[i];
    if (cols.length < 2) continue;
    const name = get(cols, 'name');
    if (!name) continue;

    rows.push({
      _row_number: i + 1,
      name,
      sku:               normalizeSku(get(cols, 'sku') || get(cols, 'barcode') || get(cols, 'code') || ''),
      category:          get(cols, 'category') || 'Uncategorized',
      regular_price:     get(cols, 'regular_price') || get(cols, 'price') || '',
      sale_price:        get(cols, 'sale_price') || '',
      stock:             get(cols, 'stock') || get(cols, 'stock_quantity') || '',
      stock_status:      get(cols, 'stock_status') || 'instock',
      status:            (get(cols, 'status') || '').toLowerCase() === 'live' ? 'Live' : 'Draft',
      weight:            get(cols, 'weight') || '',
      short_description: get(cols, 'short_description') || '',
      description:       get(cols, 'description') || '',
    });
  }

  if (rows.length === 0) throw new Error('No valid rows found in CSV.');
  return rows;
}

function validateRows(rows) {
  const seen = new Set();
  const validRows = [];
  const errors = [];

  for (const row of rows) {
    const sku = row.sku;
    if (!isValidBarcode(sku)) {
      errors.push({ row: row._row_number, sku: sku || '(empty)', reason: 'Invalid barcode format' });
      continue;
    }
    if (seen.has(sku)) {
      errors.push({ row: row._row_number, sku, reason: 'Duplicate barcode in file' });
      continue;
    }
    seen.add(sku);
    validRows.push(row);
  }

  return { validRows, errors };
}

// ── Modal shell ──────────────────────────────────────────────────────────────

export default function ImportModal({ onImport, onClose, productList = [] }) {
  const [stage, setStage]               = useState('upload');
  const [parsed, setParsed]             = useState([]);
  const [fileName, setFileName]         = useState('');
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting]       = useState(false);
  const [progress, setProgress]         = useState({ done: 0, total: 0 });
  const [selectedFields, setSelectedFields] = useState(
    new Set(IMPORTABLE_FIELDS.map(f => f.key))
  );

  const { validRows, errors: validationErrors } = validateRows(parsed);
  const resolvedRows = validRows.map(row => ({
    ...row,
    _match: productList.find(p => p.sku && p.sku === row.sku) || null,
  }));
  const matchCount  = resolvedRows.filter(r => r._match).length;
  const createCount = resolvedRows.length - matchCount;
  const failedCount = validationErrors.length;

  const handleFileParsed = (text, name) => {
    const rows = parseCSV(text);
    setParsed(rows);
    setFileName(name);
    setStage('fields');
  };

  const handleToggleField = (key) => {
    setSelectedFields(prev => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); } else { next.add(key); }
      return next;
    });
  };

  const handleToggleAll = () => {
    if (selectedFields.size === IMPORTABLE_FIELDS.length) {
      setSelectedFields(new Set());
    } else {
      setSelectedFields(new Set(IMPORTABLE_FIELDS.map(f => f.key)));
    }
  };

  const handleConfirm = async () => {
    setImporting(true);
    setProgress({ done: 0, total: resolvedRows.length });

    try {
      const result = await onImport(resolvedRows, Array.from(selectedFields), (done, total) => {
        setProgress({ done, total });
      });

      setImportResult({
        created: result?.created ?? createCount,
        updated: result?.updated ?? matchCount,
        failed:  failedCount,
        errors:  validationErrors,
      });
      setStage('done');
    } finally {
      setImporting(false);
    }
  };

  const handleBack = () => {
    if (stage === 'fields') {
      setParsed([]);
      setFileName('');
      setSelectedFields(new Set(IMPORTABLE_FIELDS.map(f => f.key)));
      setStage('upload');
    } else if (stage === 'preview') {
      setStage('fields');
    }
  };

  const SUBTITLE = {
    upload:  'Upload a CSV file',
    fields:  `${parsed.length} rows found · configure import`,
    preview: `Preview · ${matchCount} update · ${createCount} create${failedCount > 0 ? ` · ${failedCount} invalid` : ''}`,
    done:    'Import complete',
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50 flex items-center justify-center p-6">
      <div className="bg-white dark:bg-[#1c1c1b] rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/10 flex-shrink-0">
          <div>
            <h2 className="text-[13px] font-semibold text-[#1a1a1a] dark:text-white">Import Products</h2>
            <span className="text-[10px] text-[#666] dark:text-white/60">{SUBTITLE[stage]}</span>
          </div>
          <button
            onClick={onClose}
            disabled={importing}
            className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-white/10 hover:bg-[#1a1a1a] dark:hover:bg-white hover:text-white dark:hover:text-[#1a1a1a] flex items-center justify-center text-[#777] dark:text-white/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RiCloseLine size={15} />
          </button>
        </div>

        {/* Body + Footer (each stage owns its footer) */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
          {stage === 'upload' && (
            <ImportUpload onFileParsed={handleFileParsed} onClose={onClose} />
          )}
          {stage === 'fields' && (
            <ImportFields
              parsedCount={parsed.length}
              selectedFields={selectedFields}
              onToggleField={handleToggleField}
              onToggleAll={handleToggleAll}
              onBack={handleBack}
              onNext={() => setStage('preview')}
            />
          )}
          {stage === 'preview' && (
            <ImportPreview
              resolvedRows={resolvedRows}
              selectedFields={selectedFields}
              validationErrors={validationErrors}
              onBack={handleBack}
              onConfirm={handleConfirm}
              importing={importing}
              progress={progress}
            />
          )}
          {stage === 'done' && importResult && (
            <ImportDone
              importResult={importResult}
              fileName={fileName}
              onClose={onClose}
            />
          )}
        </div>

      </div>
    </div>
  );
}