import React, { useState, useMemo } from 'react';
import StatsBar from '../components/StatsBar.jsx';
import ProductsTable from '../components/ProductsTable.jsx';
import ProductForm from '../components/ProductForm.jsx';
import ImportModal from '../components/ImportModal.jsx';

function computeStats(products) {
  const total     = products.length;
  const published = products.filter(p => p.status === 'Live').length;
  const draft     = products.filter(p => p.status === 'Draft').length;
  const inStock   = products.filter(p => p.stock > 5).length;
  const lowStock  = products.filter(p => p.stock > 0 && p.stock <= 5).length;
  return { total, published, draft, inStock, lowStock };
}

function buildLocalProduct(formData) {
  const colors = ['#6366f1','#f59e0b','#10b981','#3b82f6','#ec4899','#8b5cf6','#f97316','#14b8a6'];
  return {
    id:           formData.id,
    name:         formData.name,
    category:     formData.category || 'Uncategorized',
    price:        parseFloat(formData.price) || 0,
    stock:        formData.stock !== '' ? parseInt(formData.stock) : 0,
    date:         formData.date || new Date().toISOString(),
    status:       formData.status || 'Draft',
    color:        formData.color || colors[Math.floor(Math.random() * colors.length)],
    localPreview: formData.imagePreview || null,
    _pending:     true,
    _raw:         formData._raw || {},
  };
}

export default function Products({
  settings, productList, loading, error, setError,
  onRefresh, onQueueChange, pendingQueue,
}) {
  const [search, setSearch]           = useState('');
  const [showForm, setShowForm]       = useState(false);
  const [showImport, setShowImport]   = useState(false);
  const [editProduct, setEditProduct] = useState(null);

  const filtered = useMemo(() => {
    const list = productList;
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.status.toLowerCase().includes(q)
    );
  }, [search, productList]);

  const stats = useMemo(() => computeStats(productList), [productList]);

  const handleAddNew = () => { setEditProduct(null); setShowForm(true); };
  const handleEdit   = (product) => { setEditProduct(product); setShowForm(true); };

  const handleSave = (formData) => {
    setShowForm(false);
    const local = buildLocalProduct(formData);
    if (formData._isNew) {
      onQueueChange({ action: 'create', product: local, imageFile: formData.imageFile || null, imagePreview: formData.imagePreview || null });
    } else {
      onQueueChange({ action: 'update', product: { ...local, id: formData.id }, imageFile: formData.imageFile || null, imagePreview: formData.imagePreview || null });
    }
  };

  const handleDelete = (product) => {
    if (!window.confirm(`Delete "${product.name}"?`)) return;
    setShowForm(false);
    onQueueChange({ action: 'delete', product });
  };

  const handleImport = (rows) => {
    const colors = ['#6366f1','#f59e0b','#10b981','#3b82f6','#ec4899','#8b5cf6','#f97316','#14b8a6'];
    rows.forEach((row) => {
      const local = {
        id:           `import_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name:         row.name,
        category:     row.category || 'Uncategorized',
        price:        row.price || 0,
        stock:        row.stock || 0,
        date:         row.date || new Date().toISOString(),
        status:       row.status || 'Draft',
        color:        colors[Math.floor(Math.random() * colors.length)],
        localPreview: null,
        _pending:     true,
        _raw:         {},
      };
      onQueueChange({ action: 'create', product: local, imageFile: null, imagePreview: null });
    });
  };

  const pendingCount = Object.keys(pendingQueue || {}).length;

  return (
    <div className="flex-1 flex flex-col min-h-0 px-5 pb-3">
      <div className="flex items-center justify-between pt-4 pb-1">
        <h1 className="text-[28px] font-bold text-[#1a1a1a] dark:text-white tracking-tight">Products</h1>
        {pendingCount > 0 && (
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-yellow-100 dark:bg-yellow-400/15 text-yellow-700 dark:text-yellow-400">
            {pendingCount} pending sync
          </span>
        )}
      </div>

      {error && (
        <div className="mb-2 text-[12px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 rounded-xl px-4 py-2.5 flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-4">✕</button>
        </div>
      )}

      <StatsBar stats={stats} loading={loading} />

      <ProductsTable
        products={filtered}
        allProducts={productList}
        search={search}
        loading={loading}
        onSearch={setSearch}
        onRefresh={onRefresh}
        onAddNew={handleAddNew}
        onRowClick={handleEdit}
        onImport={() => setShowImport(true)}
      />

      {showForm && (
        <ProductForm
          product={editProduct}
          onSave={handleSave}
          onDelete={editProduct ? () => handleDelete(editProduct) : null}
          onClose={() => setShowForm(false)}
          saving={false}
        />
      )}

      {showImport && (
        <ImportModal
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}