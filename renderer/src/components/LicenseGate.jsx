import { useState, useEffect } from 'react';

const LicenseGate = ({ onActivated, invalidReason }) => {
  const [key, setKey]               = useState('');
  const [loading, setLoading]       = useState(!invalidReason);
  const [error, setError]           = useState(invalidReason || '');
  const [validating, setValidating] = useState(false);
  const [visible, setVisible]       = useState(false);
  const [offlineWarning, setOfflineWarning] = useState(false);

  useEffect(() => {
    if (invalidReason) {
      setError(invalidReason);
      setLoading(false);
      requestAnimationFrame(() => setVisible(true));
      return;
    }

    const check = async () => {
      const result = await window.electronAPI.licenseCheckCached();
      if (result?.ok) { onActivated(result); return; }
      setLoading(false);
      requestAnimationFrame(() => setVisible(true));
    };
    check();
  }, []);

  useEffect(() => {
    if (invalidReason) {
      setError(invalidReason);
      setLoading(false);
      requestAnimationFrame(() => setVisible(true));
    }
  }, [invalidReason]);

  const handleActivate = async (e) => {
    e.preventDefault();
    if (!key.trim()) return;
    setValidating(true);
    setError('');
    setOfflineWarning(false);
    const result = await window.electronAPI.licenseActivate(key.trim());
    if (result.ok) {
      if (result.offlineActivation) {
        // Let them in but show a brief warning first
        setOfflineWarning(true);
        setTimeout(() => onActivated(result), 2000);
      } else {
        onActivated(result);
      }
    } else {
      setError(result.reason || 'Invalid license key.');
    }
    setValidating(false);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#f5f5f4] dark:bg-[#111110]">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin w-5 h-5 text-gray-400 dark:text-white/30" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="30" strokeDashoffset="10" strokeLinecap="round"/>
          </svg>
          <span className="text-[12px] text-gray-400 dark:text-white/30">Checking license...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex items-center justify-center bg-[#f5f5f4] dark:bg-[#111110] px-6">
      <div
        style={{
          transition: 'opacity 200ms ease, transform 200ms ease',
          opacity:   visible ? 1 : 0,
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(8px)',
        }}
        className="bg-white dark:bg-[#1c1c1b] rounded-2xl w-full max-w-sm overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100 dark:border-white/10">
          <div className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9.5 5.5a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z" stroke="#555" strokeWidth="1.3" className="dark:[stroke:#999]"/>
              <path d="M7 8v1.5M6 10.5h2M5.5 12.5h3" stroke="#555" strokeWidth="1.3" strokeLinecap="round" className="dark:[stroke:#999]"/>
            </svg>
          </div>
          <div>
            <h2 className="text-[13px] font-semibold text-gray-900 dark:text-white/90">
              {invalidReason ? 'License Revoked' : 'Activate License'}
            </h2>
            <p className="text-[11px] text-gray-400 dark:text-white/30 mt-0.5">
              {invalidReason ? 'Re-enter a valid key to continue.' : 'Enter your license key to get started.'}
            </p>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleActivate} className="px-6 py-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-gray-400 dark:text-white/30 uppercase tracking-wider">
              License Key
            </label>
            <input
              type="text"
              value={key}
              onChange={e => setKey(e.target.value)}
              placeholder="PSC-XXXXXXXX-XXXXXXXX-XXXXXXXX"
              className="w-full px-3 py-2 text-[11px] font-mono border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-gray-800 dark:text-white/80 placeholder-gray-300 dark:placeholder-white/20 focus:outline-none focus:border-gray-900 dark:focus:border-white/30 transition-colors"
              required
            />
          </div>

          {/* Offline warning — server unreachable but cache valid */}
          {offlineWarning && (
            <div className="px-3 py-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 text-[12px] flex items-start gap-2">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 mt-0.5">
                <path d="M7 2L12.5 11.5H1.5L7 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                <path d="M7 6v2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <circle cx="7" cy="10" r="0.6" fill="currentColor"/>
              </svg>
              <span>License server unreachable. Running from cached license — verification will resume when the server is back online.</span>
            </div>
          )}

          {/* Error */}
          {error && !offlineWarning && (
            <div className="px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 text-[12px]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={validating || !key.trim() || offlineWarning}
            className="w-full py-2 text-[12px] font-semibold bg-gray-900 dark:bg-white text-white dark:text-[#1a1a1a] rounded-xl hover:bg-black dark:hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {validating ? (
              <>
                <svg className="animate-spin w-3 h-3" viewBox="0 0 12 12" fill="none">
                  <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="14" strokeDashoffset="4" strokeLinecap="round"/>
                </svg>
                Validating...
              </>
            ) : offlineWarning ? 'Resuming…' : 'Activate'}
          </button>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5">
          <p className="text-[11px] text-center text-gray-400 dark:text-white/25">
            No license key? Visit our website to purchase one.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LicenseGate;