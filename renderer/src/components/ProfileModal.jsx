import React, { useState, useEffect } from 'react';
import {
  RiUserLine,
  RiShieldCheckLine,
  RiRefreshLine,
  RiFileCopyLine,
  RiCheckLine,
  RiErrorWarningLine,
  RiCalendarLine,
  RiComputerLine,
  RiMedalLine,
  RiCloseLine,
} from 'react-icons/ri';

// ── Helpers ───────────────────────────────────────────────────────────────────
function maskKey(key) {
  if (!key) return '—';
  if (key.length <= 8) return key;
  return key.slice(0, 4) + '•'.repeat(12) + key.slice(-4);
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function daysUntil(iso) {
  if (!iso) return null;
  const diff = Math.ceil((new Date(iso) - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
}

function SectionHeader({ icon, title }) {
  return (
    <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-white/10">
      <div className="w-6 h-6 rounded-md bg-gray-900 dark:bg-white flex items-center justify-center flex-shrink-0">
        <span className="text-white dark:text-[#1a1a1a]">{icon}</span>
      </div>
      <h3 className="text-[12px] font-semibold text-gray-800 dark:text-white/80">{title}</h3>
    </div>
  );
}

function InfoRow({ label, value, mono }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold text-gray-400 dark:text-white/30 uppercase tracking-wider">{label}</span>
      <span className={`text-[13px] text-gray-800 dark:text-white/80 ${mono ? 'font-mono text-[11px]' : 'font-medium'}`}>
        {value || '—'}
      </span>
    </div>
  );
}

function CopyableKey({ licenseKey }) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(licenseKey || '').then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold text-gray-400 dark:text-white/30 uppercase tracking-wider">License Key</span>
      <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 rounded-xl px-3 py-2 border border-gray-200 dark:border-white/10">
        <span
          className="flex-1 text-[11px] font-mono text-gray-700 dark:text-white/70 truncate cursor-pointer select-none"
          onClick={() => setRevealed(v => !v)}
          title="Click to reveal/hide"
        >
          {revealed ? (licenseKey || '—') : maskKey(licenseKey)}
        </span>
        <button
          onClick={handleCopy}
          className="flex-shrink-0 text-gray-400 dark:text-white/30 hover:text-gray-700 dark:hover:text-white/70 transition-colors"
          title="Copy key"
        >
          {copied ? <RiCheckLine size={13} className="text-emerald-500" /> : <RiFileCopyLine size={13} />}
        </button>
      </div>
      <span className="text-[10px] text-gray-400 dark:text-white/20 mt-0.5">Click key to reveal • Click icon to copy</span>
    </div>
  );
}

function PlanBadge({ plan, label }) {
  const colors = {
    basic:      'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/50',
    pro:        'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400',
    enterprise: 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${colors[plan] || colors.basic}`}>
      <RiMedalLine size={11} />
      {label || plan || 'Unknown'}
    </span>
  );
}

function ExpiryStatus({ expiresAt }) {
  const days = daysUntil(expiresAt);
  if (days === null) return <span className="text-[12px] text-gray-500 dark:text-white/40">—</span>;

  let color = 'text-emerald-600 dark:text-emerald-400';
  let bg    = 'bg-emerald-50 dark:bg-emerald-950/40';
  let msg   = `${days} days remaining`;

  if (days <= 0) {
    color = 'text-red-600 dark:text-red-400';
    bg    = 'bg-red-50 dark:bg-red-950/40';
    msg   = 'Expired';
  } else if (days <= 7) {
    color = 'text-red-500 dark:text-red-400';
    bg    = 'bg-red-50 dark:bg-red-950/40';
    msg   = `Expires in ${days} day${days === 1 ? '' : 's'}`;
  } else if (days <= 30) {
    color = 'text-orange-500 dark:text-orange-400';
    bg    = 'bg-orange-50 dark:bg-orange-950/40';
    msg   = `Expires in ${days} days`;
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${color} ${bg}`}>
      <RiCalendarLine size={11} />
      {msg}
    </span>
  );
}



// ── Main Modal ────────────────────────────────────────────────────────────────
export default function ProfileModal({ onClose, license }) {
  const [visible, setVisible]     = useState(false);
  const [profile, setProfile]     = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState(null);
  const [machineId, setMachineId] = useState('—');

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  // Load profile: SQLite first, fall back to license cache
  useEffect(() => {
    async function load() {
      // Try SQLite first
      if (window.electronAPI?.dbLoadProfile) {
        const res = await window.electronAPI.dbLoadProfile();
        if (res?.ok && res.data) {
          setProfile(res.data);
          return;
        }
      }
      // Fall back to license cache passed as prop
      if (license) {
        setProfile(license);
      }
    }
    load().catch(() => {
      if (license) setProfile(license);
    });
  }, [license]);

  // Load machine ID
  useEffect(() => {
    if (window.electronAPI?.getMachineId) {
      window.electronAPI.getMachineId().then(id => {
        if (id) setMachineId(id.slice(0, 8) + '••••••••' + id.slice(-4));
      }).catch(() => {});
    }
  }, []);

  // Refresh: hit server via licenseValidate, update SQLite
  const handleRefresh = async () => {
    if (!license?.key) return;
    setRefreshing(true);
    setRefreshMsg(null);
    try {
      const res = await window.electronAPI.licenseValidate(license.key);
      if (res?.ok) {
        const updated = {
          key:       license.key,
          plan:      res.plan,
          label:     res.label,
          features:  res.features,
          expiresAt: res.expiresAt,
          user:      res.user,
          lastValidated: Date.now(),
        };
        await window.electronAPI.dbSaveProfile(updated);
        setProfile(updated);
        setRefreshMsg({ ok: true, text: 'Profile refreshed.' });
      } else {
        setRefreshMsg({ ok: false, text: res?.reason || 'Failed to refresh.' });
      }
    } catch (e) {
      setRefreshMsg({ ok: false, text: e.message || 'Network error.' });
    }
    setRefreshing(false);
    setTimeout(() => setRefreshMsg(null), 3000);
  };

  const user      = profile?.user       || {};
  const plan      = profile?.plan       || license?.plan;
  const label     = profile?.label      || license?.label;
  const expiresAt = profile?.expiresAt  || license?.expiresAt;
  const licKey    = profile?.key        || license?.key;
  const lastSync  = profile?.lastValidated
    ? new Date(profile.lastValidated).toLocaleString()
    : '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{ transition: 'opacity 200ms ease', opacity: visible ? 1 : 0 }}
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
      />

      {/* Modal */}
      <div
        style={{
          transition: 'opacity 200ms ease, transform 200ms ease',
          opacity:   visible ? 1 : 0,
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(8px)',
        }}
        className="relative bg-white dark:bg-[#1c1c1b] rounded-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-white/10 flex items-center justify-center">
              <RiUserLine size={14} className="text-gray-500 dark:text-white/50" />
            </div>
            <div>
              <h2 className="text-[13px] font-semibold text-gray-900 dark:text-white/90">Profile</h2>
              <p className="text-[11px] text-gray-400 dark:text-white/30 mt-0.5">Account & license details</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-white/10 hover:bg-gray-900 dark:hover:bg-white hover:text-white dark:hover:text-[#1a1a1a] flex items-center justify-center text-gray-500 dark:text-white/40 transition-colors text-[16px]"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-6 py-5 flex flex-col gap-6">

          {/* User Info */}
          <section className="flex flex-col gap-3">
            <SectionHeader icon={<RiUserLine size={12} />} title="Account" />

            {/* Avatar + name row */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
                <span className="text-[15px] font-semibold text-gray-500 dark:text-white/50">
                  {user.name ? user.name[0].toUpperCase() : '?'}
                </span>
              </div>
              <div>
                <p className="text-[13px] font-semibold text-gray-800 dark:text-white/80">{user.name || '—'}</p>
                <p className="text-[11px] text-gray-400 dark:text-white/40">{user.email || '—'}</p>
              </div>
            </div>
          </section>

          {/* License Info */}
          <section className="flex flex-col gap-3">
            <SectionHeader icon={<RiShieldCheckLine size={12} />} title="License" />

            <CopyableKey licenseKey={licKey} />

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-gray-400 dark:text-white/30 uppercase tracking-wider">Plan</span>
                <PlanBadge plan={plan} label={label} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-gray-400 dark:text-white/30 uppercase tracking-wider">Status</span>
                <ExpiryStatus expiresAt={expiresAt} />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-gray-400 dark:text-white/30 uppercase tracking-wider">Expiry Date</span>
              <span className="text-[13px] font-medium text-gray-800 dark:text-white/80">{formatDate(expiresAt)}</span>
            </div>


          </section>

          {/* Machine Info */}
          <section className="flex flex-col gap-3">
            <SectionHeader icon={<RiComputerLine size={12} />} title="This Machine" />
            <div className="grid grid-cols-1 gap-2">
              <InfoRow label="Machine ID" value={machineId} mono />
              <InfoRow label="Last Validated" value={lastSync} />
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5">
          {refreshMsg && (
            <span className={`text-[12px] mr-auto flex items-center gap-1 ${refreshMsg.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
              {refreshMsg.ok ? <RiCheckLine size={13} /> : <RiErrorWarningLine size={13} />}
              {refreshMsg.text}
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing || !license?.key}
            className="flex items-center gap-1.5 text-[12px] font-medium text-gray-600 dark:text-white/50 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 transition-colors disabled:opacity-40"
          >
            <RiRefreshLine size={13} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <button
            onClick={handleClose}
            className="text-[12px] font-semibold bg-gray-900 dark:bg-white text-white dark:text-[#1a1a1a] px-5 py-2 rounded-xl hover:bg-black dark:hover:bg-white/90 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}