import React, { useState, useEffect, useRef } from 'react';
import Icon from '../../../electron/icons/icon.png';
import {
  RiDashboardLine,
  RiArchiveLine,
  RiStackLine,
  RiShoppingBag2Line,
  RiBarChartLine,
  RiRefreshLine,
  RiSettings3Line,
  RiMenuLine,
  RiNotification3Line,
  RiUserLine,
  RiWifiOffLine,
  RiWifiLine,
} from 'react-icons/ri';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: <RiDashboardLine size={13} /> },
  { label: 'Products',  icon: <RiArchiveLine size={13} /> },
  { label: 'Inventory', icon: <RiStackLine size={13} /> },
  { label: 'Orders',    icon: <RiShoppingBag2Line size={13} /> },
  { label: 'Analytics', icon: <RiBarChartLine size={13} /> },
  { label: 'Sync',      icon: <RiRefreshLine size={13} /> },
];

const statusStyles = {
  offline: 'text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400',
  online:  'text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400',
};

function StatusPill({ visible, type, icon, label, mobile }) {
  const [rendered, setRendered] = useState(false);
  const [show, setShow]         = useState(false);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setShow(true)));
    } else {
      setShow(false);
      const t = setTimeout(() => setRendered(false), 300);
      return () => clearTimeout(t);
    }
  }, [visible]);

  if (!rendered) return null;

  const base = mobile
    ? 'flex items-center gap-1 text-[11px] font-medium'
    : 'hidden sm:flex h-full items-center gap-1.5 text-[11px] font-medium px-3 rounded-full';

  return (
    <span
      className={`${base} ${statusStyles[type]} transition-all duration-300 ease-in-out ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'
      }`}
    >
      {icon}
      {label}
    </span>
  );
}

export default function Navbar({ active, onNavigate, onSettingsOpen, storeDomain, pendingCount, online }) {
  const [menuOpen, setMenuOpen]           = useState(false);
  const [showBackOnline, setShowBackOnline] = useState(false);
  const prevOnline = useRef(online);

  useEffect(() => {
    if (!prevOnline.current && online) {
      setShowBackOnline(true);
      const timer = setTimeout(() => setShowBackOnline(false), 2000);
      return () => clearTimeout(timer);
    }
    prevOnline.current = online;
  }, [online]);

  const showOffline = !online && !showBackOnline;

  return (
    <header className="flex-shrink-0" style={{ WebkitAppRegion: 'drag' }}>
      <div className="flex items-center justify-between px-3 h-[52px] gap-2">

        {/* Logo */}
        <div
          className="rounded-2xl px-3 py-1.5 flex items-center gap-2 bg-white dark:bg-white/10 flex-shrink-0"
          style={{ WebkitAppRegion: 'no-drag' }}
        >
          <div className="w-5 h-5 rounded-md overflow-hidden flex items-center justify-center">
            <img src={Icon} alt="logo" className="w-full h-full object-contain" />
          </div>
          <span className="text-[13px] font-semibold tracking-tight text-[#1a1a1a] dark:text-white hidden sm:block">
            Store Pilot
          </span>
        </div>

        {/* Center tabs */}
        <nav
          className="hidden lg:flex items-center gap-0.5 bg-white dark:bg-white/10 rounded-2xl px-1.5 py-1.5 shadow-sm"
          style={{ WebkitAppRegion: 'no-drag' }}
        >
          {NAV_ITEMS.map(({ label, icon }) => {
            const isActive = label === active;
            return (
              <button
                key={label}
                onClick={() => onNavigate(label)}
                className={`relative px-3 py-1 rounded-full text-[13px] font-medium transition-all duration-150 flex items-center gap-1.5 whitespace-nowrap ${
                  isActive
                    ? 'bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a]'
                    : 'text-[#555] dark:text-white/60 hover:bg-[#1a1a1a] dark:hover:bg-white hover:text-white dark:hover:text-[#1a1a1a]'
                }`}
              >
                {icon}
                {label}
                {label === 'Sync' && pendingCount > 0 && (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none ${
                    isActive ? 'bg-white/20 text-white dark:bg-black/20 dark:text-black' : 'bg-yellow-300 text-yellow-900'
                  }`}>
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right side */}
        <div
          className="flex items-center gap-1.5 h-8 flex-shrink-0"
          style={{ WebkitAppRegion: 'no-drag' }}
        >
          {storeDomain && (
            <span className="hidden md:flex h-full items-center text-[11px] font-mono text-[#666] dark:text-white/50 bg-white dark:bg-white/10 px-3 rounded-full max-w-[200px] truncate">
              {storeDomain.replace(/^https?:\/\//, '').replace(/\/$/, '')}
            </span>
          )}

          <StatusPill visible={showOffline}    type="offline" icon={<RiWifiOffLine size={12} />} label="Offline"      />
          <StatusPill visible={showBackOnline} type="online"  icon={<RiWifiLine    size={12} />} label="Back Online"  />

          <button
            onClick={onSettingsOpen}
            className="h-full hidden sm:flex items-center gap-1.5 text-[13px] font-medium text-[#555] dark:text-white/60 hover:text-white hover:bg-[#1a1a1a] dark:hover:bg-white dark:hover:text-[#1a1a1a] bg-white dark:bg-white/10 rounded-full px-3 transition-all duration-150"
          >
            <RiSettings3Line size={15} />
            Setting
          </button>

          <button className="w-8 h-8 rounded-full bg-white dark:bg-white/10 hidden sm:flex items-center justify-center text-[#666] dark:text-white/50 hover:text-white dark:hover:text-[#1a1a1a] hover:bg-[#1a1a1a] dark:hover:bg-white transition-all duration-150">
            <RiNotification3Line size={15} />
          </button>

          <button className="w-8 h-8 rounded-full bg-white dark:bg-white/10 hidden sm:flex items-center justify-center text-[#666] dark:text-white/50 hover:text-white dark:hover:text-[#1a1a1a] hover:bg-[#1a1a1a] dark:hover:bg-white transition-all duration-150">
            <RiUserLine size={15} />
          </button>

          <button
            className="lg:hidden w-8 h-8 rounded-full bg-white dark:bg-white/10 flex items-center justify-center text-[#666] dark:text-white/50 hover:text-white hover:bg-[#1a1a1a] dark:hover:bg-white dark:hover:text-[#1a1a1a] transition-all duration-150"
            onClick={() => setMenuOpen(v => !v)}
            style={{ WebkitAppRegion: 'no-drag' }}
          >
            <RiMenuLine size={15} />
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div
          className="lg:hidden bg-white dark:bg-[#1c1c1b] mx-3 mb-2 rounded-2xl shadow-md overflow-hidden"
          style={{ WebkitAppRegion: 'no-drag' }}
        >
          {NAV_ITEMS.map(({ label, icon }) => {
            const isActive = label === active;
            return (
              <button
                key={label}
                onClick={() => { onNavigate(label); setMenuOpen(false); }}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a]'
                    : 'text-[#555] dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/10'
                }`}
              >
                {icon}
                {label}
                {label === 'Sync' && pendingCount > 0 && (
                  <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-yellow-300 text-yellow-900">
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}

          <div className="border-t border-gray-100 dark:border-white/10 px-4 py-2.5 flex items-center justify-between">
            {storeDomain && (
              <span className="text-[11px] font-mono text-[#666] dark:text-white/40 truncate max-w-[150px]">
                {storeDomain.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </span>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <StatusPill visible={showOffline}    type="offline" icon={<RiWifiOffLine size={12} />} label="Offline"     mobile />
              <StatusPill visible={showBackOnline} type="online"  icon={<RiWifiLine    size={12} />} label="Back Online" mobile />
              <button
                onClick={onSettingsOpen}
                className="flex items-center gap-1 text-[13px] text-[#555] dark:text-white/60 hover:text-black dark:hover:text-white"
              >
                <RiSettings3Line size={14} /> Settings
              </button>
              <RiNotification3Line size={15} className="text-[#666] dark:text-white/40" />
              <RiUserLine          size={15} className="text-[#666] dark:text-white/40" />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}