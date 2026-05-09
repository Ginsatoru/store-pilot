import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RiCloseLine, RiUploadCloud2Line, RiRefreshLine, RiCheckLine } from 'react-icons/ri';
import { fetchVariations, dbLoadVariations, dbSaveVariations } from '../services/woo';

const EMPTY = {
  name: '', sku: '', price: '', regular_price: '', sale_price: '',
  stock: '', stock_status: 'instock', manage_stock: true,
  category: '', status: 'Draft', weight: '',
  length: '', width: '', height: '',
  short_description: '', description: '',
  imageFile: null, imagePreview: null,
};

const TABS = ['Details', 'Variations'];

// ── Variation row ─────────────────────────────────────────────────────────────
function VariationRow({ variation, onChange }) {
  const attrs = variation.attributes?.map(a => a.option).filter(Boolean).join(' / ') || `#${variation.id}`;

  const set = (k, v) => onChange(variation.id, k, v);

  return (
    <div className="rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-white/[0.03] p-3 flex flex-col gap-2">
      {/* Attribute label + status badge */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-[#1a1a1a] dark:text-white/90 truncate">{attrs}</span>
        <span className={`shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
          variation.stock_status === 'instock'
            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
            : 'bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400'
        }`}>
          {variation.stock_status === 'instock' ? 'In Stock' : 'Out'}
        </span>
      </div>

      {/* SKU */}
      <div className="flex flex-col gap-1">
        <label className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 dark:text-white/30">SKU</label>
        <input
          className="var-input"
          placeholder="e.g. PROD-RED-M"
          value={variation.sku || ''}
          onChange={e => set('sku', e.target.value)}
        />
      </div>

      {/* Price row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 dark:text-white/30">Regular $</label>
          <input
            className="var-input"
            type="number" min="0" step="0.01"
            placeholder="0.00"
            value={variation.regular_price || ''}
            onChange={e => set('regular_price', e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 dark:text-white/30">Sale $</label>
          <input
            className="var-input"
            type="number" min="0" step="0.01"
            placeholder="0.00"
            value={variation.sale_price || ''}
            onChange={e => set('sale_price', e.target.value)}
          />
        </div>
      </div>

      {/* Stock row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 dark:text-white/30">Stock Qty</label>
          <input
            className="var-input"
            type="number" min="0"
            placeholder="0"
            value={variation.stock_quantity ?? variation.stock ?? ''}
            onChange={e => set('stock_quantity', e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 dark:text-white/30">Status</label>
          <select
            className="var-input"
            value={variation.stock_status || 'instock'}
            onChange={e => set('stock_status', e.target.value)}
          >
            <option value="instock">In Stock</option>
            <option value="outofstock">Out of Stock</option>
            <option value="onbackorder">Backorder</option>
          </select>
        </div>
      </div>

      {variation._dirty && (
        <div className="flex items-center gap-1 text-[9px] text-amber-500 dark:text-amber-400 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
          Unsaved changes
        </div>
      )}
    </div>
  );
}

// ── Variations tab panel ──────────────────────────────────────────────────────
function VariationsPanel({ product, conn, onQueueVariations }) {
  const [variations,   setVariations]   = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const [saving,       setSaving]       = useState(false);
  const [savedFlash,   setSavedFlash]   = useState(false);
  const loadedForRef = useRef(null);

  const loadVariations = useCallback(async () => {
    if (!product?.id) return;
    setLoading(true);
    setError(null);

    // 1. Try cache first
    const cached = await dbLoadVariations(product.id);
    if (cached.ok && cached.data?.length > 0) {
      setVariations(cached.data.map(v => ({ ...v, _dirty: false })));
      setLoading(false);
      loadedForRef.current = product.id;
      return;
    }

    // 2. Fetch from WooCommerce
    try {
      const res = await fetchVariations(conn, product.id);
      if (!res.ok) { setError(res.error || 'Failed to load variations'); setLoading(false); return; }
      const data = res.data || [];
      await dbSaveVariations(product.id, data);
      setVariations(data.map(v => ({ ...v, _dirty: false })));
      loadedForRef.current = product.id;
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, [product?.id, conn]);

  const refreshVariations = useCallback(async () => {
    if (!product?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchVariations(conn, product.id);
      if (!res.ok) { setError(res.error || 'Failed to refresh'); setLoading(false); return; }
      const data = res.data || [];
      await dbSaveVariations(product.id, data);
      setVariations(data.map(v => ({ ...v, _dirty: false })));
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, [product?.id, conn]);

  useEffect(() => {
    if (product?.id && loadedForRef.current !== product.id) {
      loadVariations();
    }
  }, [product?.id, loadVariations]);

  const handleChange = useCallback((varId, field, value) => {
    setVariations(prev => prev.map(v =>
      v.id === varId ? { ...v, [field]: value, _dirty: true } : v
    ));
  }, []);

  const handleSave = async () => {
    const dirty = variations.filter(v => v._dirty);
    if (dirty.length === 0) return;

    setSaving(true);

    // Save updated variations to cache
    const updated = variations.map(v => ({ ...v, _dirty: false }));
    await dbSaveVariations(product.id, updated.map(({ _dirty, ...rest }) => rest));
    setVariations(updated);

    // Queue each dirty variation for sync
    onQueueVariations(product, dirty);

    setSaving(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  const dirtyCount = variations.filter(v => v._dirty).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div className="w-5 h-5 border-2 border-gray-200 dark:border-white/10 border-t-gray-500 dark:border-t-white/40 rounded-full animate-spin" />
        <span className="text-[11px] text-gray-400 dark:text-white/30">Loading variations…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <p className="text-[11px] text-red-500 dark:text-red-400 text-center px-4">{error}</p>
        <button onClick={loadVariations} className="text-[11px] font-medium text-gray-500 dark:text-white/40 hover:text-[#1a1a1a] dark:hover:text-white underline underline-offset-2 transition-colors">
          Try again
        </button>
      </div>
    );
  }

  if (variations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2">
        <p className="text-[11px] text-gray-400 dark:text-white/30">No variations found.</p>
        <button onClick={refreshVariations} className="text-[11px] font-medium text-gray-500 dark:text-white/40 hover:text-[#1a1a1a] dark:hover:text-white underline underline-offset-2 transition-colors">
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-400 dark:text-white/30">{variations.length} variation{variations.length !== 1 ? 's' : ''}</span>
        <button
          onClick={refreshVariations}
          disabled={loading}
          className="flex items-center gap-1 text-[10px] font-medium text-gray-400 dark:text-white/30 hover:text-[#1a1a1a] dark:hover:text-white transition-colors disabled:opacity-40"
        >
          <RiRefreshLine size={11} />
          Refresh
        </button>
      </div>

      {/* Variation rows */}
      <div className="flex flex-col gap-2">
        {variations.map(v => (
          <VariationRow key={v.id} variation={v} onChange={handleChange} />
        ))}
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving || dirtyCount === 0}
        className={`w-full flex items-center justify-center gap-1.5 text-[12px] font-semibold rounded-xl py-2.5 transition-all ${
          savedFlash
            ? 'bg-emerald-500 text-white'
            : dirtyCount > 0
              ? 'bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a] hover:bg-black dark:hover:bg-white/90'
              : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-white/20 cursor-not-allowed'
        }`}
      >
        {savedFlash ? (
          <><RiCheckLine size={13} /> Queued for sync</>
        ) : saving ? (
          'Saving…'
        ) : dirtyCount > 0 ? (
          `Save ${dirtyCount} variation${dirtyCount !== 1 ? 's' : ''}`
        ) : (
          'No changes'
        )}
      </button>
    </div>
  );
}

// ── Main ProductForm ──────────────────────────────────────────────────────────
export default function ProductForm({ product, onSave, onDelete, onClose, saving: externalSaving, conn, onQueueVariations }) {
  const [form,       setForm]       = useState(EMPTY);
  const [error,      setError]      = useState(null);
  const [activeTab,  setActiveTab]  = useState('Details');
  const isNew       = !product?.id;
  const isVariable  = product?.type === 'variable';
  const tabs        = isVariable ? TABS : ['Details'];

  useEffect(() => {
    if (product) {
      setForm({
        name:              product.name || '',
        sku:               product.sku || '',
        price:             product.price || '',
        regular_price:     product.regular_price || '',
        sale_price:        product.sale_price || '',
        stock:             product.stock ?? '',
        stock_status:      product.stock_status || 'instock',
        manage_stock:      product.manage_stock ?? true,
        category:          product.category || '',
        status:            product.status || 'Draft',
        weight:            product.weight || '',
        length:            product.dimensions?.length || '',
        width:             product.dimensions?.width || '',
        height:            product.dimensions?.height || '',
        short_description: product.short_description || '',
        description:       product.description || '',
        imageFile:         null,
        imagePreview:      product.localPreview || product.images?.[0]?.src || product._raw?.images?.[0]?.src || null,
      });
    } else {
      setForm(EMPTY);
    }
    setError(null);
    setActiveTab('Details');
  }, [product]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      set('imagePreview', ev.target.result);
      set('imageFile', file);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!form.name.trim()) { setError('Product name is required'); return; }
    setError(null);
    onSave({
      ...product,
      _isNew:            isNew,
      sku:               form.sku.trim(),
      name:              form.name.trim(),
      price:             parseFloat(form.price) || 0,
      regular_price:     parseFloat(form.regular_price || form.price) || 0,
      sale_price:        parseFloat(form.sale_price) || 0,
      stock:             form.stock !== '' ? parseInt(form.stock) : 0,
      stock_status:      form.stock_status,
      manage_stock:      form.manage_stock,
      category:          form.category.trim() || 'Uncategorized',
      status:            form.status,
      weight:            form.weight,
      dimensions:        { length: form.length, width: form.width, height: form.height },
      short_description: form.short_description.trim(),
      description:       form.description.trim(),
      imageFile:         form.imageFile,
      imagePreview:      form.imagePreview,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50 flex items-center justify-center p-6">
      <div className="bg-white dark:bg-[#1c1c1b] rounded-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/10">
          <div>
            <h2 className="text-[13px] font-semibold text-[#1a1a1a] dark:text-white">
              {isNew ? 'New Product' : 'Edit Product'}
            </h2>
            {!isNew && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-[#aaa] dark:text-white/30">#{product.id}</span>
                {product.sku && <span className="text-[10px] font-mono text-[#aaa] dark:text-white/30">SKU: {product.sku}</span>}
                {isVariable && <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 dark:text-indigo-400">Variable</span>}
              </div>
            )}
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-white/10 hover:bg-[#1a1a1a] dark:hover:bg-white hover:text-white dark:hover:text-[#1a1a1a] flex items-center justify-center text-[#777] dark:text-white/50 transition-colors">
            <RiCloseLine size={15} />
          </button>
        </div>

        {/* Tabs — only shown for variable products */}
        {isVariable && (
          <div className="flex px-6 pt-3 gap-1 border-b border-gray-100 dark:border-white/10">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-[11px] font-semibold rounded-t-lg transition-colors ${
                  activeTab === tab
                    ? 'text-[#1a1a1a] dark:text-white border-b-2 border-[#1a1a1a] dark:border-white -mb-px'
                    : 'text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">

          {/* ── Details Tab ── */}
          {activeTab === 'Details' && (
            <>
              {error && <div className="text-[12px] text-red-600 bg-red-50 dark:bg-red-950/50 dark:text-red-400 rounded-xl px-3 py-2">{error}</div>}

              {/* Image */}
              <div>
                {form.imagePreview ? (
                  <div className="relative rounded-xl overflow-hidden aspect-video bg-gray-50 dark:bg-white/5 flex items-center justify-center">
                    <img src={form.imagePreview} alt="preview" className="max-h-full max-w-full object-contain" />
                    {form.imageFile && (
                      <div className="absolute top-2 left-2 bg-yellow-400 text-[#1a1a1a] text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        Pending upload
                      </div>
                    )}
                    <label className="absolute bottom-2 right-2 text-[11px] font-medium bg-white dark:bg-[#1c1c1b] text-[#555] dark:text-white/60 px-2.5 py-1 rounded-full hover:bg-[#1a1a1a] dark:hover:bg-white hover:text-white dark:hover:text-[#1a1a1a] transition-colors cursor-pointer">
                      Change
                      <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
                    </label>
                  </div>
                ) : (
                  <label className="w-full aspect-video rounded-xl border-2 border-dashed border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:border-gray-400 dark:hover:border-white/20 hover:bg-gray-100 dark:hover:bg-white/10 transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer">
                    <RiUploadCloud2Line size={28} className="text-gray-400 dark:text-white/20" />
                    <span className="text-[12px] font-medium text-[#777] dark:text-white/40">Click to select image</span>
                    <span className="text-[11px] text-[#aaa] dark:text-white/25">JPG, PNG, WebP. uploads on sync</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
                  </label>
                )}
              </div>

              <Field label="Product Name">
                <input className="field-input" placeholder="e.g. Blue Widget Pro" value={form.name} onChange={e => set('name', e.target.value)} />
              </Field>

              <Field label="SKU">
                <input className="field-input" placeholder="e.g. BWP-001" value={form.sku} onChange={e => set('sku', e.target.value)} />
              </Field>

              <Field label="Category">
                <input className="field-input" placeholder="e.g. Accessories" value={form.category} onChange={e => set('category', e.target.value)} />
              </Field>

              {/* Pricing — hide for variable (managed per-variation) */}
              {!isVariable && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Regular Price">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-gray-400 dark:text-white/30 pointer-events-none">$</span>
                      <input className="field-input" style={{ paddingLeft: '22px' }} placeholder="0.00" type="number" min="0" step="0.01" value={form.regular_price} onChange={e => set('regular_price', e.target.value)} />
                    </div>
                  </Field>
                  <Field label="Sale Price">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-gray-400 dark:text-white/30 pointer-events-none">$</span>
                      <input className="field-input" style={{ paddingLeft: '22px' }} placeholder="0.00" type="number" min="0" step="0.01" value={form.sale_price} onChange={e => set('sale_price', e.target.value)} />
                    </div>
                  </Field>
                </div>
              )}

              {/* Stock — hide for variable */}
              {!isVariable && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Stock Qty">
                    <input className="field-input" placeholder="0" type="number" min="0" value={form.stock} onChange={e => set('stock', e.target.value)} />
                  </Field>
                  <Field label="Stock Status">
                    <select className="field-input" value={form.stock_status} onChange={e => set('stock_status', e.target.value)}>
                      <option value="instock">In Stock</option>
                      <option value="outofstock">Out of Stock</option>
                      <option value="onbackorder">On Backorder</option>
                    </select>
                  </Field>
                </div>
              )}

              <Field label="Weight (kg)">
                <input className="field-input" placeholder="0.00" type="number" min="0" step="0.01" value={form.weight} onChange={e => set('weight', e.target.value)} />
              </Field>

              <div>
                <label className="text-[10px] font-semibold text-gray-400 dark:text-white/30 uppercase tracking-wider block mb-1.5">Dimensions (cm)</label>
                <div className="grid grid-cols-3 gap-2">
                  {['length','width','height'].map(d => (
                    <input key={d} className="field-input" placeholder={d.charAt(0).toUpperCase() + d.slice(1)} type="number" min="0" step="0.01"
                      value={form[d]} onChange={e => set(d, e.target.value)} />
                  ))}
                </div>
              </div>

              <Field label="Short Description">
                <textarea className="field-input resize-none" rows={2} placeholder="Brief product summary…" value={form.short_description} onChange={e => set('short_description', e.target.value)} />
              </Field>

              <Field label="Description">
                <textarea className="field-input resize-none" rows={3} placeholder="Full product description…" value={form.description} onChange={e => set('description', e.target.value)} />
              </Field>

              <Field label="Status">
                <div className="flex gap-2">
                  {['Draft', 'Live'].map(s => (
                    <button key={s} onClick={() => set('status', s)}
                      className={`flex-1 py-2 rounded-xl border text-[12px] font-medium transition-colors ${
                        form.status === s
                          ? s === 'Live'
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400 text-emerald-700 dark:text-emerald-400'
                            : 'bg-gray-900 dark:bg-white border-gray-900 dark:border-white text-white dark:text-[#1a1a1a]'
                          : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/40 hover:border-gray-400 dark:hover:border-white/20'
                      }`}>
                      {s === 'Live' ? '● Live' : '○ Draft'}
                    </button>
                  ))}
                </div>
              </Field>
            </>
          )}

          {/* ── Variations Tab ── */}
          {activeTab === 'Variations' && isVariable && (
            <VariationsPanel
              product={product}
              conn={conn}
              onQueueVariations={onQueueVariations}
            />
          )}
        </div>

        {/* Footer — hide Save/Delete on Variations tab */}
        {activeTab === 'Details' && (
          <div className="flex items-center gap-2 px-6 py-4 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5">
            {!isNew && onDelete && (
              <button onClick={onDelete} disabled={externalSaving} className="text-[12px] font-medium text-red-500 bg-white dark:bg-white/5 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-xl px-3 py-2 transition-colors disabled:opacity-40">
                Delete
              </button>
            )}
            <button onClick={handleSave} disabled={externalSaving}
              className="flex-1 flex items-center justify-center gap-1.5 text-[12px] font-semibold bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a] rounded-xl py-2 hover:bg-black dark:hover:bg-white/90 transition-colors disabled:opacity-50">
              {externalSaving ? (isNew ? 'Creating…' : 'Saving…') : (isNew ? 'Create Product' : 'Save Changes')}
            </button>
          </div>
        )}
      </div>

      <style>{`
        .field-input {
          width: 100%; font-size: 12px; border-radius: 10px; padding: 9px 12px;
          outline: none; border: 1px solid; transition: border-color 0.15s;
        }
        .var-input {
          width: 100%; font-size: 11px; border-radius: 8px; padding: 7px 10px;
          outline: none; border: 1px solid; transition: border-color 0.15s;
        }
        :not(.dark) .field-input, :not(.dark) .var-input {
          background: white; border-color: #e5e7eb; color: #1a1a1a;
        }
        :not(.dark) .field-input:focus, :not(.dark) .var-input:focus { border-color: #1a1a1a; }
        :not(.dark) .field-input::placeholder, :not(.dark) .var-input::placeholder { color: #9ca3af; }
        .dark .field-input, .dark .var-input {
          background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); color: rgba(255,255,255,0.85);
        }
        .dark .field-input:focus, .dark .var-input:focus { border-color: rgba(255,255,255,0.3); }
        .dark .field-input::placeholder, .dark .var-input::placeholder { color: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-semibold text-gray-400 dark:text-white/30 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}