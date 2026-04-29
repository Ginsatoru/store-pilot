const https = require('https');
const http  = require('http');
const net   = require('net');

// ── WooCommerce ───────────────────────────────────────────────────────────────
function wooRequest(settings, endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const base    = (settings.storeUrl || '').replace(/\/$/, '');
    const token   = Buffer.from(`${settings.consumerKey}:${settings.consumerSecret}`).toString('base64');
    const parsed  = new URL(`${base}/wp-json/wc/v3${endpoint}`);
    const isHttps = parsed.protocol === 'https:';
    const lib     = isHttps ? https : http;

    const req = lib.request({
      hostname: parsed.hostname,
      port:     parsed.port || (isHttps ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method,
      headers: {
        'Authorization': `Basic ${token}`,
        'Content-Type':  'application/json',
        'Accept':        'application/json',
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300)
            resolve({ ok: true, data: parsed, status: res.statusCode });
          else
            resolve({ ok: false, error: parsed?.message || `HTTP ${res.statusCode}`, status: res.statusCode });
        } catch { resolve({ ok: false, error: 'Invalid JSON response', status: res.statusCode }); }
      });
    });
    req.on('error', e => reject(new Error(e.message)));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ── FTP ───────────────────────────────────────────────────────────────────────
function ftpTestConnection({ host, port, user, pass }) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let step = 'connect', buffer = '';
    const cleanup = () => socket.destroy();
    const fail = msg => { cleanup(); resolve({ ok: false, error: msg }); };

    socket.setTimeout(8000, () => fail('Connection timed out'));
    socket.connect(parseInt(port) || 21, host);
    socket.on('error', e => fail(e.message));
    socket.on('data', chunk => {
      buffer += chunk.toString();
      const lines = buffer.split('\r\n'); buffer = lines.pop();
      for (const line of lines) {
        if (!line) continue;
        const code = parseInt(line.slice(0, 3));
        if (step === 'connect' && code === 220) {
          step = 'user'; socket.write(`USER ${user}\r\n`);
        } else if (step === 'user' && (code === 331 || code === 230)) {
          if (code === 230) { step = 'done'; cleanup(); resolve({ ok: true, message: 'FTP connection successful!' }); }
          else { step = 'pass'; socket.write(`PASS ${pass}\r\n`); }
        } else if (step === 'pass') {
          if (code === 230) { step = 'done'; cleanup(); resolve({ ok: true, message: 'FTP connection successful!' }); }
          else fail('Authentication failed. Check username and password.');
        } else if (code >= 500) fail(`FTP error: ${line}`);
      }
    });
    socket.on('close', () => { if (step !== 'done') fail('Connection closed unexpectedly'); });
  });
}

function ftpUploadImage({ host, port, user, pass, remotePath, fileData, fileName }) {
  return new Promise((resolve) => {
    const buffer = Buffer.from(fileData, 'base64');
    const ctrl   = new net.Socket();
    let   cmdBuf = '';
    const fail   = msg => { ctrl.destroy(); resolve({ ok: false, error: msg }); };

    const sendCmd = (cmd) => new Promise((res, rej) => {
      const onData = (chunk) => {
        cmdBuf += chunk.toString();
        const lines = cmdBuf.split('\r\n'); cmdBuf = lines.pop();
        for (const line of lines) {
          if (!line) continue;
          const code = parseInt(line.slice(0, 3));
          if (line[3] !== '-') {
            ctrl.removeListener('data', onData);
            if (code >= 400) rej(new Error(line.trim()));
            else res({ code, line });
            return;
          }
        }
      };
      ctrl.on('data', onData);
      if (cmd) ctrl.write(cmd + '\r\n');
    });

    ctrl.setTimeout(15000, () => fail('FTP upload timed out'));
    ctrl.connect(parseInt(port) || 21, host);
    ctrl.on('error', e => fail(e.message));

    ctrl.once('data', async (chunk) => {
      const greeting = chunk.toString();
      if (!greeting.startsWith('220')) { fail('Unexpected FTP greeting'); return; }
      try {
        await sendCmd(`USER ${user}`);
        await sendCmd(`PASS ${pass}`);
        await sendCmd('TYPE I');

        const pasvRes = await sendCmd('PASV');
        const m = pasvRes.line.match(/(\d+),(\d+),(\d+),(\d+),(\d+),(\d+)/);
        if (!m) { fail('Could not parse PASV response'); return; }
        const dataHost = `${m[1]}.${m[2]}.${m[3]}.${m[4]}`;
        const dataPort = parseInt(m[5]) * 256 + parseInt(m[6]);

        const uploadPath = (remotePath || '').replace(/\/$/, '');
        await sendCmd(`CWD ${uploadPath}`);

        const dataConn = await new Promise((res, rej) => {
          const s = new net.Socket();
          s.connect(dataPort, dataHost, () => res(s));
          s.on('error', rej);
        });

        ctrl.write(`STOR ${fileName}\r\n`);

        await new Promise((res, rej) => {
          const onData = (chunk) => {
            const line = chunk.toString();
            const code = parseInt(line.slice(0, 3));
            if (code === 150 || code === 125) { ctrl.removeListener('data', onData); res(); }
            else if (code >= 400) { ctrl.removeListener('data', onData); rej(new Error(line.trim())); }
          };
          ctrl.on('data', onData);
        });

        dataConn.write(buffer);
        dataConn.end();

        await new Promise((res, rej) => {
          const onData = (chunk) => {
            const line = chunk.toString();
            const code = parseInt(line.slice(0, 3));
            if (code === 226) { ctrl.removeListener('data', onData); res(); }
            else if (code >= 400) { ctrl.removeListener('data', onData); rej(new Error(line.trim())); }
          };
          ctrl.on('data', onData);
        });

        ctrl.write('QUIT\r\n');
        ctrl.destroy();
        resolve({ ok: true });
      } catch (e) { fail(e.message); }
    });
  });
}

module.exports = { wooRequest, ftpTestConnection, ftpUploadImage };