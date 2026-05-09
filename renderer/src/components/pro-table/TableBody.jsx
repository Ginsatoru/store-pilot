import React, { memo, useRef, useState, useEffect, useCallback } from 'react';
import { RiInboxLine } from 'react-icons/ri';
import {
  CELL, CELL_INNER,
  Avatar, StatusBadge, StockStatusBadge, TypeBadge,
  STOCK_STATUS_OPTIONS, STATUS_OPTIONS,
  buildGridStyle,
} from './tableUtils';

const ROW_HEIGHT = 48;
const OVERSCAN   = 5;

// ── Inline cell editors ───────────────────────────────────────────────────────

function TextCell({ value, onCommit, onNavigate, isDirty }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(value);
  const inputRef              = useRef(null);

  const start = (e) => { e.stopPropagation(); setDraft(value); setEditing(true); };

  useEffect(() => {
    if (editing) { inputRef.current?.focus(); inputRef.current?.select(); }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const trimmed = String(draft ?? '').trim();
    if (trimmed !== String(value ?? '').trim()) onCommit(trimmed);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); onNavigate?.('down'); }
    if (e.key === 'Tab')   { e.preventDefault(); commit(); onNavigate?.(e.shiftKey ? 'left' : 'right'); }
    if (e.key === 'Escape') { setEditing(false); setDraft(value); }
  };

  if (editing) {
    return (
      <input ref={inputRef} value={draft} onChange={e => setDraft(e.target.value)}
        onBlur={commit} onKeyDown={onKeyDown} onClick={e => e.stopPropagation()}
        className="w-full h-full px-3 text-[12px] bg-yellow-50 dark:bg-yellow-400/10 border border-yellow-300 dark:border-yellow-400/50 rounded outline-none text-[#1a1a1a] dark:text-white/80"
      />
    );
  }

  return (
    <div onDoubleClick={start} onClick={e => e.stopPropagation()}
      className={`w-full h-full flex items-center px-3 cursor-text rounded group ${isDirty ? 'bg-yellow-50 dark:bg-yellow-400/10' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}
      title="Double-click to edit">
      <span className={`text-[12px] truncate ${isDirty ? 'text-yellow-700 dark:text-yellow-300 font-medium' : 'text-[#1a1a1a] dark:text-white/80'}`}>
        {value || <span className="text-[#ccc] dark:text-white/15">—</span>}
      </span>
    </div>
  );
}

function NumberCell({ value, onCommit, onNavigate, isDirty, prefix, isInt }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState('');
  const inputRef              = useRef(null);

  const start = (e) => { e.stopPropagation(); setDraft(value != null && value !== 0 ? String(value) : ''); setEditing(true); };

  useEffect(() => {
    if (editing) { inputRef.current?.focus(); inputRef.current?.select(); }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const parsed = isInt ? parseInt(draft) : parseFloat(draft);
    const next   = isNaN(parsed) ? 0 : parsed;
    if (next !== value) onCommit(next);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); onNavigate?.('down'); }
    if (e.key === 'Tab')   { e.preventDefault(); commit(); onNavigate?.(e.shiftKey ? 'left' : 'right'); }
    if (e.key === 'Escape') { setEditing(false); }
  };

  if (editing) {
    return (
      <input ref={inputRef} type="number" value={draft} onChange={e => setDraft(e.target.value)}
        onBlur={commit} onKeyDown={onKeyDown} onClick={e => e.stopPropagation()}
        className="w-full h-full px-3 text-[12px] font-mono bg-yellow-50 dark:bg-yellow-400/10 border border-yellow-300 dark:border-yellow-400/50 rounded outline-none text-[#1a1a1a] dark:text-white/80"
      />
    );
  }

  const display = isInt
    ? (value === 0 || value == null ? '—' : value)
    : (value > 0 ? `${prefix || ''}${Number(value).toFixed(2)}` : '—');

  return (
    <div onDoubleClick={start} onClick={e => e.stopPropagation()}
      className={`w-full h-full flex items-center px-3 cursor-text rounded ${isDirty ? 'bg-yellow-50 dark:bg-yellow-400/10' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}
      title="Double-click to edit">
      <span className={`text-[12px] font-mono ${isDirty ? 'text-yellow-700 dark:text-yellow-300 font-medium' : value > 0 ? 'text-[#1a1a1a] dark:text-white/70' : 'text-[#ccc] dark:text-white/15'}`}>
        {display}
      </span>
    </div>
  );
}

function SelectCell({ value, options, onCommit, onNavigate, isDirty, renderValue }) {
  const [editing, setEditing] = useState(false);
  const selectRef             = useRef(null);

  const start = (e) => { e.stopPropagation(); setEditing(true); };

  useEffect(() => {
    if (editing) selectRef.current?.focus();
  }, [editing]);

  const commit = (val) => { setEditing(false); if (val !== value) onCommit(val); };

  const onKeyDown = (e) => {
    if (e.key === 'Tab')    { e.preventDefault(); commit(selectRef.current?.value); onNavigate?.(e.shiftKey ? 'left' : 'right'); }
    if (e.key === 'Escape') { setEditing(false); }
  };

  if (editing) {
    return (
      <select ref={selectRef} defaultValue={value}
        onChange={e => commit(e.target.value)} onBlur={e => commit(e.target.value)}
        onKeyDown={onKeyDown} onClick={e => e.stopPropagation()}
        className="w-full h-full px-2 text-[12px] bg-yellow-50 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-400/50 rounded outline-none text-[#1a1a1a] dark:text-white/80 cursor-pointer">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }

  return (
    <div onDoubleClick={start} onClick={e => e.stopPropagation()}
      className={`w-full h-full flex items-center px-3 cursor-pointer rounded ${isDirty ? 'bg-yellow-50 dark:bg-yellow-400/10' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}
      title="Double-click to edit">
      {renderValue ? renderValue(value) : (
        <span className={`text-[12px] ${isDirty ? 'text-yellow-700 dark:text-yellow-300 font-medium' : ''}`}>{value}</span>
      )}
    </div>
  );
}

// ── Product row ───────────────────────────────────────────────────────────────

const ProductRow = memo(({ product, isSelected, onRowClick, onToggleOne, dirtyFields, onCellCommit, onNavigate, visibleCols }) => {
  const rowKey    = product.sku || product.id;
  const isDirty   = f => dirtyFields?.[f] !== undefined;
  const merged    = { ...product, ...dirtyFields };
  const gridStyle = buildGridStyle(visibleCols);

  return (
    <div
      style={{ ...gridStyle, height: ROW_HEIGHT }}
      className={`border-b border-[#f5f3f0] dark:border-white/5 transition-colors duration-100 ${isSelected ? 'bg-yellow-50/60 dark:bg-yellow-400/5' : ''}`}
    >
      {/* Checkbox */}
      <div className={CELL}>
        <input type="checkbox" checked={isSelected} onChange={() => onToggleOne(rowKey)}
          className="w-3.5 h-3.5 rounded border-[#ccc] dark:border-white/20 cursor-pointer accent-[#1a1a1a] dark:accent-white" />
      </div>

      {/* Name — always visible */}
      <div className="flex items-center gap-2.5 min-w-0 pr-2">
        <div className="flex-shrink-0 pl-3 cursor-pointer" onClick={() => onRowClick?.(product)}>
          <Avatar name={merged.name} color={product.color} active={isSelected}
            image={product.localPreview || product.images?.[0]?.src} />
        </div>
        <div className="flex flex-col min-w-0 flex-1 h-full justify-center">
          <TextCell value={merged.name} isDirty={isDirty('name')}
            onCommit={v => onCellCommit(rowKey, 'name', v)}
            onNavigate={dir => onNavigate(rowKey, 'name', dir)} />
          {(product._pending || Object.keys(dirtyFields || {}).length > 0) && (
            <span className="text-[10px] text-yellow-600 dark:text-yellow-400 font-medium px-3 -mt-1">
              {Object.keys(dirtyFields || {}).length > 0 ? 'Unsaved' : 'Pending sync'}
            </span>
          )}
        </div>
      </div>

      {/* Conditional columns — order matches TOGGLEABLE_COLS */}
      {visibleCols.sku && (
        <div className={CELL_INNER}>
          <span className="text-[11px] font-mono text-[#888] dark:text-white/40 truncate" title={product.sku}>
            {product.sku || <span className="text-[#ccc] dark:text-white/15">—</span>}
          </span>
        </div>
      )}

      {visibleCols.category && (
        <div className="flex items-center min-w-0">
          <TextCell value={merged.category} isDirty={isDirty('category')}
            onCommit={v => onCellCommit(rowKey, 'category', v)}
            onNavigate={dir => onNavigate(rowKey, 'category', dir)} />
        </div>
      )}

      {visibleCols.regular_price && (
        <div className="flex items-center min-w-0">
          <NumberCell value={merged.regular_price} isDirty={isDirty('regular_price')} prefix="$"
            onCommit={v => onCellCommit(rowKey, 'regular_price', v)}
            onNavigate={dir => onNavigate(rowKey, 'regular_price', dir)} />
        </div>
      )}

      {visibleCols.sale_price && (
        <div className="flex items-center min-w-0">
          <NumberCell value={merged.sale_price} isDirty={isDirty('sale_price')} prefix="$"
            onCommit={v => onCellCommit(rowKey, 'sale_price', v)}
            onNavigate={dir => onNavigate(rowKey, 'sale_price', dir)} />
        </div>
      )}

      {visibleCols.stock && (
        <div className="flex items-center min-w-0">
          <NumberCell value={merged.stock} isDirty={isDirty('stock')} isInt
            onCommit={v => onCellCommit(rowKey, 'stock', v)}
            onNavigate={dir => onNavigate(rowKey, 'stock', dir)} />
        </div>
      )}

      {visibleCols.stock_status && (
        <div className="flex items-center min-w-0">
          <SelectCell value={merged.stock_status} options={STOCK_STATUS_OPTIONS} isDirty={isDirty('stock_status')}
            onCommit={v => onCellCommit(rowKey, 'stock_status', v)}
            onNavigate={dir => onNavigate(rowKey, 'stock_status', dir)}
            renderValue={v => <StockStatusBadge status={v} />} />
        </div>
      )}

      {visibleCols.type && (
        <div className={CELL_INNER}>
          <TypeBadge type={product.type} />
        </div>
      )}

      {visibleCols.status && (
        <div className="flex items-center min-w-0">
          <SelectCell value={merged.status} options={STATUS_OPTIONS} isDirty={isDirty('status')}
            onCommit={v => onCellCommit(rowKey, 'status', v)}
            onNavigate={dir => onNavigate(rowKey, 'status', dir)}
            renderValue={v => <StatusBadge status={v} />} />
        </div>
      )}
    </div>
  );
});

ProductRow.displayName = 'ProductRow';

// ── Virtual list ──────────────────────────────────────────────────────────────

function VirtualList({ items, selected, onRowClick, onToggleOne, dirtyMap, onCellCommit, onNavigate, visibleCols }) {
  const outerRef                    = useRef(null);
  const [scrollTop, setScrollTop]   = useState(0);
  const [viewHeight, setViewHeight] = useState(600);

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewHeight(el.clientHeight));
    ro.observe(el);
    setViewHeight(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  const onScroll = useCallback(e => setScrollTop(e.currentTarget.scrollTop), []);

  const totalHeight = items.length * ROW_HEIGHT;
  const startIndex  = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex    = Math.min(items.length - 1, Math.ceil((scrollTop + viewHeight) / ROW_HEIGHT) + OVERSCAN);

  const visibleItems = [];
  for (let i = startIndex; i <= endIndex; i++) {
    const product    = items[i];
    const rowKey     = product.sku || product.id;
    const isSelected = selected.has(rowKey);
    visibleItems.push(
      <div key={rowKey} style={{ position: 'absolute', top: i * ROW_HEIGHT, left: 0, right: 0, height: ROW_HEIGHT }}>
        <ProductRow
          product={product} isSelected={isSelected}
          onRowClick={onRowClick} onToggleOne={onToggleOne}
          dirtyFields={dirtyMap[rowKey] || {}}
          onCellCommit={onCellCommit} onNavigate={onNavigate}
          visibleCols={visibleCols}
        />
      </div>
    );
  }

  return (
    <div ref={outerRef} onScroll={onScroll} style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems}
      </div>
    </div>
  );
}

// ── TableBody export ──────────────────────────────────────────────────────────

export default function TableBody({ loading, sorted, selected, onRowClick, onToggleOne, dirtyMap, onCellCommit, onNavigate, visibleCols }) {
  if (loading) {
    return (
      <div className="flex flex-col gap-0">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border-b border-[#f5f3f0] dark:border-white/5 animate-pulse flex" style={{ height: ROW_HEIGHT }}>
            <div className={CELL}><div className="w-3.5 h-3.5 rounded bg-gray-100 dark:bg-white/10" /></div>
            <div className={`${CELL} gap-2.5`}>
              <div className="w-6 h-6 rounded bg-gray-100 dark:bg-white/10 flex-shrink-0" />
              <div className="h-3 rounded bg-gray-100 dark:bg-white/10 w-32" />
            </div>
            {[50, 70, 55, 45, 40, 60, 50, 50].map((w, j) => (
              <div key={j} className={CELL_INNER}><div className="h-3 rounded bg-gray-100 dark:bg-white/10" style={{ width: w }} /></div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <RiInboxLine size={40} className="text-[#ccc] dark:text-white/15" />
        <div className="text-center">
          <p className="text-[13px] font-medium text-[#555] dark:text-white/40">No products found</p>
          <p className="text-[11px] text-[#aaa] dark:text-white/25 mt-0.5">Try adjusting your search or filters</p>
        </div>
      </div>
    );
  }

  return (
    <VirtualList
      items={sorted} selected={selected}
      onRowClick={onRowClick} onToggleOne={onToggleOne}
      dirtyMap={dirtyMap} onCellCommit={onCellCommit} onNavigate={onNavigate}
      visibleCols={visibleCols}
    />
  );
}