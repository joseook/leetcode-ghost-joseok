const os = require('os');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function isWSL() {
  if (process.platform !== 'linux') return false;

  try {
    const version = fs.readFileSync('/proc/version', 'utf8');
    return version.toLowerCase().includes('microsoft') || version.toLowerCase().includes('wsl');
  } catch (error) {
    return false;
  }
}

function windowsSetWindowAttributes(hwnd) {
  if (process.platform !== 'win32' && !isWSL()) {
    console.log('windowsSetWindowAttributes só funciona no Windows ou WSL');
    return false;
  }

  if (isWSL()) {
    console.log('WSL detectado, usando método WSL para ghost window');
    return applyWSLGhostMethod();
  }

  try {
    const ffiPath = path.join(__dirname, '..', 'node_modules', 'ffi-napi');

    if (!fs.existsSync(ffiPath)) {
      console.log('Módulo FFI não encontrado, usando método alternativo...');
      return applyAlternativeGhostMethod(hwnd);
    }

    let ffi, ref;
    try {
      ffi = require('ffi-napi');
      ref = require('ref-napi');
    } catch (loadError) {
      console.log('Erro ao carregar FFI, usando método alternativo:', loadError.message);
      return applyAlternativeGhostMethod(hwnd);
    }

    const WDA_NONE = 0;
    const WDA_EXCLUDEFROMCAPTURE = 1;

    const LWA_ALPHA = 0x00000002;

    const user32 = ffi.Library('user32', {
      'SetWindowDisplayAffinity': ['bool', ['pointer', 'uint32']],
      'SetLayeredWindowAttributes': ['bool', ['pointer', 'uint32', 'uchar', 'uint32']],
      'GetWindowLongA': ['long', ['pointer', 'int']],
      'SetWindowLongA': ['long', ['pointer', 'int', 'long']]
    });

    try {
      const dwmapi = ffi.Library('dwmapi', {
        'DwmSetWindowAttribute': ['long', ['pointer', 'uint32', 'pointer', 'uint32']]
      });

      const DWMWA_CLOAK = 13;
      const DWMWA_EXCLUDED_FROM_PEEK = 12;

      const DWM_CLOAKED_APP = 2;
      const DWM_CLOAKED_SHELL = 1;
      const DWM_CLOAKED_INHERITED = 4;

      const valueBuffer = Buffer.alloc(4);
      valueBuffer.writeInt32LE(DWM_CLOAKED_APP | DWM_CLOAKED_SHELL, 0);

      const hwndPtr = Buffer.isBuffer(hwnd) ? hwnd : Buffer.from(hwnd);

      dwmapi.DwmSetWindowAttribute(hwndPtr, DWMWA_CLOAK, valueBuffer, 4);

      const peekValue = Buffer.alloc(4);
      peekValue.writeInt32LE(1, 0);
      dwmapi.DwmSetWindowAttribute(hwndPtr, DWMWA_EXCLUDED_FROM_PEEK, peekValue, 4);

      console.log('Aplicado DwmSetWindowAttribute com sucesso');
    } catch (dwmError) {
      console.log('Erro ao usar DwmSetWindowAttribute:', dwmError.message);
    }

    const hwndPtr = Buffer.isBuffer(hwnd) ? hwnd : Buffer.from(hwnd);

    const result = user32.SetWindowDisplayAffinity(hwndPtr, WDA_EXCLUDEFROMCAPTURE);
    console.log('Aplicado SetWindowDisplayAffinity com resultado:', result);

    const GWL_EXSTYLE = -20;
    const WS_EX_LAYERED = 0x00080000;
    const WS_EX_TOOLWINDOW = 0x00000080;

    const currentStyle = user32.GetWindowLongA(hwndPtr, GWL_EXSTYLE);
    user32.SetWindowLongA(hwndPtr, GWL_EXSTYLE, currentStyle | WS_EX_LAYERED | WS_EX_TOOLWINDOW);

    user32.SetLayeredWindowAttributes(hwndPtr, 0, 254, LWA_ALPHA);

    return true;
  } catch (error) {
    console.error('Erro ao aplicar atributos ghost do Windows:', error);
    return applyAlternativeGhostMethod(hwnd);
  }
}

function applyWSLGhostMethod() {
  console.log('Aplicando método ghost para WSL');

  try {
    return true;
  } catch (error) {
    console.error('Erro ao aplicar método ghost para WSL:', error);
    return false;
  }
}

function applyAlternativeGhostMethod(hwnd) {
  console.log('Aplicando método alternativo de ghost...');

  if (isWSL()) {
    return applyWSLGhostMethod();
  }

  try {
    let hwndValue;

    if (Buffer.isBuffer(hwnd)) {
      if (process.arch === 'x64') {
        hwndValue = `0x${hwnd.readBigUInt64LE(0).toString(16)}`;
      } else {
        hwndValue = `0x${hwnd.readUInt32LE(0).toString(16)}`;
      }
      console.log('HWND value (buffer):', hwndValue);
    } else if (typeof hwnd === 'number') {
      hwndValue = `0x${hwnd.toString(16)}`;
      console.log('HWND value (number):', hwndValue);
    } else if (typeof hwnd === 'string') {
      hwndValue = hwnd.startsWith('0x') ? hwnd : `0x${hwnd}`;
      console.log('HWND value (string):', hwndValue);
    } else {
      try {
        const hwndStr = String(hwnd);
        hwndValue = hwndStr.startsWith('0x') ? hwndStr : `0x${hwndStr}`;
        console.log('HWND value (converted):', hwndValue);
      } catch (err) {
        console.error('Erro ao converter hwnd:', err);
        hwndValue = '0x0';
      }
    }

    const psScript = `
    Add-Type -TypeDefinition @"
    using System;
    using System.Runtime.InteropServices;
    
    public class WindowsGhost {
        [DllImport("user32.dll")]
        public static extern bool SetWindowDisplayAffinity(IntPtr hWnd, uint dwAffinity);
        
        [DllImport("dwmapi.dll")]
        public static extern int DwmSetWindowAttribute(IntPtr hwnd, uint dwAttribute, ref int pvAttribute, uint cbAttribute);
    }
"@
    
    $hwnd = ${hwndValue}
    $WDA_EXCLUDEFROMCAPTURE = 1
    $DWMWA_CLOAK = 13
    $DWM_CLOAKED_APP = 2
    
    $result1 = [WindowsGhost]::SetWindowDisplayAffinity([IntPtr]$hwnd, $WDA_EXCLUDEFROMCAPTURE)
    
    $value = $DWM_CLOAKED_APP
    $result2 = [WindowsGhost]::DwmSetWindowAttribute([IntPtr]$hwnd, $DWMWA_CLOAK, [ref]$value, 4)
    
    Write-Output "SetWindowDisplayAffinity: $result1"
    Write-Output "DwmSetWindowAttribute: $result2"
    `;

    const tempScript = path.join(os.tmpdir(), 'ghost_script.ps1');
    fs.writeFileSync(tempScript, psScript);

    const output = execSync(`powershell -ExecutionPolicy Bypass -File "${tempScript}"`).toString();

    console.log('Método alternativo de ghost aplicado com saída:', output);
    return true;
  } catch (error) {
    console.error('Erro ao aplicar método alternativo de ghost:', error);
    return false;
  }
}

module.exports = {
  windowsSetWindowAttributes
};