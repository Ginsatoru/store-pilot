const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  version:  process.versions.electron,

  // Settings
  settingsLoad: ()       => ipcRenderer.invoke('settings:load'),
  settingsSave: (data)   => ipcRenderer.invoke('settings:save', data),

  // DB — Products
  dbLoadProducts:  ()         => ipcRenderer.invoke('db:loadProducts'),
  dbSaveProducts:  (products) => ipcRenderer.invoke('db:saveProducts', products),
  dbClearProducts: ()         => ipcRenderer.invoke('db:clearProducts'),

  // DB — Queue
  dbLoadQueue:       ()          => ipcRenderer.invoke('db:loadQueue'),
  dbUpsertQueueItem: (key, item) => ipcRenderer.invoke('db:upsertQueueItem', key, item),
  dbDeleteQueueItem: (key)       => ipcRenderer.invoke('db:deleteQueueItem', key),
  dbClearQueue:      ()          => ipcRenderer.invoke('db:clearQueue'),

  // DB — Orders
  dbLoadOrders:  ()       => ipcRenderer.invoke('db:loadOrders'),
  dbSaveOrders:  (orders) => ipcRenderer.invoke('db:saveOrders', orders),

  // DB — Profile
  dbLoadProfile:  ()     => ipcRenderer.invoke('db:loadProfile'),
  dbSaveProfile:  (data) => ipcRenderer.invoke('db:saveProfile', data),

  // WooCommerce
  wooTestConnection: (settings)           => ipcRenderer.invoke('woo:testConnection', settings),
  wooFetchProducts:  (settings, params)   => ipcRenderer.invoke('woo:fetchProducts', settings, params),
  wooCreateProduct:  (settings, data)     => ipcRenderer.invoke('woo:createProduct', settings, data),
  wooUpdateProduct:  (settings, id, data) => ipcRenderer.invoke('woo:updateProduct', settings, id, data),
  wooDeleteProduct:  (settings, id)       => ipcRenderer.invoke('woo:deleteProduct', settings, id),
  wooFetchOrders:    (settings, params)   => ipcRenderer.invoke('woo:fetchOrders', settings, params),

  // FTP
  ftpTestConnection: (settings) => ipcRenderer.invoke('ftp:testConnection', settings),
  ftpUploadImage:    (payload)  => ipcRenderer.invoke('ftp:uploadImage', payload),

  // License
  licenseActivate:    (key) => ipcRenderer.invoke('license:activate', key),
  licenseCheckCached: ()    => ipcRenderer.invoke('license:checkCached'),
  licenseValidate:    (key) => ipcRenderer.invoke('license:validate', key),
  licenseGetCached:   ()    => ipcRenderer.invoke('license:getCached'),
  licenseClear:       ()    => ipcRenderer.invoke('license:clear'),
  getMachineId:       ()    => ipcRenderer.invoke('license:getMachineId'),

  // Listeners — each returns a cleanup function
  onLicenseInvalid: (cb) => {
    const handler = (_e, reason) => cb(reason);
    ipcRenderer.on('license:invalid', handler);
    return () => ipcRenderer.removeListener('license:invalid', handler);
  },

  onLicenseWarning: (cb) => {
    const handler = (_e, payload) => cb(payload); // { reason, remaining }
    ipcRenderer.on('license:warning', handler);
    return () => ipcRenderer.removeListener('license:warning', handler);
  },
});