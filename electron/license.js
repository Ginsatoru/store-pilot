const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const http = require('http');

const LICENSE_PATH = path.join(app.getPath('userData'), 'license.json');
const API_URL = 'http://localhost:5000/api/licenses/validate'; // change to production URL
const ENCRYPTION_KEY = 'psc-woo-manager-secret-key-32byte'; // 32 chars

// ── Encrypt / Decrypt ─────────────────────────────────────────────────────────
function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  const [ivHex, encryptedHex] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString();
}

// ── Machine ID ────────────────────────────────────────────────────────────────
function getMachineId() {
  const id = `${process.platform}-${require('os').hostname()}-${require('os').cpus()[0]?.model || 'cpu'}`;
  return crypto.createHash('sha256').update(id).digest('hex').slice(0, 32);
}

// ── HTTP request helper ───────────────────────────────────────────────────────
function httpPost(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const urlObj = new URL(url);
    const lib = urlObj.protocol === 'https:' ? https : http;

    const req = lib.request({
      hostname: urlObj.hostname,
      port:     urlObj.port,
      path:     urlObj.pathname,
      method:   'POST',
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch (_) { resolve({ status: res.statusCode, data: {} }); }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Request timeout')); });
    req.write(data);
    req.end();
  });
}

// ── Save / Load / Clear license cache ────────────────────────────────────────
function saveLicenseCache(data) {
  try {
    const encrypted = encrypt(JSON.stringify(data));
    fs.writeFileSync(LICENSE_PATH, encrypted, 'utf-8');
  } catch (e) { console.error('Failed to save license:', e); }
}

function loadLicenseCache() {
  try {
    if (!fs.existsSync(LICENSE_PATH)) return null;
    const encrypted = fs.readFileSync(LICENSE_PATH, 'utf-8');
    return JSON.parse(decrypt(encrypted));
  } catch (_) { return null; }
}

function clearLicenseCache() {
  try { if (fs.existsSync(LICENSE_PATH)) fs.unlinkSync(LICENSE_PATH); } catch (_) {}
}

// ── Validate against server ───────────────────────────────────────────────────
async function validateWithServer(licenseKey) {
  const machineId   = getMachineId();
  const machineName = require('os').hostname();

  const res = await httpPost(API_URL, { key: licenseKey, machineId, machineName });

  if (res.status === 200 && res.data.valid) {
    const cache = {
      key:           licenseKey,
      valid:         true,
      plan:          res.data.plan,
      label:         res.data.label,
      features:      res.data.features,
      expiresAt:     res.data.expiresAt,
      user:          res.data.user,
      lastValidated: Date.now(),
    };
    saveLicenseCache(cache);
    return { ok: true, ...cache };
  }

  // Server responded but explicitly rejected — don't clear cache here,
  // caller decides based on context
  return { ok: false, serverReachable: true, reason: res.data?.reason || 'Invalid license' };
}

// ── First-time activation ─────────────────────────────────────────────────────
// Tries server first. If server is unreachable AND a valid cache exists,
// lets the user in with offlineActivation: true so the UI can show a warning.
async function activateLicense(licenseKey) {
  try {
    const result = await validateWithServer(licenseKey);

    if (result.ok) return result;

    // Server reachable but rejected — clear stale cache and return failure
    clearLicenseCache();
    return { ok: false, reason: result.reason };

  } catch (_) {
    // Server unreachable (network error / timeout)
    const cache = loadLicenseCache();
    if (cache?.valid && cache?.key === licenseKey) {
      // Known key with a valid cache — let them in offline
      return { ok: true, ...cache, offlineActivation: true };
    }
    // No cache for this key — can't verify at all
    return {
      ok: false,
      reason: 'Cannot reach the license server. Please check your internet connection and try again.',
    };
  }
}

// ── Startup check — trust cache, no server call ───────────────────────────────
function checkCachedLicense() {
  const cache = loadLicenseCache();
  if (!cache || !cache.valid || !cache.key) return { ok: false };
  return { ok: true, ...cache };
}

// ── Periodic re-validation ────────────────────────────────────────────────────
// Network error  → offline: true  → caller must NOT trigger countdown
// Server rejects → ok: false, serverReachable: true → caller triggers countdown
async function validateLicense(licenseKey) {
  try {
    return await validateWithServer(licenseKey);
  } catch (_) {
    // Server unreachable — return cached data with offline flag
    const cache = loadLicenseCache();
    if (cache?.valid) return { ok: true, ...cache, offline: true };
    return { ok: false, offline: true, reason: 'Could not reach license server.' };
  }
}

// ── Get cached license ────────────────────────────────────────────────────────
function getCachedLicense() {
  return loadLicenseCache();
}

module.exports = {
  activateLicense,
  checkCachedLicense,
  validateLicense,
  getCachedLicense,
  clearLicenseCache,
  getMachineId,
};