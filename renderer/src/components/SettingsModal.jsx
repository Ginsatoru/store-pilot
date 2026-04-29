import React, { useState, useEffect } from 'react';
import { loadSettings, saveSettings, testConnection, testFtpConnection } from '../services/woo.js';

const TABS      = ['Connection', 'Synchronization', 'Appearance'];
const INTERVALS = ['5 minutes', '15 minutes', '30 minutes', '1 hour', '2 hours', '6 hours'];

function Toggle({ on, onChange }) {
  return (
    <div
      onClick={() => onChange(!on)}
      className={`w-11 h-6 rounded-full cursor-pointer transition-colors relative flex-shrink-0 ${on ? 'bg-gray-900 dark:bg-white' : 'bg-gray-200 dark:bg-white/20'}`}
    >
      <div className={`absolute top-0.5 w-5 h-5 rounded-full transition-transform ${on ? 'left-[23px] bg-white dark:bg-[#1a1a1a]' : 'left-0.5 bg-white dark:bg-white/70'}`} />
    </div>
  );
}

function Field({ label, value, onChange, placeholder, mono, password }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold text-gray-400 dark:text-white/30 uppercase tracking-wider">{label}</label>
      <input
        type={password ? 'password' : 'text'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 text-[12px] border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-gray-800 dark:text-white/80 placeholder-gray-400 dark:placeholder-white/20 focus:outline-none focus:border-gray-900 dark:focus:border-white/30 transition-colors ${mono ? 'font-mono text-[11px]' : ''}`}
      />
    </div>
  );
}

function StatusBadge({ result }) {
  if (!result) return null;
  return (
    <div className={`text-[12px] px-3 py-2 rounded-xl ${result.ok ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400'}`}>
      {result.ok ? result.message : result.error}
    </div>
  );
}

function TestButton({ onClick, testing, label = 'Test Connection' }) {
  return (
    <button
      onClick={onClick}
      disabled={testing}
      className="flex-shrink-0 flex items-center gap-1.5 text-[12px] font-medium bg-gray-100 dark:bg-white/10 hover:bg-gray-900 dark:hover:bg-white hover:text-white dark:hover:text-[#1a1a1a] text-gray-600 dark:text-white/50 px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
    >
      {testing ? (
        <>
          <svg className="animate-spin w-3 h-3" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="14" strokeDashoffset="4" strokeLinecap="round"/>
          </svg>
          Testing…
        </>
      ) : label}
    </button>
  );
}

function SectionHeader({ icon, title }) {
  return (
    <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-white/10">
      <div className="w-6 h-6 rounded-md bg-gray-900 dark:bg-white flex items-center justify-center">
        <span className="dark:[&_*]:stroke-[#1a1a1a]">{icon}</span>
      </div>
      <h3 className="text-[12px] font-semibold text-gray-800 dark:text-white/80">{title}</h3>
    </div>
  );
}

function ConnectionTab({ conn, setConn }) {
  const [testingApi, setTestingApi] = useState(false);
  const [apiResult,  setApiResult]  = useState(null);
  const [testingFtp, setTestingFtp] = useState(false);
  const [ftpResult,  setFtpResult]  = useState(null);

  const handleTestApi = async () => {
    setTestingApi(true); setApiResult(null);
    try {
      const res = await testConnection({ storeUrl: conn.storeUrl, consumerKey: conn.consumerKey, consumerSecret: conn.consumerSecret });
      setApiResult(res);
    } catch (e) { setApiResult({ ok: false, error: e.message }); }
    setTestingApi(false);
  };

  const handleTestFtp = async () => {
    setTestingFtp(true); setFtpResult(null);
    try {
      const res = await testFtpConnection({ host: conn.ftpHost, port: conn.ftpPort, user: conn.ftpUser, pass: conn.ftpPass, path: conn.ftpPath });
      setFtpResult(res);
    } catch (e) { setFtpResult({ ok: false, error: e.message }); }
    setTestingFtp(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <SectionHeader title="WooCommerce API" icon={
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 6c0-2.76 2.24-5 5-5s5 2.24 5 5-2.24 5-5 5-5-2.24-5-5z" stroke="white" strokeWidth="1.2"/>
            <path d="M6 4v2l1.5 1.5" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        } />
        <Field label="Store URL"       value={conn.storeUrl}       onChange={v => setConn(p => ({ ...p, storeUrl: v }))}       placeholder="https://yourstore.com" />
        <Field label="Consumer Key"    value={conn.consumerKey}    onChange={v => setConn(p => ({ ...p, consumerKey: v }))}    placeholder="ck_..." mono />
        <Field label="Consumer Secret" value={conn.consumerSecret} onChange={v => setConn(p => ({ ...p, consumerSecret: v }))} placeholder="cs_..." password />
        <div className="flex items-center gap-3">
          <TestButton onClick={handleTestApi} testing={testingApi} />
          <StatusBadge result={apiResult} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeader title="FTP Settings" icon={
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect x="1" y="2" width="10" height="8" rx="1.5" stroke="white" strokeWidth="1.2"/>
            <path d="M1 5h10" stroke="white" strokeWidth="1.2"/>
          </svg>
        } />
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <Field label="FTP Host" value={conn.ftpHost} onChange={v => setConn(p => ({ ...p, ftpHost: v }))} placeholder="ftp.yourstore.com" />
          </div>
          <Field label="Port" value={conn.ftpPort} onChange={v => setConn(p => ({ ...p, ftpPort: v }))} placeholder="21" />
        </div>
        <Field label="Username"    value={conn.ftpUser} onChange={v => setConn(p => ({ ...p, ftpUser: v }))} placeholder="ftp@yourstore.com" />
        <Field label="Password"    value={conn.ftpPass} onChange={v => setConn(p => ({ ...p, ftpPass: v }))} placeholder="••••••••" password />
        <Field label="Upload Path" value={conn.ftpPath} onChange={v => setConn(p => ({ ...p, ftpPath: v }))} placeholder="public_html/wp-content/uploads/" mono />
        <div className="flex items-center gap-3">
          <TestButton onClick={handleTestFtp} testing={testingFtp} label="Test FTP Connection" />
          <StatusBadge result={ftpResult} />
        </div>
      </section>
    </div>
  );
}

function SyncTab({ sync, setSync }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
        <div>
          <p className="text-[13px] font-semibold text-gray-800 dark:text-white/80">Auto Sync</p>
          <p className="text-[11px] text-gray-400 dark:text-white/30 mt-0.5">Automatically push pending changes to WooCommerce</p>
        </div>
        <Toggle on={sync.autoSync} onChange={v => setSync(p => ({ ...p, autoSync: v }))} />
      </div>

      {sync.autoSync && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-semibold text-gray-400 dark:text-white/30 uppercase tracking-wider">Sync Interval</label>
          <div className="grid grid-cols-3 gap-2">
            {INTERVALS.map(iv => (
              <button
                key={iv}
                onClick={() => setSync(p => ({ ...p, interval: iv }))}
                className={`px-3 py-2 rounded-xl border text-[12px] font-medium transition-colors ${
                  sync.interval === iv
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-[#1a1a1a] border-gray-900 dark:border-white'
                    : 'bg-white dark:bg-white/5 text-gray-600 dark:text-white/50 border-gray-200 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/25'
                }`}
              >
                {iv}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 dark:text-white/30 mt-1">
            Sync will run every {sync.interval} while the app is open.
          </p>
        </div>
      )}
    </div>
  );
}

function AppearanceTab({ appearance, setAppearance }) {
  const themes = [
    { name: 'Light',  icon: '☀️', desc: 'Clean white interface', preview: 'bg-gray-100' },
    { name: 'Dark',   icon: '🌙', desc: 'Easy on the eyes',      preview: 'bg-gray-900' },
    { name: 'System', icon: '⊙',  desc: 'Follows OS setting',    preview: 'bg-gradient-to-br from-white to-gray-800' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="text-[10px] font-semibold text-gray-400 dark:text-white/30 uppercase tracking-wider block mb-3">Theme</label>
        <div className="grid grid-cols-3 gap-3">
          {themes.map(t => (
            <button
              key={t.name}
              onClick={() => setAppearance(p => ({ ...p, theme: t.name }))}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                appearance.theme === t.name
                  ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-white/10'
                  : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
              }`}
            >
              <div className={`w-full aspect-video rounded-lg overflow-hidden flex flex-col gap-1 p-1.5 ${t.preview}`}>
                <div className={`h-1.5 w-3/4 rounded-full ${t.name === 'Dark' ? 'bg-gray-700' : 'bg-gray-300'}`} />
                <div className={`h-1.5 w-1/2 rounded-full ${t.name === 'Dark' ? 'bg-gray-600' : 'bg-gray-200'}`} />
                <div className={`mt-auto h-2 w-1/3 rounded-full ${t.name === 'Dark' ? 'bg-white/20' : 'bg-gray-900/20'}`} />
              </div>
              <span className="text-[13px]">{t.icon}</span>
              <div className="text-center">
                <p className={`text-[12px] font-semibold ${appearance.theme === t.name ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-white/40'}`}>{t.name}</p>
                <p className="text-[10px] text-gray-400 dark:text-white/25 mt-0.5">{t.desc}</p>
              </div>
              {appearance.theme === t.name && <div className="w-1.5 h-1.5 rounded-full bg-gray-900 dark:bg-white" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SettingsModal({ onClose }) {
  const [tab, setTab]         = useState('Connection');
  const [saving, setSaving]   = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  const [conn, setConn] = useState({
    storeUrl: '', consumerKey: '', consumerSecret: '',
    ftpHost: '', ftpPort: '21', ftpUser: '', ftpPass: '',
    ftpPath: 'public_html/wp-content/uploads/',
  });
  const [sync, setSync]             = useState({ autoSync: true, interval: '5 minutes' });
  const [appearance, setAppearance] = useState({ theme: 'Light' });

  useEffect(() => {
    loadSettings().then(s => {
      if (!s) return;
      if (s.conn)       setConn(prev       => ({ ...prev, ...s.conn }));
      if (s.sync)       setSync(prev       => ({ ...prev, ...s.sync }));
      if (s.appearance) setAppearance(prev => ({ ...prev, ...s.appearance }));
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true); setSaveMsg(null);
    const res = await saveSettings({ conn, sync, appearance });
    setSaving(false);
    if (res?.ok) {
      setSaveMsg({ ok: true, text: 'Settings saved.' });
      setTimeout(() => { setSaveMsg(null); handleClose(); }, 800);
    } else {
      setSaveMsg({ ok: false, text: res?.error || 'Failed to save.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div
        onClick={handleClose}
        style={{ transition: 'opacity 200ms ease', opacity: visible ? 1 : 0 }}
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
      />
      <div
        style={{
          transition: 'opacity 200ms ease, transform 200ms ease',
          opacity:   visible ? 1 : 0,
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(8px)',
        }}
        className="relative bg-white dark:bg-[#1c1c1b] rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-white/10 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="2.2" stroke="#555" strokeWidth="1.3" className="dark:[stroke:#999]"/>
                <path d="M7 1.5v1.5M7 11v1.5M1.5 7H3M11 7h1.5M3.1 3.1l1 1M9.9 9.9l1 1M9.9 3.1l-1 1M4.1 9.9l-1 1" stroke="#555" strokeWidth="1.3" strokeLinecap="round" className="dark:[stroke:#999]"/>
              </svg>
            </div>
            <div>
              <h2 className="text-[13px] font-semibold text-gray-900 dark:text-white/90">Settings</h2>
              <p className="text-[11px] text-gray-400 dark:text-white/30 mt-0.5">WooCommerce store configuration</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-white/10 hover:bg-gray-900 dark:hover:bg-white hover:text-white dark:hover:text-[#1a1a1a] flex items-center justify-center text-gray-500 dark:text-white/40 transition-colors text-[16px]"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0.5 px-4 pt-3 pb-0">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3.5 py-1.5 rounded-xl text-[12px] font-medium transition-colors ${
                tab === t
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-[#1a1a1a]'
                  : 'text-gray-500 dark:text-white/40 hover:bg-gray-100 dark:hover:bg-white/10'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-6 py-5">
          {tab === 'Connection'      && <ConnectionTab  conn={conn}             setConn={setConn}             />}
          {tab === 'Synchronization' && <SyncTab        sync={sync}             setSync={setSync}             />}
          {tab === 'Appearance'      && <AppearanceTab  appearance={appearance} setAppearance={setAppearance} />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5">
          {saveMsg && (
            <span className={`text-[12px] mr-auto ${saveMsg.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
              {saveMsg.text}
            </span>
          )}
          <button
            onClick={handleClose}
            className="text-[12px] font-medium text-gray-600 dark:text-white/50 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-[12px] font-semibold bg-gray-900 dark:bg-white text-white dark:text-[#1a1a1a] px-5 py-2 rounded-xl hover:bg-black dark:hover:bg-white/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}