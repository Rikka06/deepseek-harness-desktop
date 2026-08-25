const { app, BrowserWindow, shell, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const net = require('net');
const http = require('http');
const https = require('https');
const { spawn } = require('child_process');
const treeKill = require('tree-kill');
const fs = require('fs');

let mainWindow = null;
let serverProcess = null;
let serverPort = 3080;
let isQuitting = false;
let logStream = null;

function getLogStream() {
  if (!logStream) {
    try {
      const logDir = app.getPath('userData');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      const logFile = path.join(logDir, 'dsh-server.log');
      logStream = fs.createWriteStream(logFile, { flags: 'a' });
    } catch (e) {
      console.warn('Failed to initialize log file:', e);
    }
  }
  return logStream;
}

function writeLog(msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}\n`;
  console.log(msg);
  const stream = getLogStream();
  if (stream) {
    stream.write(line);
  }
}

// Get current local dsh package version
function getLocalDshVersion() {
  try {
    const pkgPaths = [
      path.join(app.getAppPath(), 'node_modules', '@deepseek-ai', 'dsh', 'package.json'),
      path.join(process.resourcesPath || '', 'app.asar.unpacked', 'node_modules', '@deepseek-ai', 'dsh', 'package.json'),
      path.join(__dirname, '..', 'node_modules', '@deepseek-ai', 'dsh', 'package.json')
    ];
    for (const p of pkgPaths) {
      if (fs.existsSync(p)) {
        const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
        if (data.version) return data.version;
      }
    }
  } catch (e) {
    writeLog(`[Update] Error reading local package.json: ${e.message}`);
  }
  return '0.1.1-rc.2';
}

// Fetch latest version from npm registry
function fetchLatestRemoteVersion() {
  const registries = [
    'https://registry.npmmirror.com/@deepseek-ai/dsh/latest',
    'https://registry.npmjs.org/@deepseek-ai/dsh/latest'
  ];

  function tryFetch(index = 0) {
    if (index >= registries.length) {
      return Promise.reject(new Error('无法连接到更新服务器'));
    }
    const url = registries[index];
    return new Promise((resolve, reject) => {
      const req = https.get(url, { timeout: 4000 }, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (data && data.version) {
              resolve(data.version);
            } else {
              tryFetch(index + 1).then(resolve).catch(reject);
            }
          } catch (e) {
            tryFetch(index + 1).then(resolve).catch(reject);
          }
        });
      });
      req.on('error', () => {
        tryFetch(index + 1).then(resolve).catch(reject);
      });
      req.on('timeout', () => {
        req.destroy();
        tryFetch(index + 1).then(resolve).catch(reject);
      });
    });
  }

  return tryFetch();
}

// Simple semver compare (returns > 0 if v1 > v2, < 0 if v1 < v2, 0 if equal)
function compareVersions(v1, v2) {
  if (v1 === v2) return 0;
  const p1 = v1.replace(/^v/, '').split(/[-+.]/);
  const p2 = v2.replace(/^v/, '').split(/[-+.]/);
  const len = Math.max(p1.length, p2.length);
  for (let i = 0; i < len; i++) {
    const num1 = parseInt(p1[i], 10) || 0;
    const num2 = parseInt(p2[i], 10) || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return v1.localeCompare(v2);
}

// Check for updates
async function checkForUpdates() {
  const currentVer = getLocalDshVersion();
  writeLog(`[Update] Checking for updates (current: ${currentVer})...`);
  try {
    const latestVer = await fetchLatestRemoteVersion();
    writeLog(`[Update] Latest remote version: ${latestVer}`);
    
    if (compareVersions(latestVer, currentVer) > 0) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        const res = await dialog.showMessageBox(mainWindow, {
          type: 'info',
          title: 'DeepSeek Harness 更新提醒',
          message: `发现 DeepSeek Harness 新版本：v${latestVer}`,
          detail: `当前版本: v${currentVer}\n最新版本: v${latestVer}\n\n官方已发布更新，是否前往 GitHub 查看更新日志？`,
          buttons: ['查看更新日志', '稍后提醒'],
          defaultId: 0,
          cancelId: 1
        });
        if (res.response === 0) {
          await shell.openExternal('https://github.com/deepseek-ai/deepseek-harness/releases');
        }
      }
    }
  } catch (err) {
    writeLog(`[Update] Check failed: ${err.message}`);
  }
}

// Determine free port
function getAvailablePort(startPort = 3080) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(getAvailablePort(startPort + 1));
      } else {
        reject(err);
      }
    });
    server.listen(startPort, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

// Wait for HTTP server to become responsive
function waitForServer(url, timeoutMs = 60000) {
  const startTime = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(url, (res) => {
        req.destroy();
        resolve(true);
      });
      req.on('error', () => {
        if (Date.now() - startTime > timeoutMs) {
          reject(new Error(`服务启动超时 (${timeoutMs}ms)`));
        } else {
          setTimeout(check, 300);
        }
      });
      req.setTimeout(2500, () => {
        req.destroy();
        setTimeout(check, 300);
      });
    };
    check();
  });
}

// Find Node.js executable
function getNodeExecutable() {
  const isWin = process.platform === 'win32';
  const nodeBinaryName = isWin ? 'node.exe' : 'node';

  const candidatePaths = [
    path.join(process.resourcesPath || '', 'bin', nodeBinaryName),
    path.join(__dirname, '..', 'bin', nodeBinaryName),
    'C:\\Program Files\\nodejs\\node.exe',
    'C:\\Program Files (x86)\\nodejs\\node.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'nodejs', 'node.exe'),
    path.join(process.env.APPDATA || '', 'npm', 'node.exe'),
    'node'
  ];

  for (const p of candidatePaths) {
    if (p === 'node') return 'node';
    if (fs.existsSync(p)) return p;
  }
  return 'node';
}

// Resolve dsh CLI entry path
function getDshEntryPath() {
  const appPath = app.getAppPath();
  const potentialPaths = [
    path.join(appPath, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'),
    path.join(process.resourcesPath || '', 'app.asar.unpacked', 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'),
    path.join(process.resourcesPath || '', 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'),
    path.join(__dirname, '..', 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'),
    path.join(process.cwd(), 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')
  ];

  for (const p of potentialPaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

// Start DeepSeek Harness server in background
async function startServer(port) {
  const dshEntry = getDshEntryPath();
  const nodeExe = getNodeExecutable();
  const args = ['web', '--no-open', '--port', String(port), '--host', '127.0.0.1'];
  
  writeLog(`[DSH] Node Executable: ${nodeExe}`);
  writeLog(`[DSH] DSH Entry: ${dshEntry}`);
  writeLog(`[DSH] Starting server on port ${port}...`);

  const nodeModulesPath = path.join(app.getAppPath(), 'node_modules');
  const env = Object.assign({}, process.env, {
    NODE_PATH: nodeModulesPath,
    FORCE_COLOR: '1'
  });

  if (dshEntry && fs.existsSync(dshEntry)) {
    serverProcess = spawn(nodeExe, [dshEntry, ...args], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: app.getAppPath(),
      windowsHide: true
    });
  } else {
    // Fallback: spawn system npx
    const isWin = process.platform === 'win32';
    const cmd = isWin ? 'npx.cmd' : 'npx';
    serverProcess = spawn(cmd, ['-y', '@deepseek-ai/dsh', ...args], {
      env: process.env,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });
  }

  if (serverProcess.stdout) {
    serverProcess.stdout.on('data', (chunk) => {
      writeLog(`[DSH STDOUT] ${chunk.toString().trim()}`);
    });
  }

  if (serverProcess.stderr) {
    serverProcess.stderr.on('data', (chunk) => {
      writeLog(`[DSH STDERR] ${chunk.toString().trim()}`);
    });
  }

  serverProcess.on('exit', (code, signal) => {
    writeLog(`[DSH] Server process exited with code ${code}, signal ${signal}`);
    if (!isQuitting && mainWindow && !mainWindow.isDestroyed()) {
      dialog.showErrorBox(
        'DeepSeek Harness 服务异常退出',
        `后台服务已退出 (Code: ${code}, Signal: ${signal})。请查看日志或重启应用。`
      );
    }
  });

  const targetUrl = `http://127.0.0.1:${port}`;
  await waitForServer(targetUrl);
  writeLog(`[DSH] Server is ready at ${targetUrl}`);
  return targetUrl;
}

// Safely stop background server process tree
function stopServer() {
  if (serverProcess && serverProcess.pid) {
    const pid = serverProcess.pid;
    writeLog(`[DSH] Terminating server process PID: ${pid}`);
    try {
      treeKill(pid, 'SIGKILL', (err) => {
        if (err) {
          writeLog(`[DSH] tree-kill warning: ${err.message}`);
        }
      });
    } catch (e) {
      writeLog(`[DSH] stopServer warning: ${e.message}`);
    }
    serverProcess = null;
  }
}

// Create Main Browser Window
function createWindow() {
  const iconPath = path.join(__dirname, '..', 'build', 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 1024,
    minHeight: 680,
    title: 'DeepSeek Harness',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    backgroundColor: '#0f172a',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    }
  });

  // Completely remove top menu bar
  mainWindow.setMenuBarVisibility(false);
  mainWindow.removeMenu();

  // Keyboard shortcuts support (F11 fullscreen, F12 devtools, Ctrl+R reload)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F11' && input.type === 'keyDown') {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      event.preventDefault();
    } else if (input.key === 'F12' && input.type === 'keyDown') {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    } else if (input.control && input.key.toLowerCase() === 'r' && input.type === 'keyDown') {
      mainWindow.reload();
      event.preventDefault();
    }
  });

  // Show splash screen first
  mainWindow.loadFile(path.join(__dirname, 'splash.html'));
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Intercept external links and open in default OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      if (!url.includes(`127.0.0.1:${serverPort}`) && !url.includes(`localhost:${serverPort}`)) {
        shell.openExternal(url);
        return { action: 'deny' };
      }
    }
    return { action: 'allow' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.includes(`127.0.0.1:${serverPort}`) && !url.includes(`localhost:${serverPort}`) && !url.startsWith('file:')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(async () => {
  // Completely disable application menu bar globally
  Menu.setApplicationMenu(null);

  createWindow();

  try {
    serverPort = await getAvailablePort(3080);
    const targetUrl = await startServer(serverPort);

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.loadURL(targetUrl);
      
      // Auto check for updates 3 seconds after web UI is loaded
      setTimeout(() => {
        checkForUpdates();
      }, 3000);
    }
  } catch (err) {
    writeLog(`[DSH] Failed to initialize service: ${err.message}`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      dialog.showErrorBox(
        '启动失败',
        `无法启动 DeepSeek Harness 本地服务：\n${err.message}\n请检查是否已安装 Node.js 以及端口权限。`
      );
    }
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  stopServer();
});

app.on('window-all-closed', () => {
  isQuitting = true;
  stopServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

process.on('SIGINT', () => {
  isQuitting = true;
  stopServer();
  process.exit(0);
});

process.on('SIGTERM', () => {
  isQuitting = true;
  stopServer();
  process.exit(0);
});
