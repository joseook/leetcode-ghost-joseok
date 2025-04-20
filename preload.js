const { contextBridge, ipcRenderer } = require('electron');
const { version } = require('./package.json');

function isWSLEnvironment() {
  const isLinux = process.platform === 'linux';
  if (!isLinux) return false;

  try {
    return process.env.WSL_DISTRO_NAME ||
      process.env.WSLENV ||
      navigator.userAgent.toLowerCase().includes('linux');
  } catch (error) {
    return false;
  }
}

contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  isWindows: process.platform === 'win32',
  isLinux: process.platform === 'linux',
  isMac: process.platform === 'darwin',
  linuxDetection: {
    isWayland: process.env.XDG_SESSION_TYPE === 'wayland',
    isX11: process.env.XDG_SESSION_TYPE === 'x11' || !process.env.XDG_SESSION_TYPE,
    xdgSessionType: process.env.XDG_SESSION_TYPE || 'unknown',
    display: process.env.DISPLAY || 'unknown'
  },
  isWSL: false,
  appVersion: version,

  captureScreen: () => ipcRenderer.invoke('capture-screen'),
  captureScreen2: () => ipcRenderer.invoke('capture-screen2'),
  captureScreen3: () => ipcRenderer.invoke('capture-screen3'),
  startAreaSelection: (screenshotNumber) => ipcRenderer.invoke('start-area-selection', screenshotNumber),
  removeScreenshot: (screenshotNumber) => ipcRenderer.invoke('remove-screenshot', screenshotNumber),

  findAnswerUsingScreenshot: (args) => ipcRenderer.invoke('find-answer-using-screenshot', args),
  testGhostMode: () => ipcRenderer.invoke('test-ghost-mode'),

  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),

  onTriggerScreenshot: (callback) => ipcRenderer.on('trigger-screenshot', callback),
  onTriggerScreenshot2: (callback) => ipcRenderer.on('trigger-screenshot2', callback),
  onTriggerScreenshot3: (callback) => ipcRenderer.on('trigger-screenshot3', callback),
  onTriggerAi1: (callback) => ipcRenderer.on('trigger-ai1', callback),
  onTriggerAi2: (callback) => ipcRenderer.on('trigger-ai2', callback),
  onTriggerAi3: (callback) => ipcRenderer.on('trigger-ai3', callback),
  onToggleWindowDrag: (callback) => ipcRenderer.on('toggle-window-drag', callback),
  onCheckGhostMode: (callback) => ipcRenderer.on('check-ghost-mode', callback),
  onShortcutRegistrationFailed: (callback) => ipcRenderer.on('shortcut-registration-failed', callback),
  onWslDetected: (callback) => ipcRenderer.on('wsl-detected', callback),
});

