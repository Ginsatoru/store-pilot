import React, { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from './components/Navbar.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import ProfileModal from './components/ProfileModal.jsx';
import Products from './pages/Products.jsx';
import Sync from './pages/Sync.jsx';
import Orders from './pages/Orders.jsx';
import Placeholder from './pages/Placeholder.jsx';
import LicenseGate from './components/LicenseGate.jsx';
import { useProducts } from './hooks/useProducts.js';
import { useSync } from './hooks/useSync.js';
import { loadSettings, dbLoadOrders, dbSaveOrders } from './services/woo.js';

function resolveTheme(theme) {
  if (theme === 'Dark')  return 'dark';
  if (theme === 'Light') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', resolveTheme(theme) === 'dark');
}

export default function App() {
  const [page, setPage]                 = useState('Products');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen]   = useState(false);
  const [settings, setSettings]         = useState(null);
  const [syncSettings, setSyncSettings] = useState({ autoSync: false, interval: '15 minutes' });
  const [theme, setTheme]               = useState('Light');
  const [online, setOnline]             = useState(navigator.onLine);
  const [license, setLicense]           = useState(null);
  const [licenseInvalidReason, setLicenseInvalidReason] = useState(null);
  const [licenseWarning, setLicenseWarning]             = useState(null);
  const [orderList, setOrderList]       = useState([]);

  const settingsRef = useRef(null);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const {
    productList, setProductList,
    productLoading, setProductLoading,
    productError, setProductError,
    fetched, setFetched,
    pendingQueue, setPendingQueue,
    loadFromDb,
    doFetchProducts,
    handleQueueChange,
    handleRemoveFromQueue,
    handleClearQueue,
  } = useProducts();

  const { syncing, syncLog, setSyncLog, runSync } = useSync({
    settingsRef,
    setProductList,
    setPendingQueue,
    setOrderList,
    syncSettings,
  });

  // ── Theme ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    applyTheme(theme);
    if (theme === 'System') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const h  = () => applyTheme('System');
      mq.addEventListener('change', h);
      return () => mq.removeEventListener('change', h);
    }
  }, [theme]);

  // ── Online/offline ────────────────────────────────────────────────────────
  useEffect(() => {
    const up   = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online',  up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);

  // ── License listeners ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!window.electronAPI?.onLicenseWarning) return;
    const unsub = window.electronAPI.onLicenseWarning(p => setLicenseWarning(p));
    return () => unsub?.();
  }, []);

  useEffect(() => {
    if (!window.electronAPI?.onLicenseInvalid) return;
    const unsub = window.electronAPI.onLicenseInvalid(async (reason) => {
      setLicenseWarning(null);
      await window.electronAPI.licenseClear();
      setLicenseInvalidReason(reason || 'Your license has been deactivated.');
      setLicense(null);
    });
    return () => unsub?.();
  }, []);

  // ── Boot ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!license) return;
    setLicenseInvalidReason(null);
    setLicenseWarning(null);

    // Save license to profile if not already stored
    if (window.electronAPI?.dbLoadProfile && window.electronAPI?.dbSaveProfile) {
      window.electronAPI.dbLoadProfile().then(res => {
        if (!res?.ok || !res.data) {
          window.electronAPI.dbSaveProfile({
            key: license.key, plan: license.plan, label: license.label,
            features: license.features, expiresAt: license.expiresAt,
            user: license.user, lastValidated: Date.now(),
          }).catch(() => {});
        }
      }).catch(() => {});
    }

    // Load products + queue from SQLite
    loadFromDb().catch(e => console.error('DB load error:', e));

    // Load orders from SQLite
    dbLoadOrders().then(res => {
      if (res.ok && Array.isArray(res.data) && res.data.length > 0) setOrderList(res.data);
    }).catch(() => {});

    // Load settings
    loadSettings().then(s => {
      if (s?.conn?.storeUrl && s?.conn?.consumerKey) {
        setSettings(s.conn);
        settingsRef.current = s.conn;
      } else {
        setProductError('No store connection configured. Open Settings to connect your store.');
        setProductLoading(false);
      }
      if (s?.sync)              setSyncSettings(s.sync);
      if (s?.appearance?.theme) setTheme(s.appearance.theme);
    }).catch(() => { setProductError('Failed to load settings.'); setProductLoading(false); });
  }, [license]);

  // ── Fetch from WooCommerce when settings ready and DB is empty ────────────
  useEffect(() => {
    if (settings && !fetched) doFetchProducts(settings);
  }, [settings, fetched]);

  const handleRefreshProducts = useCallback(() => {
    if (settings) doFetchProducts(settings);
  }, [settings, doFetchProducts]);

  // ── Settings close ────────────────────────────────────────────────────────
  const handleSettingsClose = useCallback(() => {
    setSettingsOpen(false);
    loadSettings().then(s => {
      if (s?.sync)              setSyncSettings(s.sync);
      if (s?.appearance?.theme) setTheme(s.appearance.theme);
      if (s?.conn?.storeUrl && s?.conn?.consumerKey) {
        setSettings(prev => {
          const changed =
            prev?.storeUrl       !== s.conn.storeUrl ||
            prev?.consumerKey    !== s.conn.consumerKey ||
            prev?.consumerSecret !== s.conn.consumerSecret;
          if (changed) { setFetched(false); setOrderList([]); dbSaveOrders([]).catch(() => {}); }
          return s.conn;
        });
      }
    }).catch(() => {});
  }, []);

  // ── License gate ──────────────────────────────────────────────────────────
  if (!license) {
    return <LicenseGate onActivated={setLicense} invalidReason={licenseInvalidReason} />;
  }

  const renderPage = () => {
    switch (page) {
      case 'Products':
        return (
          <Products
            settings={settings}
            productList={productList}
            loading={productLoading}
            error={productError}
            setError={setProductError}
            onRefresh={handleRefreshProducts}
            onQueueChange={handleQueueChange}
            pendingQueue={pendingQueue}
          />
        );
      case 'Orders':
        return <Orders orderList={orderList} syncing={syncing} />;
      case 'Sync':
        return (
          <Sync
            syncing={syncing}
            syncLog={syncLog}
            setSyncLog={setSyncLog}
            pendingQueue={pendingQueue}
            productList={productList}
            onSyncNow={runSync}
            onRemoveFromQueue={handleRemoveFromQueue}
            onClearQueue={handleClearQueue}
            syncSettings={syncSettings}
            online={online}
          />
        );
      default:
        return <Placeholder title={page} />;
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[linear-gradient(to_top,#f3e7e9_0%,#e3eeff_99%,#e3eeff_100%)] dark:bg-none dark:bg-[#111110]">
      <Navbar
        active={page}
        onNavigate={setPage}
        onSettingsOpen={() => setSettingsOpen(true)}
        onProfileOpen={() => setProfileOpen(true)}
        pendingCount={Object.keys(pendingQueue).length}
        online={online}
        licenseWarning={licenseWarning}
      />
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {renderPage()}
      </div>
      {settingsOpen && <SettingsModal onClose={handleSettingsClose} />}
      {profileOpen  && <ProfileModal onClose={() => setProfileOpen(false)} license={license} />}
    </div>
  );
}