function api() {
  if (!window.electronAPI) throw new Error('electronAPI not available');
  return window.electronAPI;
}

function checkOnline() {
  if (!navigator.onLine) throw new Error('No internet connection. Please check your network.');
}

async function guard(fn) {
  checkOnline();
  const res = await fn();
  if (res && !res.ok && !res.error) res.error = 'Unknown error (no details returned).';
  return res;
}

// ── Settings ──────────────────────────────────────────────────────────────────
export const loadSettings = ()     => api().settingsLoad();
export const saveSettings = (data) => api().settingsSave(data);

// ── DB — Products (offline safe, no guard) ────────────────────────────────────
export const dbLoadProducts  = ()         => api().dbLoadProducts();
export const dbSaveProducts  = (products) => api().dbSaveProducts(products);
export const dbClearProducts = ()         => api().dbClearProducts();

// ── DB — Queue (offline safe, no guard) ──────────────────────────────────────
export const dbLoadQueue       = ()          => api().dbLoadQueue();
export const dbUpsertQueueItem = (key, item) => api().dbUpsertQueueItem(key, item);
export const dbDeleteQueueItem = (key)       => api().dbDeleteQueueItem(key);
export const dbClearQueue      = ()          => api().dbClearQueue();

// ── DB — Orders (offline safe, no guard) ─────────────────────────────────────
export const dbLoadOrders  = ()       => api().dbLoadOrders();
export const dbSaveOrders  = (orders) => api().dbSaveOrders(orders);

// ── WooCommerce (online required) ─────────────────────────────────────────────
export const testConnection    = (settings)             => guard(() => api().wooTestConnection(settings));
export const fetchProducts     = (settings, params)     => guard(() => api().wooFetchProducts(settings, params));
export const createProduct     = (settings, data)       => guard(() => api().wooCreateProduct(settings, data));
export const updateProduct     = (settings, id, data)   => guard(() => api().wooUpdateProduct(settings, id, data));
export const deleteProduct     = (settings, id)         => guard(() => api().wooDeleteProduct(settings, id));
export const fetchOrders       = (settings, params)     => guard(() => api().wooFetchOrders(settings, params));

// ── FTP (online required) ─────────────────────────────────────────────────────
export const testFtpConnection = (settings) => guard(() => api().ftpTestConnection(settings));
export const ftpUploadImage    = (payload)  => guard(() => api().ftpUploadImage(payload));