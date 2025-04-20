require('dotenv').config();
const { app, BrowserWindow, globalShortcut, desktopCapturer, ipcMain, screen, Menu, Tray, dialog, nativeImage } = require('electron/main');
const path = require('node:path')
const fs = require('fs');
const os = require('os');
const { exec, execSync } = require('child_process');
const { ChatGptHelper } = require('./src/ChatGptHelper');
const { Utils } = require('./src/Utils');
const Store = require('electron-store');

const settings = new Store({
  name: 'ghost-settings',
  defaults: {
    ghostMode: true,
    apiKey: '',
    theme: 'dark'
  }
});

let tray = null;
let mainWindow = null;
let splashWindow = null;

const isWindows = process.platform === 'win32';
const isLinux = process.platform === 'linux';
const isMac = process.platform === 'darwin';

const screenshotsDir = path.join(__dirname, "screenshots");
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

const assetsDir = path.join(__dirname, "assets", "images");
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

const iconPath = path.join(__dirname, 'assets', 'images', 'icon.png');
if (!fs.existsSync(iconPath)) {
  try {
    const size = 32;
    const emptyIcon = Buffer.from([
      137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
      0, 0, 0, 32, 0, 0, 0, 32, 8, 6, 0, 0, 0, 115, 122, 122,
      244, 0, 0, 0, 6, 98, 75, 71, 68, 0, 255, 0, 255, 0, 255,
      160, 189, 167, 147, 0, 0, 0, 9, 112, 72, 89, 115, 0, 0, 11,
      19, 0, 0, 11, 19, 1, 0, 154, 156, 24, 0, 0, 0, 7, 116,
      73, 77, 69, 7, 230, 10, 15, 9, 41, 49, 168, 198, 34, 117, 0,
      0, 0, 29, 105, 84, 88, 116, 67, 111, 109, 109, 101, 110, 116, 0,
      0, 0, 0, 0, 67, 114, 101, 97, 116, 101, 100, 32, 119, 105, 116,
      104, 32, 71, 73, 77, 80, 100, 46, 101, 7, 0, 0, 0, 54, 73,
      68, 65, 84, 88, 195, 237, 214, 177, 17, 0, 48, 8, 3, 65, 246,
      95, 186, 36, 5, 36, 3, 120, 244, 46, 186, 147, 66, 6, 0, 0,
      0, 0, 0, 0, 80, 108, 142, 31, 96, 189, 124, 1, 0, 0, 0,
      0, 0, 0, 152, 6, 182, 8, 8, 61, 105, 169, 60, 49, 0, 0,
      0, 0, 73, 69, 78, 68, 174, 66, 96, 130
    ]);
    fs.writeFileSync(iconPath, emptyIcon);
    console.log("Ícone padrão PNG criado com sucesso");
  } catch (error) {
    console.error("Erro ao criar ícone padrão:", error);
  }
}

function createSplashWindow() {
  const splash = new BrowserWindow({
    width: 400,
    height: 300,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  splash.loadFile('src/splash.html');
  return splash;
}

function checkAndInstallDependencies() {
  return new Promise((resolve) => {
    if (isWindows) {
      const ffiPath = path.join(__dirname, 'node_modules', 'ffi-napi');
      if (!fs.existsSync(ffiPath)) {
        console.log('Instalando dependências FFI para o modo ghost no Windows...');
        try {
          execSync('npm install ffi-napi ref-napi', { cwd: __dirname });
          console.log('Dependências FFI instaladas com sucesso');
        } catch (error) {
          console.error('Erro ao instalar dependências FFI:', error.message);
        }
      }
    } else if (isLinux) {
      console.log('Verificando dependências do Linux para modo ghost...');
      try {
        exec('which xprop', (error) => {
          if (error) {
            console.log('xprop não encontrado, algumas funcionalidades ghost podem estar limitadas');
          }
        });
      } catch (error) {
        console.error('Erro ao verificar dependências Linux:', error.message);
      }
    }
    resolve();
  });
}

// Função aprimorada para detectar corretamente WSL
async function isRunningInWSL() {
  if (process.platform !== 'linux') {
    return false;
  }

  try {
    // Métodos mais precisos para detecção de WSL
    // 1. Verificar o /proc/version
    const procVersion = fs.readFileSync('/proc/version', 'utf8').toLowerCase();

    // 2. Verificar o conteúdo do /proc/sys/kernel/osrelease
    let osRelease = '';
    try {
      osRelease = fs.readFileSync('/proc/sys/kernel/osrelease', 'utf8').toLowerCase();
    } catch (e) {
      // Se não conseguir ler, ignora
    }

    // 3. Verificar variáveis de ambiente específicas do WSL
    const hasWslEnv = process.env.WSL_DISTRO_NAME || process.env.WSLENV;

    // 4. Verificar a existência de diretórios específicos do WSL
    let hasWslInterop = false;
    try {
      hasWslInterop = fs.existsSync('/run/WSL') || fs.existsSync('/mnt/wsl');
    } catch (e) {
      // Se não conseguir verificar, ignora
    }

    // Para ser considerado WSL, precisa ter palavras-chave específicas ou combinações delas
    const isWsl = (
      (procVersion.includes('microsoft') || procVersion.includes('wsl')) ||
      (osRelease.includes('microsoft') || osRelease.includes('wsl')) ||
      (hasWslEnv) ||
      (hasWslInterop)
    );

    console.log('Detecção de ambiente:');
    console.log('- /proc/version:', procVersion.includes('microsoft') || procVersion.includes('wsl'));
    console.log('- osRelease:', osRelease.includes('microsoft') || osRelease.includes('wsl'));
    console.log('- Variáveis WSL:', !!hasWslEnv);
    console.log('- Diretórios WSL:', hasWslInterop);
    console.log('Resultado final WSL:', isWsl);

    return isWsl;
  } catch (error) {
    console.error('Erro ao detectar WSL:', error.message);
    return false;
  }
}

function configureWSLEnvironment() {
  if (!isWSL) return;

  if (process.env.DISPLAY) {
    console.log(`Usando DISPLAY existente: ${process.env.DISPLAY}`);
    return;
  }

  try {
    let hostIp = '127.0.0.1';
    try {
      const wslHostIp = execSync('cat /etc/resolv.conf | grep nameserver | awk \'{print $2}\'', { encoding: 'utf8' }).trim();
      if (wslHostIp && wslHostIp.match(/^\d+\.\d+\.\d+\.\d+$/)) {
        hostIp = wslHostIp;
        console.log(`Usando IP do host WSL: ${hostIp}`);
      }
    } catch (err) {
      console.log('Não foi possível determinar o IP do host WSL, usando localhost');
    }

    const displayOptions = [
      `${hostIp}:0.0`,
      `:0`,
      `:0.0`,
      `localhost:0.0`
    ];

    let displayWorking = false;
    for (const display of displayOptions) {
      process.env.DISPLAY = display;
      try {
        console.log(`Tentando DISPLAY=${display}`);
        execSync('xset q', { stdio: 'ignore' });
        console.log(`Configurado DISPLAY=${display} para suporte GUI no WSL`);
        displayWorking = true;
        break;
      } catch (error) {
      }
    }

    if (!displayWorking) {
      console.log(`Não foi possível encontrar um DISPLAY funcional, usando ${process.env.DISPLAY}`);
    }

    app.disableHardwareAcceleration();

    app.commandLine.appendSwitch('no-sandbox');
    console.log('Hardware acceleration desabilitada e modo no-sandbox ativado para WSL');
  } catch (error) {
    console.error('Erro ao configurar ambiente WSL:', error);
  }
}

let isWSL = false;

function applyAdvancedGhostMode(mainWindow) {
  if (process.platform === 'win32') {
    try {
      const { windowsSetWindowAttributes } = require('./src/windowsGhostHelper');

      const hwnd = mainWindow.getNativeWindowHandle();

      const result = windowsSetWindowAttributes(hwnd);

      mainWindow.setContentProtection(true);
      mainWindow.setAlwaysOnTop(true, 'screen-saver');

      mainWindow.setSkipTaskbar(true);

      console.log('Modo ghost avançado aplicado:', result);
      return result;
    } catch (error) {
      console.error('Erro ao aplicar modo ghost avançado:', error);
      return false;
    }
  } else if (process.platform === 'darwin') {
    try {
      mainWindow.setAlwaysOnTop(true, 'modal-panel');
      mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      mainWindow.setOpacity(0.99);
      mainWindow.setContentProtection(true);
      mainWindow.setSkipTaskbar(true);

      mainWindow.setWindowButtonVisibility(false);

      console.log('Modo ghost configurado para macOS');
      return true;
    } catch (error) {
      console.error('Erro ao configurar atributos ghost para macOS:', error);
      mainWindow.setContentProtection(true);
      return false;
    }
  } else if (isWSL) {
    console.log('Executando no WSL, aplicando modo ghost específico para WSL');
    return applyWSLGhostMode(mainWindow);
  } else if (isLinux) {
    try {
      // Configurações básicas do Electron
      mainWindow.setSkipTaskbar(true);
      mainWindow.setAlwaysOnTop(true, 'pop-up-menu');
      mainWindow.setMenuBarVisibility(false);
      mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      mainWindow.setContentProtection(true);
      mainWindow.setOpacity(0.99);

      // Usar o helper nativo para Linux
      try {
        const { linuxSetWindowAttributes, checkLinuxDependencies } = require('./src/linuxGhostHelper');

        // Verificar dependências
        const dependenciesOk = checkLinuxDependencies();
        if (!dependenciesOk) {
          console.log('Algumas dependências de sistema estão faltando para o modo ghost avançado');
        }

        // Aplicar configurações avançadas de X11
        linuxSetWindowAttributes(mainWindow)
          .then(result => {
            console.log('Configurações X11 avançadas aplicadas:', result);
          })
          .catch(err => {
            console.error('Erro ao aplicar configurações X11:', err);
          });
      } catch (helperError) {
        console.error('Erro ao carregar ou executar linuxGhostHelper:', helperError);
      }

      console.log('Modo ghost configurado para Linux');
      return true;
    } catch (error) {
      console.error('Erro ao aplicar configurações Linux:', error);
      mainWindow.setContentProtection(true);
      return false;
    }
  }
  return false;
}

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 400,
    height: 650,
    icon: iconPath,
    frame: false,
    transparent: true,
    backgroundThrottling: true,
    hasShadow: false,
    skipTaskbar: true,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false,
      nodeIntegration: false,
      enableRemoteModule: false,
      sandbox: false
    }
  });

  mainWindow.setContentProtection(true);
  mainWindow.loadFile('index.html');

  mainWindow.on('restore', () => {
    const ghostModeEnabled = settings.get('ghostMode');
    if (ghostModeEnabled) {
      setTimeout(() => {
        applyAdvancedGhostMode(mainWindow);
      }, 500);
    }
  });

  mainWindow.on('show', () => {
    const ghostModeEnabled = settings.get('ghostMode');
    if (ghostModeEnabled) {
      setTimeout(() => {
        applyAdvancedGhostMode(mainWindow);
      }, 500);
    }
  });

  registerShortcuts(mainWindow);

  mainWindow.setMenu(null);

  return mainWindow;
}

function registerShortcuts(window) {
  const modKey = isMac ? 'Command' : 'Control';

  // Limpar todos os atalhos primeiro para evitar conflitos
  globalShortcut.unregisterAll();

  // Lista de atalhos para tentar registrar
  const shortcuts = [
    // Atalhos padrão
    { keys: `${modKey}+shift+1`, action: () => window && window.webContents.send('trigger-screenshot') },
    { keys: `${modKey}+shift+2`, action: () => window && window.webContents.send('trigger-screenshot2') },
    { keys: `${modKey}+shift+3`, action: () => window && window.webContents.send('trigger-screenshot3') },
    { keys: `${modKey}+shift+a`, action: () => window && window.webContents.send('trigger-ai1') },
    { keys: `${modKey}+shift+b`, action: () => window && window.webContents.send('trigger-ai2') },
    { keys: `${modKey}+shift+c`, action: () => window && window.webContents.send('trigger-ai3') },
    { keys: `${modKey}+shift+h`, action: () => window && window.hide() },
    {
      keys: `${modKey}+shift+s`, action: () => {
        if (window) {
          window.show();
          const ghostModeEnabled = settings.get('ghostMode');
          if (ghostModeEnabled) {
            setTimeout(() => {
              applyAdvancedGhostMode(window);
            }, 500);
          }
        }
      }
    },
    { keys: isMac ? 'Command+q' : `${modKey}+shift+q`, action: () => app.quit() },
    { keys: `${modKey}+shift+m`, action: () => window && window.webContents.send('toggle-window-drag') },

    // Atalhos alternativos para Linux (Alt+...)
    ...(isLinux ? [
      { keys: `Alt+1`, action: () => window && window.webContents.send('trigger-screenshot') },
      { keys: `Alt+2`, action: () => window && window.webContents.send('trigger-screenshot2') },
      { keys: `Alt+3`, action: () => window && window.webContents.send('trigger-screenshot3') },
      { keys: `Alt+a`, action: () => window && window.webContents.send('trigger-ai1') },
      { keys: `Alt+b`, action: () => window && window.webContents.send('trigger-ai2') },
      { keys: `Alt+c`, action: () => window && window.webContents.send('trigger-ai3') },
      { keys: `Alt+h`, action: () => window && window.hide() },
      {
        keys: `Alt+s`, action: () => {
          if (window) {
            window.show();
            const ghostModeEnabled = settings.get('ghostMode');
            if (ghostModeEnabled) {
              setTimeout(() => {
                applyAdvancedGhostMode(window);
              }, 500);
            }
          }
        }
      },
      { keys: `Alt+q`, action: () => app.quit() },
      { keys: `Alt+m`, action: () => window && window.webContents.send('toggle-window-drag') },
    ] : [])
  ];

  // Registrar os atalhos
  const registeredShortcuts = [];
  const failedShortcuts = [];

  shortcuts.forEach(shortcut => {
    try {
      if (globalShortcut.register(shortcut.keys, shortcut.action)) {
        registeredShortcuts.push(shortcut.keys);
      } else {
        failedShortcuts.push(shortcut.keys);
        console.log(`Falha ao registrar atalho: ${shortcut.keys}`);
      }
    } catch (error) {
      failedShortcuts.push(shortcut.keys);
      console.error(`Erro ao registrar atalho ${shortcut.keys}:`, error.message);
    }
  });

  console.log(`Atalhos registrados (${registeredShortcuts.length}): ${registeredShortcuts.join(', ')}`);

  if (failedShortcuts.length > 0) {
    console.log(`Atalhos com falha (${failedShortcuts.length}): ${failedShortcuts.join(', ')}`);

    // Notifica o usuário sobre a falha nos atalhos
    setTimeout(() => {
      if (window) {
        window.webContents.send('shortcut-registration-failed', {
          failed: failedShortcuts,
          registered: registeredShortcuts
        });
      }
    }, 5000);
  }

  console.log(`Atalhos registrados para plataforma: ${process.platform}`);
}

function applyInitialConfiguration(mainWindow) {
  const ghostModeEnabled = settings.get('ghostMode');
  if (ghostModeEnabled) {
    applyAdvancedGhostMode(mainWindow);
  }

  try {
    createTray();
  } catch (error) {
    console.error("Erro ao criar tray icon:", error);
  }
}

function createTray() {
  try {
    if (tray !== null) {
      return;
    }

    const emptyIcon = nativeImage.createEmpty();

    try {
      if (fs.existsSync(iconPath)) {
        const iconData = fs.readFileSync(iconPath);
        const icon = nativeImage.createFromBuffer(iconData);

        if (!icon.isEmpty()) {
          tray = new Tray(icon);
        } else {
          console.log("Ícone carregado está vazio, usando ícone vazio");
          tray = new Tray(emptyIcon);
        }
      } else {
        console.log("Arquivo de ícone não encontrado, usando ícone vazio");
        tray = new Tray(emptyIcon);
      }
    } catch (iconError) {
      console.log("Erro ao carregar ícone, usando ícone vazio:", iconError);
      tray = new Tray(emptyIcon);
    }

    const contextMenu = Menu.buildFromTemplate([
      { label: 'Mostrar', click: () => mainWindow && mainWindow.show() },
      { label: 'Esconder', click: () => mainWindow && mainWindow.hide() },
      { type: 'separator' },
      { label: 'Screenshot 1', click: () => mainWindow && mainWindow.webContents.send('trigger-screenshot') },
      { label: 'Screenshot 2', click: () => mainWindow && mainWindow.webContents.send('trigger-screenshot2') },
      { label: 'Screenshot 3', click: () => mainWindow && mainWindow.webContents.send('trigger-screenshot3') },
      { type: 'separator' },
      { label: 'Processar 1 imagem', click: () => mainWindow && mainWindow.webContents.send('trigger-ai1') },
      { label: 'Processar 2 imagens', click: () => mainWindow && mainWindow.webContents.send('trigger-ai2') },
      { label: 'Processar 3 imagens', click: () => mainWindow && mainWindow.webContents.send('trigger-ai3') },
      { type: 'separator' },
      { label: 'Sair', click: () => app.quit() }
    ]);

    tray.setToolTip('LeetCode Ghost Window');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
      if (mainWindow) {
        mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
      }
    });

    console.log("Tray icon criado com sucesso");
  } catch (error) {
    console.error("Erro ao criar o tray icon:", error);
  }
}

app.commandLine.appendSwitch('enable-usermedia-screen-capturing');
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');
app.commandLine.appendSwitch('high-dpi-support', '1');
app.commandLine.appendSwitch('force-device-scale-factor', '1');

if (isLinux) {
  app.commandLine.appendSwitch('disable-gpu-compositing');
  app.commandLine.appendSwitch('enable-transparent-visuals');
  app.commandLine.appendSwitch('disable-software-rasterizer');
  app.commandLine.appendSwitch('enable-features', 'OverlayScrollbar');
  app.commandLine.appendSwitch('disable-dev-shm-usage');
  app.commandLine.appendSwitch('wm-window-animations-disabled');
  app.commandLine.appendSwitch('disable-frame-rate-limit');
  app.commandLine.appendSwitch('in-process-gpu');
  app.commandLine.appendSwitch('no-sandbox');
  app.commandLine.appendSwitch('disable-direct-composition');
  app.commandLine.appendSwitch('disable-capture-promotions');

  // Verificar e instalar pacotes necessários
  try {
    const { execSync } = require('child_process');

    // Verifica se apt-get está disponível
    try {
      execSync('which apt-get', { stdio: 'ignore', timeout: 1000 });

      // Verifica ferramentas de captura de tela
      let missingTools = [];

      try { execSync('which xprop', { stdio: 'ignore' }); }
      catch (e) { missingTools.push('x11-utils'); }

      try { execSync('which xdotool', { stdio: 'ignore' }); }
      catch (e) { missingTools.push('xdotool'); }

      // Verifica ferramentas de captura
      const screenTools = [
        { cmd: 'which gnome-screenshot', pkg: 'gnome-screenshot' },
        { cmd: 'which scrot', pkg: 'scrot' },
        { cmd: 'which import', pkg: 'imagemagick' }
      ];

      let hasAnyScreenshotTool = false;

      for (const tool of screenTools) {
        try {
          execSync(tool.cmd, { stdio: 'ignore' });
          hasAnyScreenshotTool = true;
          console.log(`Ferramenta de captura encontrada: ${tool.pkg}`);
          break;
        } catch (e) {
          // Continua verificando
        }
      }

      if (!hasAnyScreenshotTool) {
        missingTools.push('scrot');
      }

      // Instala ferramentas faltantes se necessário
      if (missingTools.length > 0) {
        console.log(`Instalando ferramentas necessárias: ${missingTools.join(', ')}`);
        try {
          execSync(`sudo apt-get update && sudo apt-get install -y ${missingTools.join(' ')}`, {
            stdio: 'inherit',
            timeout: 60000  // 60 segundos para timeout
          });
          console.log('Ferramentas instaladas com sucesso');
        } catch (installError) {
          console.log('Erro ao instalar ferramentas. Algumas funcionalidades podem estar limitadas.', installError.message);
        }
      }
    } catch (aptError) {
      // apt-get não disponível, ignora a instalação
      console.log('apt-get não encontrado, pulando instalação automática');
    }

  } catch (e) {
    console.log('Falha ao verificar/instalar dependências. O ghost-mode pode ter funcionalidade limitada.');
  }

  app.disableHardwareAcceleration();
}

app.whenReady().then(async () => {
  // Detecção de ambiente melhorada
  isWSL = await isRunningInWSL();

  // Exibir informações detalhadas sobre o ambiente
  console.log('=== Informações do Ambiente ===');
  console.log('Platform:', process.platform);
  console.log('WSL detectado:', isWSL);
  console.log('Versão do Node:', process.version);
  console.log('Versão do Electron:', process.versions.electron);
  console.log('Variáveis de ambiente:');
  console.log('- XDG_SESSION_TYPE:', process.env.XDG_SESSION_TYPE || 'não definido');
  console.log('- DISPLAY:', process.env.DISPLAY || 'não definido');
  console.log('- WAYLAND_DISPLAY:', process.env.WAYLAND_DISPLAY || 'não definido');

  if (isWSL) {
    console.log('Detectado ambiente WSL - aplicando configurações específicas');
    configureWSLEnvironment();
  } else if (isLinux) {
    console.log('Detectado ambiente Linux nativo');
  }

  splashWindow = createSplashWindow();

  await checkAndInstallDependencies();

  mainWindow = createMainWindow();

  applyInitialConfiguration(mainWindow);

  ipcMain.on('minimize-window', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('maximize-window', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on('close-window', () => {
    if (mainWindow) mainWindow.close();
  });

  mainWindow.webContents.once('did-finish-load', () => {
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
      }

      mainWindow.show();

      setTimeout(() => {
        const ghostModeEnabled = settings.get('ghostMode');
        if (ghostModeEnabled) {
          applyAdvancedGhostMode(mainWindow);
        }
        mainWindow.webContents.send('check-ghost-mode');
      }, 5000);
    }, 1500);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
      applyInitialConfiguration(mainWindow);
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('capture-screen', async () => {
  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.size;

    const options = {
      types: ["screen"],
      thumbnailSize: { width, height },
    }

    const sources = await desktopCapturer.getSources(options);

    const primarySource = sources.find((source) => source.display_id == primaryDisplay.id) || sources[0];
    const image = primarySource.thumbnail.toJPEG(100);
    const screenshotPath = path.join(__dirname, "screenshots", 'screenshot.png');
    fs.writeFileSync(screenshotPath, image);
    return screenshotPath;
  } catch (error) {
    console.error("Erro ao capturar tela:", error);
    throw new Error("Falha ao capturar screenshot");
  }
});

ipcMain.handle('capture-screen2', async () => {
  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.size;

    const options = {
      types: ["screen"],
      thumbnailSize: { width, height },
    }

    const sources = await desktopCapturer.getSources(options);

    const primarySource = sources.find((source) => source.display_id == primaryDisplay.id) || sources[0];
    const image = primarySource.thumbnail.toJPEG(100);
    const screenshotPath = path.join(__dirname, "screenshots", 'screenshot2.png');
    fs.writeFileSync(screenshotPath, image);
    return screenshotPath;
  } catch (error) {
    console.error("Erro ao capturar tela:", error);
    throw new Error("Falha ao capturar screenshot 2");
  }
});

ipcMain.handle('capture-screen3', async () => {
  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.size;

    const options = {
      types: ["screen"],
      thumbnailSize: { width, height },
    }

    const sources = await desktopCapturer.getSources(options);

    const primarySource = sources.find((source) => source.display_id == primaryDisplay.id) || sources[0];
    const image = primarySource.thumbnail.toJPEG(100);
    const screenshotPath = path.join(__dirname, "screenshots", 'screenshot3.png');
    fs.writeFileSync(screenshotPath, image);
    return screenshotPath;
  } catch (error) {
    console.error("Erro ao capturar tela:", error);
    throw new Error("Falha ao capturar screenshot 3");
  }
});

ipcMain.handle('test-ghost-mode', async () => {
  return {
    platform: process.platform,
    isWindows: isWindows,
    isLinux: isLinux,
    isMac: isMac
  };
});

ipcMain.handle('find-answer-using-screenshot', async (event, { quantityScreenshotToUse, openai_api_key }) => {
  try {
    const utils = new Utils();
    const chatGpHelper = new ChatGptHelper({ utils, openai_api_key, quantityScreenshotToUse });
    const chatgpt_response = await chatGpHelper.doRequest();

    if (!chatgpt_response.hasOwnProperty("output")) {
      return chatgpt_response;
    }

    return chatgpt_response.output;
  } catch (error) {
    console.error("Erro ao processar screenshot com IA:", error);
    return { error: { message: "Falha ao processar com IA: " + error.message } };
  }
});

ipcMain.handle('start-area-selection', async (event, screenshotNumber) => {
  try {
    if (mainWindow) {
      mainWindow.hide();
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    let result;
    if (isWindows) {
      result = await captureFullScreenWindows(screenshotNumber);
    } else if (isLinux) {
      result = await captureFullScreenLinux(screenshotNumber);
    } else if (isMac) {
      result = await captureFullScreenMac(screenshotNumber);
    } else {
      result = await captureGenericScreenArea(screenshotNumber);
    }

    if (mainWindow) {
      mainWindow.show();
    }

    return result;
  } catch (error) {
    console.error("Erro ao capturar tela:", error);

    if (mainWindow) {
      mainWindow.show();
    }

    throw new Error(`Falha ao capturar screenshot ${screenshotNumber}: ${error.message}`);
  }
});

async function captureFullScreenWindows(screenshotNumber) {
  try {
    const outputPath = path.join(__dirname, "screenshots", `screenshot${screenshotNumber > 1 ? screenshotNumber : ''}.png`);

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.size;

    const options = {
      types: ["screen"],
      thumbnailSize: { width, height },
    };

    const sources = await desktopCapturer.getSources(options);
    const primarySource = sources.find((source) => source.display_id == primaryDisplay.id) || sources[0];

    if (!primarySource) {
      throw new Error('Não foi possível encontrar a tela primária');
    }

    const image = primarySource.thumbnail.toJPEG(100);

    fs.writeFileSync(outputPath, image);

    console.log(`Screenshot ${screenshotNumber} capturado e salvo em: ${outputPath}`);
    return { path: outputPath };
  } catch (error) {
    console.error("Erro ao capturar tela no Windows:", error);
    throw error;
  }
}

async function captureFullScreenLinux(screenshotNumber) {
  try {
    const outputPath = path.join(__dirname, "screenshots", `screenshot${screenshotNumber > 1 ? screenshotNumber : ''}.png`);

    // Tenta vários métodos de captura de tela no Linux, em ordem de preferência
    const captureCommands = [
      // Método 1: gnome-screenshot (ambiente GNOME)
      {
        cmd: `gnome-screenshot -f "${outputPath}"`,
        check: 'which gnome-screenshot'
      },
      // Método 2: spectacle (ambiente KDE)
      {
        cmd: `spectacle -bn -o "${outputPath}"`,
        check: 'which spectacle'
      },
      // Método 3: scrot (ferramenta genérica)
      {
        cmd: `scrot -z "${outputPath}"`,
        check: 'which scrot'
      },
      // Método 4: import do ImageMagick
      {
        cmd: `import -window root "${outputPath}"`,
        check: 'which import'
      },
      // Método 5: xwd + convert
      {
        cmd: `xwd -root | convert xwd:- "${outputPath}"`,
        check: 'which xwd && which convert'
      }
    ];

    for (const method of captureCommands) {
      try {
        // Verifica se o comando existe
        execSync(method.check, { stdio: 'ignore', timeout: 1000 });

        // Executa o comando de captura
        console.log(`Tentando captura com: ${method.cmd}`);
        execSync(method.cmd, { timeout: 5000 });

        // Verifica se o arquivo foi criado
        if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
          console.log(`Screenshot ${screenshotNumber} capturado com sucesso usando ${method.cmd}`);
          return { path: outputPath };
        }
      } catch (methodError) {
        console.log(`Método de captura falhou: ${method.cmd}`, methodError.message);
      }
    }

    // Se todos os métodos nativos falharem, usa o método genérico do Electron
    console.log("Todos os métodos nativos de captura falharam, usando método Electron");
    return await captureGenericScreenArea(screenshotNumber);

  } catch (error) {
    console.error("Erro ao capturar tela no Linux:", error);
    return await captureGenericScreenArea(screenshotNumber);
  }
}

async function captureFullScreenMac(screenshotNumber) {
  try {
    const outputPath = path.join(__dirname, "screenshots", `screenshot${screenshotNumber > 1 ? screenshotNumber : ''}.png`);

    execSync(`screencapture "${outputPath}"`, { timeout: 3000 });

    if (fs.existsSync(outputPath)) {
      return { path: outputPath };
    } else {
      throw new Error('Falha ao salvar a captura de tela');
    }
  } catch (error) {
    console.error("Erro ao capturar tela no macOS:", error);
    return await captureGenericScreenArea(screenshotNumber);
  }
}

async function captureGenericScreenArea(screenshotNumber) {
  try {
    const outputPath = path.join(__dirname, "screenshots", `screenshot${screenshotNumber > 1 ? screenshotNumber : ''}.png`);

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.size;

    const options = {
      types: ["screen"],
      thumbnailSize: { width, height },
    };

    const sources = await desktopCapturer.getSources(options);
    const primarySource = sources.find((source) => source.display_id == primaryDisplay.id) || sources[0];
    const image = primarySource.thumbnail.toJPEG(100);

    fs.writeFileSync(outputPath, image);
    return { path: outputPath };
  } catch (error) {
    console.error("Erro ao usar método genérico de captura:", error);
    throw error;
  }
}

ipcMain.handle('remove-screenshot', async (event, screenshotNumber) => {
  try {
    const screenshotPath = path.join(__dirname, "screenshots", `screenshot${screenshotNumber > 1 ? screenshotNumber : ''}.png`);

    if (fs.existsSync(screenshotPath)) {
      fs.unlinkSync(screenshotPath);
      console.log(`Screenshot ${screenshotNumber} removido: ${screenshotPath}`);
    } else {
      console.log(`Screenshot ${screenshotNumber} não encontrado: ${screenshotPath}`);
    }

    return { success: true };
  } catch (error) {
    console.error(`Erro ao remover screenshot ${screenshotNumber}:`, error);
    throw error;
  }
});

// Função para aplicar configurações ghost específicas para WSL
function applyWSLGhostMode(mainWindow) {
  try {
    mainWindow.setContentProtection(true);
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.setSkipTaskbar(true);
    mainWindow.setOpacity(0.99);

    // Tenta métodos adicionais para o WSL
    try {
      // Carregar helper do Linux
      const { linuxSetWindowAttributes } = require('./src/linuxGhostHelper');

      // Aplicar técnicas específicas para o Linux
      linuxSetWindowAttributes(mainWindow)
        .then(result => {
          console.log('Configurações avançadas WSL aplicadas:', result);
        })
        .catch(err => {
          console.error('Erro ao aplicar configurações avançadas WSL:', err);
        });

      // Adicionar mensagem para ajudar o usuário
      setTimeout(() => {
        if (mainWindow) {
          mainWindow.webContents.send('wsl-detected', {
            message: 'Ambiente WSL detectado. Algumas funções podem ter limitações.'
          });
        }
      }, 3000);
    } catch (helperError) {
      console.error('Erro ao carregar helper do Linux para WSL:', helperError);
    }

    return true;
  } catch (error) {
    console.error('Erro ao aplicar configurações WSL:', error);
    return false;
  }
}