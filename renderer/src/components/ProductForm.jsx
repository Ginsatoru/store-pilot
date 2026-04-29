import React, { useState, useEffect } from 'react';
import { RiCloseLine, RiUploadCloud2Line } from 'react-icons/ri';

const EMPTY = { name: '', price: '', stock: '', category: '', status: 'Draft', imageFile: null, imagePreview: null };

export default function ProductForm({ product, onSave, onDelete, onClose, saving: externalSaving }) {
  const [form, setForm]   = useState(EMPTY);
  const [error, setError] = useState(null);
  const isNew = !product?.id;

  useEffect(() => {
    if (product) {
      setForm({
        name:         product.name || '',
        price:        product.price || '',
        stock:        product.stock ?? '',
        category:     product.category || '',
        status:       product.status || 'Draft',
        imageFile:    null,
        imagePreview: product.localPreview || product._raw?.images?.[0]?.src || null,
      });
    } else {
      setForm(EMPTY);
    }
    setError(null);
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
      id:           product?.id,
      _isNew:       isNew,
      name:         form.name.trim(),
      price:        parseFloat(form.price) || 0,
      stock:        form.stock !== '' ? parseInt(form.stock) : 0,
      category:     form.category.trim() || 'Uncategorized',
      status:       form.status,
      color:        product?.color,
      imageFile:    form.imageFile,
      imagePreview: form.imagePreview,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50 flex items-center justify-center p-6">
      <div className="bg-white dark:bg-[#1c1c1b] rounded-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/10">
          <div>
            <h2 className="text-[13px] font-semibold text-[#1a1a1a] dark:text-white">{isNew ? 'New Product' : 'Edit Product'}</h2>
            {!isNew && <span className="text-[10px] font-mono text-[#aaa] dark:text-white/30">#{product.id}</span>}
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-white/10 hover:bg-[#1a1a1a] dark:hover:bg-white hover:text-white dark:hover:text-[#1a1a1a] flex items-center justify-center text-[#777] dark:text-white/50 transition-colors">
            <RiCloseLine size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
          {error && <div className="text-[12px] text-red-600 bg-red-50 dark:bg-red-950/50 dark:text-red-400 rounded-xl px-3 py-2">{error}</div>}

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

          <Field label="Category">
            <input className="field-input" placeholder="e.g. Accessories" value={form.category} onChange={e => set('category', e.target.value)} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Price (USD)">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-gray-400 dark:text-white/30 pointer-events-none">$</span>
                <input className="field-input" style={{ paddingLeft: '22px' }} placeholder="0.00" type="number" min="0" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} />
              </div>
            </Field>
            <Field label="Stock Qty">
              <input className="field-input" placeholder="0" type="number" min="0" value={form.stock} onChange={e => set('stock', e.target.value)} />
            </Field>
          </div>

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
        </div>

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
      </div>
      <style>{`
        .field-input {
          width: 100%; font-size: 12px; border-radius: 10px; padding: 9px 12px;
          outline: none; border: 1px solid; transition: border-color 0.15s;
        }
        :not(.dark) .field-input {
          background: white; border-color: #e5e7eb; color: #1a1a1a;
        }
        :not(.dark) .field-input:focus { border-color: #1a1a1a; }
        :not(.dark) .field-input::placeholder { color: #9ca3af; }
        .dark .field-input {
          background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); color: rgba(255,255,255,0.85);
        }
        .dark .field-input:focus { border-color: rgba(255,255,255,0.3); }
        .dark .field-input::placeholder { color: rgba(255,255,255,0.2); }
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