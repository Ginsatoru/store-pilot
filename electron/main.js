const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { registerIpcHandlers } = require('./ipc');
const { getCachedLicense, validateLicense } = require('./license');

const isDev = process.env.NODE_ENV !== 'production';
let mainWindow        = null;
let validationInterval = null;
let countdownInterval  = null;

function createWindow() {
  Menu.setApplicationMenu(null);
  mainWindow = new BrowserWindow({
    width: 1400, height: 900, minWidth: 1100, minHeight: 700,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#EEEAE3',
    icon: path.join(__dirname, 'icons/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) mainWindow.loadURL('http://localhost:5174');
  else mainWindow.loadFile(path.join(__dirname, '../renderer/dist/index.html'));
}

// ── Safe send — queues if renderer still loading ──────────────────────────────
function safeSend(channel, ...args) {
  if (!mainWindow) return;
  if (mainWindow.webContents.isLoading()) {
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow.webContents.send(channel, ...args);
    });
  } else {
    mainWindow.webContents.send(channel, ...args);
  }
}

// ── 30s warning countdown → then license gate ────────────────────────────────
function startLicenseCountdown(reason) {
  if (countdownInterval) return;

  const TOTAL   = 30;
  let remaining = TOTAL;

  safeSend('license:warning', { reason, remaining });

  countdownInterval = setInterval(() => {
    remaining -= 1;
    safeSend('license:warning', { reason, remaining });

    if (remaining <= 0) {
      clearInterval(countdownInterval);
      countdownInterval = null;
      safeSend('license:invalid', reason);
    }
  }, 1000);
}

// ── Periodic re-validation ────────────────────────────────────────────────────
function startPeriodicValidation() {
  if (validationInterval) clearInterval(validationInterval);

  const INTERVAL_MS = isDev
    ? 30 * 1000        // dev:  check every 30 seconds
    : 30 * 60 * 1000;  // prod: check every 30 minutes

  validationInterval = setInterval(async () => {
    // Don't re-validate while countdown is already running
    if (countdownInterval) return;

    const cached = getCachedLicense();
    if (!cached?.key) return;

    let result;
    try {
      result = await validateLicense(cached.key);
    } catch (_) {
      // Unexpected error — treat as offline, do nothing
      return;
    }

    // Server was unreachable — keep the app running, check again next interval
    if (result.offline) return;

    // Server responded but license is no longer valid — start countdown
    // Only trigger if serverReachable is explicitly true, meaning the server
    // actually sent back a rejection (not a timeout or network failure)
    if (!result.ok && result.serverReachable) {
      clearInterval(validationInterval);
      validationInterval = null;
      startLicenseCountdown(result.reason);
    }

    // If result.ok — license still valid, do nothing
  }, INTERVAL_MS);
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();
  startPeriodicValidation();
});

app.on('window-all-closed', () => {
  if (validationInterval) clearInterval(validationInterval);
  if (countdownInterval)  clearInterval(countdownInterval);
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});