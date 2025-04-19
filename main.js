require('dotenv').config();
const { app, BrowserWindow, globalShortcut, desktopCapturer, ipcMain, screen, Menu, Tray, dialog, nativeImage } = require('electron/main');
const path = require('node:path')
const fs = require('fs');
const os = require('os');
const { exec, execSync } = require('child_process');
const { ChatGptHelper } = require('./src/ChatGptHelper');
const { Utils } = require('./src/Utils');
const Store = require('electron-store');

// Inicializar o armazenamento de configurações
const settings = new Store({
  name: 'ghost-settings',
  defaults: {
    ghostMode: true,
    apiKey: '',
    theme: 'dark'
  }
});

// Inicializar variáveis
let tray = null;
let mainWindow = null;
let splashWindow = null;

const isWindows = process.platform === 'win32';
const isLinux = process.platform === 'linux';
const isMac = process.platform === 'darwin';

// Verifica se a pasta de screenshots existe, se não, cria
const screenshotsDir = path.join(__dirname, "screenshots");
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Verifica se a pasta de assets existe, se não, cria
const assetsDir = path.join(__dirname, "assets", "images");
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Cria um ícone padrão caso não exista
const iconPath = path.join(__dirname, 'assets', 'images', 'icon.png');
if (!fs.existsSync(iconPath)) {
  try {
    // Criar um ícone padrão simples usando nativeImage
    const size = 32;
    // Usar PNG diretamente ao invés de SVG para melhor compatibilidade com WSL
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

// Função para criar a janela de splash
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

// Verificar e instalar as dependências necessárias para o modo ghost
function checkAndInstallDependencies() {
  return new Promise((resolve) => {
    if (isWindows) {
      // No Windows, verificar se temos as dependências FFI instaladas
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
      // No Linux, verificamos e instalamos pacotes necessários para X11/Wayland
      console.log('Verificando dependências do Linux para modo ghost...');
      try {
        // Dependências apenas para compilação, não para runtime
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

// Detectar se estamos rodando no WSL (Windows Subsystem for Linux)
async function isRunningInWSL() {
  if (process.platform !== 'linux') return false;

  try {
    const { readFile } = require('fs/promises');
    const data = await readFile('/proc/version', 'utf8');
    return data.toLowerCase().includes('microsoft') || data.toLowerCase().includes('wsl');
  } catch (error) {
    console.error('Erro ao verificar WSL:', error);
    return false;
  }
}

// Configurar variáveis de ambiente para WSL
function configureWSLEnvironment() {
  if (!isWSL) return;

  // Verificar se já temos uma variável DISPLAY configurada
  if (process.env.DISPLAY) {
    console.log(`Usando DISPLAY existente: ${process.env.DISPLAY}`);
    return;
  }

  try {
    // Tentar determinar o IP do host Windows
    let hostIp = '127.0.0.1';
    try {
      // No WSL2, podemos tentar obter o IP do host Windows
      const wslHostIp = execSync('cat /etc/resolv.conf | grep nameserver | awk \'{print $2}\'', { encoding: 'utf8' }).trim();
      if (wslHostIp && wslHostIp.match(/^\d+\.\d+\.\d+\.\d+$/)) {
        hostIp = wslHostIp;
        console.log(`Usando IP do host WSL: ${hostIp}`);
      }
    } catch (err) {
      console.log('Não foi possível determinar o IP do host WSL, usando localhost');
    }

    // Configurar DISPLAY para apontar para o servidor X no Windows
    // Tentamos várias opções comuns para DISPLAY
    const displayOptions = [
      `${hostIp}:0.0`,  // WSL2 com X server no Windows
      `:0`,            // WSL com X server no localhost
      `:0.0`,          // Alternativa comum
      `localhost:0.0`   // Outra alternativa
    ];

    // Tentar cada opção de DISPLAY até encontrar uma que funcione
    let displayWorking = false;
    for (const display of displayOptions) {
      process.env.DISPLAY = display;
      try {
        console.log(`Tentando DISPLAY=${display}`);
        // Tentar verificar se o display funciona
        execSync('xset q', { stdio: 'ignore' });
        console.log(`Configurado DISPLAY=${display} para suporte GUI no WSL`);
        displayWorking = true;
        break;
      } catch (error) {
        // Continuar tentando
      }
    }

    if (!displayWorking) {
      console.log(`Não foi possível encontrar um DISPLAY funcional, usando ${process.env.DISPLAY}`);
    }

    // Desabilitar aceleração de hardware no WSL para evitar problemas
    app.disableHardwareAcceleration();

    // Adicionar flags específicas para WSL
    app.commandLine.appendSwitch('no-sandbox');
    console.log('Hardware acceleration desabilitada e modo no-sandbox ativado para WSL');
  } catch (error) {
    console.error('Erro ao configurar ambiente WSL:', error);
  }
}

let isWSL = false;

// Aplicar o modo ghost avançado no Windows/macOS/WSL
function applyAdvancedGhostMode(mainWindow) {
  if (process.platform === 'win32') {
    try {
      const { windowsSetWindowAttributes } = require('./src/windowsGhostHelper');

      // Obter o handle nativo da janela
      const hwnd = mainWindow.getNativeWindowHandle();

      // Passar diretamente o handle para a função
      const result = windowsSetWindowAttributes(hwnd);

      // No Windows, garantir que a janela está realmente em modo ghost
      // após retornar da minimização aplicando algumas configurações adicionais
      mainWindow.setContentProtection(true);
      mainWindow.setAlwaysOnTop(true, 'screen-saver');

      // Garantir que ele não apareça na barra de tarefas após restauração
      mainWindow.setSkipTaskbar(true);

      console.log('Modo ghost avançado aplicado:', result);
      return result;
    } catch (error) {
      console.error('Erro ao aplicar modo ghost avançado:', error);
      return false;
    }
  } else if (process.platform === 'darwin') {
    // No macOS, usamos combinações de configurações específicas
    try {
      mainWindow.setAlwaysOnTop(true, 'modal-panel');
      mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      mainWindow.setOpacity(0.99); // Pequena modificação na opacidade
      mainWindow.setContentProtection(true);
      mainWindow.setSkipTaskbar(true);

      // Configuração para evitar captura no macOS
      mainWindow.setWindowButtonVisibility(false);

      console.log('Modo ghost configurado para macOS');
      return true;
    } catch (error) {
      console.error('Erro ao configurar atributos ghost para macOS:', error);
      mainWindow.setContentProtection(true);
      return false;
    }
  } else if (isWSL) {
    // No WSL, aplicamos configurações básicas já que não temos acesso às APIs nativas do Windows
    console.log('Executando no WSL, aplicando modo ghost básico');
    mainWindow.setContentProtection(true);
    mainWindow.setSkipTaskbar(true);
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    return true;
  } else if (isLinux) {
    // No Linux, usamos técnicas adicionais
    try {
      // Primeiro aplicamos as configurações básicas
      mainWindow.setSkipTaskbar(true);
      mainWindow.setAlwaysOnTop(true, 'pop-up-menu');
      mainWindow.setMenuBarVisibility(false);
      mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      mainWindow.setContentProtection(true);

      // Configurações avançadas para X11/Wayland
      mainWindow.setOpacity(0.99); // A opacidade 0.99 ajuda com alguns compositors

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

// Função para criar a janela principal
function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 400,
    height: 650,
    icon: iconPath,
    frame: false, // Sem bordas para design minimalista
    transparent: true, // Transparência para design moderno
    backgroundThrottling: true,
    hasShadow: false,
    skipTaskbar: true,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false,
      nodeIntegration: false, // keep false for security
      enableRemoteModule: false,
      sandbox: false
    }
  });

  // Ghost Window Configuration - básico
  mainWindow.setContentProtection(true);
  mainWindow.loadFile('index.html');

  // Adicionar eventos para reforçar o modo ghost quando a janela é restaurada
  mainWindow.on('restore', () => {
    // Reaplicar o modo ghost quando a janela é restaurada
    const ghostModeEnabled = settings.get('ghostMode');
    if (ghostModeEnabled) {
      setTimeout(() => {
        applyAdvancedGhostMode(mainWindow);
      }, 500); // Pequeno atraso para garantir que a janela foi completamente restaurada
    }
  });

  mainWindow.on('show', () => {
    // Reaplicar o modo ghost quando a janela é mostrada
    const ghostModeEnabled = settings.get('ghostMode');
    if (ghostModeEnabled) {
      setTimeout(() => {
        applyAdvancedGhostMode(mainWindow);
      }, 500); // Pequeno atraso para garantir que a janela foi completamente mostrada
    }
  });

  // Registrar atalhos globais adaptados para cada plataforma
  registerShortcuts(mainWindow);

  // Debug mode - uncomment if needed
  // mainWindow.webContents.openDevTools();
  mainWindow.setMenu(null);

  return mainWindow;
}

// Função para registrar atalhos de teclado de acordo com a plataforma
function registerShortcuts(window) {
  // Determinar qual modificador usar com base na plataforma
  const modKey = isMac ? 'Command' : 'Control';

  // Atalhos para captura de tela
  globalShortcut.register(`${modKey}+shift+1`, () => {
    if (window) window.webContents.send('trigger-screenshot');
  });

  globalShortcut.register(`${modKey}+shift+2`, () => {
    if (window) window.webContents.send('trigger-screenshot2');
  });

  globalShortcut.register(`${modKey}+shift+3`, () => {
    if (window) window.webContents.send('trigger-screenshot3');
  });

  // Atalhos para processamento de IA
  globalShortcut.register(`${modKey}+shift+a`, () => {
    if (window) window.webContents.send('trigger-ai1');
  });

  globalShortcut.register(`${modKey}+shift+b`, () => {
    if (window) window.webContents.send('trigger-ai2');
  });

  globalShortcut.register(`${modKey}+shift+c`, () => {
    if (window) window.webContents.send('trigger-ai3');
  });

  // Atalhos para controle da janela
  globalShortcut.register(`${modKey}+shift+h`, () => {
    if (window) window.hide();
  });

  globalShortcut.register(`${modKey}+shift+s`, () => {
    if (window) {
      window.show();
      // Reforçar o modo ghost quando mostramos a janela explicitamente
      const ghostModeEnabled = settings.get('ghostMode');
      if (ghostModeEnabled) {
        setTimeout(() => {
          applyAdvancedGhostMode(window);
        }, 500);
      }
    }
  });

  // Atalho para fechar o aplicativo
  // No macOS, usar Command+Q que é a convenção da plataforma
  const quitShortcut = isMac ? 'Command+q' : `${modKey}+shift+q`;
  globalShortcut.register(quitShortcut, () => {
    app.quit();
  });

  // Atalho para mover a janela
  globalShortcut.register(`${modKey}+shift+m`, () => {
    if (window) window.webContents.send('toggle-window-drag');
  });

  console.log(`Atalhos registrados para plataforma: ${process.platform}`);
}

// Aplicar configurações iniciais
function applyInitialConfiguration(mainWindow) {
  // Aplicar configurações avançadas de modo ghost se estiver ativado
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
    // Verificar se o tray já existe
    if (tray !== null) {
      return;
    }

    // Criar um ícone vazio como fallback para garantir
    const emptyIcon = nativeImage.createEmpty();

    // Tentar carregar o ícone do arquivo
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
    // Não deixar esse erro impedir a execução do aplicativo
  }
}

// Configurações de linha de comando para melhorar a captura e o modo ghost
app.commandLine.appendSwitch('enable-usermedia-screen-capturing');
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');
app.commandLine.appendSwitch('high-dpi-support', '1');
app.commandLine.appendSwitch('force-device-scale-factor', '1');

// No Linux, podemos usar algumas flags adicionais
if (isLinux) {
  app.commandLine.appendSwitch('disable-gpu-compositing');
  app.commandLine.appendSwitch('enable-transparent-visuals');
  app.commandLine.appendSwitch('disable-software-rasterizer');
  app.disableHardwareAcceleration(); // Isso pode ajudar com alguns problemas de captura no Linux
}

app.whenReady().then(async () => {
  // Verificar se estamos no WSL
  isWSL = await isRunningInWSL();
  if (isWSL) {
    console.log('Detectado ambiente WSL - aplicando configurações específicas');
    configureWSLEnvironment();
  }

  // Mostrar splash screen
  splashWindow = createSplashWindow();

  // Verificar e instalar dependências
  await checkAndInstallDependencies();

  // Criar a janela principal
  mainWindow = createMainWindow();

  // Aplicar configuração inicial (incluindo modo ghost)
  applyInitialConfiguration(mainWindow);

  // Handlers para IPC de controle de janela
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

  // Quando a janela principal estiver pronta, fechar o splash
  mainWindow.webContents.once('did-finish-load', () => {
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
      }

      mainWindow.show();

      // Verificar se o modo ghost está funcionando após 5 segundos
      setTimeout(() => {
        // Aplicar novamente caso necessário se o modo ghost estiver ativado
        const ghostModeEnabled = settings.get('ghostMode');
        if (ghostModeEnabled) {
          applyAdvancedGhostMode(mainWindow);
        }
        mainWindow.webContents.send('check-ghost-mode');
      }, 5000);
    }, 1500); // Mostrar o splash por pelo menos 1.5 segundos
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
      applyInitialConfiguration(mainWindow);
    }
  });
});

app.on('will-quit', () => {
  // Limpar todos os atalhos registrados quando o app for fechado
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handler para captura de tela
ipcMain.handle('capture-screen', async () => {
  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.size;

    const options = {
      types: ["screen"],
      thumbnailSize: { width, height },
    }

    const sources = await desktopCapturer.getSources(options);

    // Tentar obter a tela primária
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

    // Tentar obter a tela primária
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

    // Tentar obter a tela primária
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

// Handler para verificar se o modo ghost está funcionando
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

// Handler para seleção de área para screenshot
ipcMain.handle('start-area-selection', async (event, screenshotNumber) => {
  try {
    // Ocultar temporariamente a janela principal para capturar a tela
    if (mainWindow) {
      mainWindow.hide();
    }

    // Aguardar um momento para garantir que a janela está oculta
    await new Promise(resolve => setTimeout(resolve, 500));

    // Captura direta da tela inteira em vez de seleção de área
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

    // Mostrar a janela principal novamente após a captura
    if (mainWindow) {
      mainWindow.show();
    }

    return result;
  } catch (error) {
    console.error("Erro ao capturar tela:", error);

    // Mostrar a janela principal novamente em caso de erro
    if (mainWindow) {
      mainWindow.show();
    }

    throw new Error(`Falha ao capturar screenshot ${screenshotNumber}: ${error.message}`);
  }
});

// Captura de tela inteira no Windows
async function captureFullScreenWindows(screenshotNumber) {
  try {
    // Caminho para o arquivo de saída
    const outputPath = path.join(__dirname, "screenshots", `screenshot${screenshotNumber > 1 ? screenshotNumber : ''}.png`);

    // Usar diretamente o desktopCapturer do Electron para capturar a tela inteira
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

    // Capturar a imagem da tela
    const image = primarySource.thumbnail.toJPEG(100);

    // Salvar a imagem no disco
    fs.writeFileSync(outputPath, image);

    console.log(`Screenshot ${screenshotNumber} capturado e salvo em: ${outputPath}`);
    return { path: outputPath };
  } catch (error) {
    console.error("Erro ao capturar tela no Windows:", error);
    throw error;
  }
}

// Captura de tela inteira no Linux
async function captureFullScreenLinux(screenshotNumber) {
  try {
    const outputPath = path.join(__dirname, "screenshots", `screenshot${screenshotNumber > 1 ? screenshotNumber : ''}.png`);

    // Tentar usar comandos nativos do Linux primeiro
    try {
      execSync(`gnome-screenshot -f "${outputPath}"`, { timeout: 3000 });
      if (fs.existsSync(outputPath)) {
        return { path: outputPath };
      }
    } catch (gnomeError) {
      console.log("gnome-screenshot falhou, tentando método alternativo");
    }

    // Fallback: usar desktopCapturer
    return await captureGenericScreenArea(screenshotNumber);
  } catch (error) {
    console.error("Erro ao capturar tela no Linux:", error);
    return await captureGenericScreenArea(screenshotNumber);
  }
}

// Captura de tela inteira no macOS
async function captureFullScreenMac(screenshotNumber) {
  try {
    const outputPath = path.join(__dirname, "screenshots", `screenshot${screenshotNumber > 1 ? screenshotNumber : ''}.png`);

    // Usar o utilitário nativo screencapture do macOS para tela inteira
    execSync(`screencapture "${outputPath}"`, { timeout: 3000 });

    if (fs.existsSync(outputPath)) {
      return { path: outputPath };
    } else {
      throw new Error('Falha ao salvar a captura de tela');
    }
  } catch (error) {
    console.error("Erro ao capturar tela no macOS:", error);
    // Fallback: usar desktopCapturer
    return await captureGenericScreenArea(screenshotNumber);
  }
}

// Método genérico de captura para qualquer plataforma
async function captureGenericScreenArea(screenshotNumber) {
  try {
    const outputPath = path.join(__dirname, "screenshots", `screenshot${screenshotNumber > 1 ? screenshotNumber : ''}.png`);

    // Capturar a tela inteira usando desktopCapturer
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

// Handler para remover um screenshot
ipcMain.handle('remove-screenshot', async (event, screenshotNumber) => {
  try {
    const screenshotPath = path.join(__dirname, "screenshots", `screenshot${screenshotNumber > 1 ? screenshotNumber : ''}.png`);

    // Verificar se o arquivo existe antes de tentar deletar
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