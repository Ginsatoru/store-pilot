const { ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const db = require('./db');
const { wooRequest, ftpTestConnection, ftpUploadImage } = require('./woo');
const { activateLicense, checkCachedLicense, validateLicense, getCachedLicense, clearLicenseCache, getMachineId } = require('./license');

const SETTINGS_PATH = path.join(app.getPath('userData'), 'settings.json');

// ── Settings ──────────────────────────────────────────────────────────────────
function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
  } catch (e) { console.error('Failed to load settings:', e); }
  return {};
}

function saveSettings(data) {
  try { fs.writeFileSync(SETTINGS_PATH, JSON.stringify(data, null, 2), 'utf-8'); return { ok: true }; }
  catch (e) { return { ok: false, error: e.message }; }
}

// ── Register all IPC handlers ─────────────────────────────────────────────────
function registerIpcHandlers() {

  // Settings
  ipcMain.handle('settings:load', () => loadSettings());
  ipcMain.handle('settings:save', (_e, data) => saveSettings(data));

  // Products (SQLite)
  ipcMain.handle('db:loadProducts',  () => db.loadProducts());
  ipcMain.handle('db:saveProducts',  (_e, products) => db.saveProducts(products));
  ipcMain.handle('db:clearProducts', () => db.clearProducts());

  // Queue (SQLite)
  ipcMain.handle('db:loadQueue',        () => db.loadQueue());
  ipcMain.handle('db:upsertQueueItem',  (_e, key, item) => db.upsertQueueItem(key, item));
  ipcMain.handle('db:deleteQueueItem',  (_e, key) => db.deleteQueueItem(key));
  ipcMain.handle('db:clearQueue',       () => db.clearQueue());

  // Orders (SQLite)
  ipcMain.handle('db:loadOrders',  () => db.loadOrders());
  ipcMain.handle('db:saveOrders',  (_e, orders) => db.saveOrders(orders));

  // Profile (SQLite)
  ipcMain.handle('db:loadProfile', () => db.loadProfile());
  ipcMain.handle('db:saveProfile', (_e, data) => db.saveProfile(data));

  // WooCommerce
  ipcMain.handle('woo:testConnection', async (_e, settings) => {
    try {
      const res = await wooRequest(settings, '/products?per_page=1');
      return res.ok ? { ok: true, message: 'Connection successful!' } : { ok: false, error: res.error };
    } catch (e) { return { ok: false, error: e.message }; }
  });

  ipcMain.handle('woo:fetchProducts', async (_e, settings, params = {}) => {
    try {
      const query = new URLSearchParams({
        per_page: params.perPage || 100,
        page:     params.page    || 1,
        ...(params.search ? { search: params.search } : {}),
      }).toString();
      return await wooRequest(settings, `/products?${query}`);
    } catch (e) { return { ok: false, error: e.message }; }
  });

  ipcMain.handle('woo:updateProduct', async (_e, settings, productId, data) => {
    try { return await wooRequest(settings, `/products/${productId}`, 'PUT', data); }
    catch (e) { return { ok: false, error: e.message }; }
  });

  ipcMain.handle('woo:createProduct', async (_e, settings, data) => {
    try { return await wooRequest(settings, '/products', 'POST', data); }
    catch (e) { return { ok: false, error: e.message }; }
  });

  ipcMain.handle('woo:deleteProduct', async (_e, settings, productId) => {
    try { return await wooRequest(settings, `/products/${productId}?force=true`, 'DELETE'); }
    catch (e) { return { ok: false, error: e.message }; }
  });

  ipcMain.handle('woo:fetchOrders', async (_e, settings, params = {}) => {
    try {
      const query = new URLSearchParams({
        per_page: params.perPage || 100,
        page:     params.page    || 1,
        orderby:  params.orderby || 'date',
        order:    params.order   || 'desc',
        ...(params.status ? { status: params.status } : {}),
        ...(params.search ? { search: params.search } : {}),
      }).toString();
      return await wooRequest(settings, `/orders?${query}`);
    } catch (e) { return { ok: false, error: e.message }; }
  });

  // FTP
  ipcMain.handle('ftp:testConnection', async (_e, settings) => {
    try { return await ftpTestConnection(settings); }
    catch (e) { return { ok: false, error: e.message }; }
  });

  ipcMain.handle('ftp:uploadImage', async (_e, { ftpSettings, fileData, fileName }) => {
    try {
      return await ftpUploadImage({
        host:       ftpSettings.host,
        port:       ftpSettings.port,
        user:       ftpSettings.user,
        pass:       ftpSettings.pass,
        remotePath: ftpSettings.path,
        fileData,
        fileName,
      });
    } catch (e) { return { ok: false, error: e.message }; }
  });

  // License
  ipcMain.handle('license:activate', async (_e, key) => {
    try { return await activateLicense(key); }
    catch (e) { return { ok: false, reason: e.message }; }
  });

  ipcMain.handle('license:checkCached', () => {
    return checkCachedLicense();
  });

  ipcMain.handle('license:validate', async (_e, key) => {
    try { return await validateLicense(key); }
    catch (e) { return { ok: false, reason: e.message }; }
  });

  ipcMain.handle('license:getCached', () => {
    return getCachedLicense();
  });

  ipcMain.handle('license:clear', () => {
    clearLicenseCache();
    return { ok: true };
  });

  // Machine ID
  ipcMain.handle('license:getMachineId', () => {
    return getMachineId();
  });
}

module.exports = { registerIpcHandlers };