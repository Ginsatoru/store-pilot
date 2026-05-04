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

const COLORS = ['#6366f1','#f59e0b','#10b981','#3b82f6','#ec4899','#8b5cf6','#f97316','#14b8a6'];

function buildLocalProduct(formData, existingProduct) {
  const sku = formData.sku?.trim() || String(formData.id || `local_${Date.now()}`);
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
    categories:        formData.categories?.length ? formData.categories : existingProduct?.categories || [],
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
  settings, productList, loading, fetchProgress, error, setError,
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
    const fresh = productList.find(p =>
      (p.sku && p.sku === product.sku) || p.id === product.id
    ) || product;
    setEditProduct(fresh);
    setShowForm(true);
  };

  const handleSave = (formData) => {
    setShowForm(false);
    const local = buildLocalProduct(formData, editProduct);
    const imagePreviewForSync = formData.imageFile
      ? formData.imagePreview
      : local.localPreview;

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

  const handleImport = (rows, fields) => {
    rows.forEach((row) => {
      const existingProduct = row._match || null;
      const isUpdate = !!existingProduct;

      if (isUpdate) {
        const merged = { ...existingProduct };
        if (fields.includes('name'))               merged.name              = row.name;
        if (fields.includes('category'))           merged.category          = row.category;
        if (fields.includes('regular_price'))      merged.regular_price     = parseFloat(row.regular_price) || existingProduct.regular_price;
        if (fields.includes('sale_price'))         merged.sale_price        = parseFloat(row.sale_price) || existingProduct.sale_price;
        if (fields.includes('stock'))              merged.stock             = row.stock !== '' ? parseInt(row.stock) : existingProduct.stock;
        if (fields.includes('stock_status'))       merged.stock_status      = row.stock_status || existingProduct.stock_status;
        if (fields.includes('status'))             merged.status            = row.status || existingProduct.status;
        if (fields.includes('weight'))             merged.weight            = row.weight || existingProduct.weight;
        if (fields.includes('short_description'))  merged.short_description = row.short_description || existingProduct.short_description;
        if (fields.includes('description'))        merged.description       = row.description || existingProduct.description;
        merged._pending = true;

        onQueueChange({ action: 'update', product: merged, imageFile: null, imagePreview: merged.localPreview || null });

      } else {
        const sku = row._barcode || `import_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const local = {
          id:                `import_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          sku,
          name:              fields.includes('name')              ? row.name              : 'Untitled',
          category:          fields.includes('category')          ? row.category          : 'Uncategorized',
          categories:        [],
          tags:              [],
          regular_price:     fields.includes('regular_price')     ? parseFloat(row.regular_price) || 0 : 0,
          sale_price:        fields.includes('sale_price')        ? parseFloat(row.sale_price) || 0    : 0,
          price:             fields.includes('regular_price')     ? parseFloat(row.regular_price) || 0 : 0,
          stock:             fields.includes('stock')             ? parseInt(row.stock) || 0            : 0,
          stock_status:      fields.includes('stock_status')      ? row.stock_status || 'instock'       : 'instock',
          status:            fields.includes('status')            ? row.status || 'Draft'               : 'Draft',
          weight:            fields.includes('weight')            ? row.weight || ''                    : '',
          short_description: fields.includes('short_description') ? row.short_description || ''         : '',
          description:       fields.includes('description')       ? row.description || ''               : '',
          manage_stock:      true,
          dimensions:        { length: '', width: '', height: '' },
          images:            [],
          date:              new Date().toISOString(),
          date_modified:     '',
          color:             COLORS[Math.floor(Math.random() * COLORS.length)],
          localPreview:      null,
          _pending:          true,
          _raw:              {},
        };
        onQueueChange({ action: 'create', product: local, imageFile: null, imagePreview: null });
      }
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
        fetchProgress={fetchProgress}
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
          productList={productList}
        />
      )}
    </div>
  );
}