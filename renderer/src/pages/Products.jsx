import React, { useState, useMemo } from 'react';
import StatsBar from '../components/StatsBar.jsx';
import ProductsTable from '../components/ProductsTable.jsx';
import ProductForm from '../components/ProductForm.jsx';
import ImportModal from '../components/ImportModal.jsx';
import { normalizeProduct } from '../hooks/useProducts.js';

function computeStats(products) {
  const total     = products.length;
  const published = products.filter(p => p.status === 'Live').length;
  const draft     = products.filter(p => p.status === 'Draft').length;
  const inStock   = products.filter(p => p.stock > 5).length;
  const lowStock  = products.filter(p => p.stock > 0 && p.stock <= 5).length;
  return { total, published, draft, inStock, lowStock };
}

const COLORS = ['#6366f1','#f59e0b','#10b981','#3b82f6','#ec4899','#8b5cf6','#f97316','#14b8a6'];

function buildLocalProduct(formData, existingProduct) {
  const sku = formData.sku?.trim() || String(formData.id || `local_${Date.now()}`);

  // Resolution order for localPreview:
  // 1. New image picked in form (base64 data URL) → use it
  // 2. formData.localPreview preserved via ...product spread in ProductForm
  // 3. existingProduct's localPreview (already-uploaded URL)
  // 4. existingProduct's first Woo image src
  const localPreview =
    (formData.imagePreview && formData.imagePreview.startsWith('data:'))
      ? formData.imagePreview
      : formData.localPreview ||
        existingProduct?.localPreview ||
        existingProduct?.images?.[0]?.src ||
        formData.imagePreview ||
        null;

  return {
    id:                formData.id,
    sku,
    name:              formData.name,
    slug:              formData.slug || existingProduct?.slug || '',
    type:              formData.type || existingProduct?.type || 'simple',
    category:          formData.category || 'Uncategorized',
    // Preserve existing categories array so Woo category IDs are not lost
    categories:        formData.categories?.length
                         ? formData.categories
                         : existingProduct?.categories || [],
    tags:              formData.tags?.length ? formData.tags : (existingProduct?.tags || []),
    price:             parseFloat(formData.price) || 0,
    regular_price:     parseFloat(formData.regular_price || formData.price) || 0,
    sale_price:        parseFloat(formData.sale_price) || 0,
    on_sale:           parseFloat(formData.sale_price) > 0,
    stock:             formData.stock !== '' ? parseInt(formData.stock) : 0,
    stock_status:      formData.stock_status || 'instock',
    manage_stock:      formData.manage_stock ?? true,
    weight:            formData.weight || '',
    dimensions:        formData.dimensions || { length: '', width: '', height: '' },
    short_description: formData.short_description || '',
    description:       formData.description || '',
    // Always carry forward existing images array so Woo IDs are preserved
    images:            formData.images?.length ? formData.images : (existingProduct?.images || []),
    date:              formData.date || existingProduct?.date || new Date().toISOString(),
    date_modified:     formData.date_modified || '',
    status:            formData.status || 'Draft',
    color:             formData.color || existingProduct?.color || COLORS[Math.floor(Math.random() * COLORS.length)],
    localPreview,
    _pending:          true,
    _raw:              formData._raw || existingProduct?._raw || {},
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
    if (!search.trim()) return productList;
    const q = search.toLowerCase();
    return productList.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.status?.toLowerCase().includes(q)
    );
  }, [search, productList]);

  const stats = useMemo(() => computeStats(productList), [productList]);

  const handleAddNew = () => { setEditProduct(null); setShowForm(true); };

  const handleEdit = (product) => {
    // Always read from productList to get the latest localPreview / images
    const fresh = productList.find(p =>
      (p.sku && p.sku === product.sku) || p.id === product.id
    ) || product;
    setEditProduct(fresh);
    setShowForm(true);
  };

  const handleSave = (formData) => {
    setShowForm(false);
    // Pass the current editProduct so buildLocalProduct can inherit images/localPreview
    const local = buildLocalProduct(formData, editProduct);

    // imagePreview to pass separately for sync:
    // - if user picked a new file → pass the base64 so FTP upload triggers
    // - otherwise → pass the resolved localPreview (existing URL) so buildWooPayload uses it
    const imagePreviewForSync = formData.imageFile
      ? formData.imagePreview   // base64 → triggers FTP upload in useSync
      : local.localPreview;     // existing URL → skips FTP, used directly in payload

    if (formData._isNew) {
      onQueueChange({ action: 'create', product: local, imageFile: formData.imageFile || null, imagePreview: imagePreviewForSync });
    } else {
      onQueueChange({ action: 'update', product: local, imageFile: formData.imageFile || null, imagePreview: imagePreviewForSync });
    }
  };

  const handleDelete = (product) => {
    if (!window.confirm(`Delete "${product.name}"?`)) return;
    setShowForm(false);
    onQueueChange({ action: 'delete', product });
  };

  const handleImport = (rows) => {
    rows.forEach((row) => {
      const sku = row.sku?.trim() || `import_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const local = {
        id:                `import_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        sku,
        name:              row.name,
        category:          row.category || 'Uncategorized',
        categories:        [],
        tags:              [],
        price:             parseFloat(row.price) || 0,
        regular_price:     parseFloat(row.regular_price || row.price) || 0,
        sale_price:        parseFloat(row.sale_price) || 0,
        stock:             parseInt(row.stock) || 0,
        stock_status:      row.stock_status || 'instock',
        manage_stock:      true,
        weight:            row.weight || '',
        dimensions:        { length: row.length || '', width: row.width || '', height: row.height || '' },
        short_description: row.short_description || '',
        description:       row.description || '',
        images:            [],
        date:              row.date || new Date().toISOString(),
        date_modified:     '',
        status:            row.status || 'Draft',
        color:             COLORS[Math.floor(Math.random() * COLORS.length)],
        localPreview:      null,
        _pending:          true,
        _raw:              {},
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