/**
 * Módulo para aplicar configurações "ghost" em janelas no Windows
 * Este módulo utiliza funções nativas do Windows para tornar a janela
 * totalmente invisível para softwares de captura como OBS Studio
 */

const os = require('os');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Verificar se estamos rodando no WSL
function isWSL() {
  if (process.platform !== 'linux') return false;

  try {
    const version = fs.readFileSync('/proc/version', 'utf8');
    return version.toLowerCase().includes('microsoft') || version.toLowerCase().includes('wsl');
  } catch (error) {
    return false;
  }
}

// Implementação completa do modo ghost para Windows
function windowsSetWindowAttributes(hwnd) {
  if (process.platform !== 'win32' && !isWSL()) {
    console.log('windowsSetWindowAttributes só funciona no Windows ou WSL');
    return false;
  }

  // Se estivermos no WSL, usamos uma abordagem diferente
  if (isWSL()) {
    console.log('WSL detectado, usando método WSL para ghost window');
    return applyWSLGhostMethod();
  }

  try {
    // Em versões mais recentes do Electron, precisamos usar node-ffi-napi
    // Iremos fazer download e extrair os binários necessários
    const ffiPath = path.join(__dirname, '..', 'node_modules', 'ffi-napi');

    // Verificar se o arquivo já existe antes de tentar carregá-lo
    if (!fs.existsSync(ffiPath)) {
      console.log('Módulo FFI não encontrado, usando método alternativo...');
      return applyAlternativeGhostMethod(hwnd);
    }

    // Tente carregar os módulos necessários dinamicamente
    let ffi, ref;
    try {
      ffi = require('ffi-napi');
      ref = require('ref-napi');
    } catch (loadError) {
      console.log('Erro ao carregar FFI, usando método alternativo:', loadError.message);
      return applyAlternativeGhostMethod(hwnd);
    }

    // SetWindowDisplayAffinity constants
    const WDA_NONE = 0;
    const WDA_EXCLUDEFROMCAPTURE = 1; // Esta é a constante que faz a janela ficar "ghost"

    // SetLayeredWindowAttributes
    const LWA_ALPHA = 0x00000002;

    // Definimos vários métodos da user32.dll e dwmapi.dll para garantir que a janela fique ghost
    const user32 = ffi.Library('user32', {
      'SetWindowDisplayAffinity': ['bool', ['pointer', 'uint32']],
      'SetLayeredWindowAttributes': ['bool', ['pointer', 'uint32', 'uchar', 'uint32']],
      'GetWindowLongA': ['long', ['pointer', 'int']],
      'SetWindowLongA': ['long', ['pointer', 'int', 'long']]
    });

    try {
      // Carregamos também a biblioteca DWM para aplicar os atributos avançados de composição
      const dwmapi = ffi.Library('dwmapi', {
        'DwmSetWindowAttribute': ['long', ['pointer', 'uint32', 'pointer', 'uint32']]
      });

      // DWMWA_CLOAK = 13 (Windows 10 & 11)
      const DWMWA_CLOAK = 13;
      // DWMWA_EXCLUDED_FROM_PEEK = 12
      const DWMWA_EXCLUDED_FROM_PEEK = 12;

      // DWM_CLOAKED_APP = 2
      const DWM_CLOAKED_APP = 2;
      const DWM_CLOAKED_SHELL = 1;
      const DWM_CLOAKED_INHERITED = 4;

      // Criar buffer para valor
      const valueBuffer = Buffer.alloc(4);
      valueBuffer.writeInt32LE(DWM_CLOAKED_APP | DWM_CLOAKED_SHELL, 0);

      // Verificar se hwnd é um buffer e converter para um ponteiro que o FFI possa usar
      const hwndPtr = Buffer.isBuffer(hwnd) ? hwnd : Buffer.from(hwnd);

      // Aplicar DwmSetWindowAttribute 
      dwmapi.DwmSetWindowAttribute(hwndPtr, DWMWA_CLOAK, valueBuffer, 4);

      // Aplicar também exclusão do Peek
      const peekValue = Buffer.alloc(4);
      peekValue.writeInt32LE(1, 0);
      dwmapi.DwmSetWindowAttribute(hwndPtr, DWMWA_EXCLUDED_FROM_PEEK, peekValue, 4);

      console.log('Aplicado DwmSetWindowAttribute com sucesso');
    } catch (dwmError) {
      console.log('Erro ao usar DwmSetWindowAttribute:', dwmError.message);
    }

    // Garantir que hwnd seja um buffer
    const hwndPtr = Buffer.isBuffer(hwnd) ? hwnd : Buffer.from(hwnd);

    // Aplicar SetWindowDisplayAffinity - principal método para ocultar do OBS
    const result = user32.SetWindowDisplayAffinity(hwndPtr, WDA_EXCLUDEFROMCAPTURE);
    console.log('Aplicado SetWindowDisplayAffinity com resultado:', result);

    // Também aplicamos camadas e outros métodos para maior compatibilidade
    const GWL_EXSTYLE = -20;
    const WS_EX_LAYERED = 0x00080000;
    const WS_EX_TOOLWINDOW = 0x00000080; // Esconde da barra de tarefas e ALT+TAB

    // Obter estilo atual
    const currentStyle = user32.GetWindowLongA(hwndPtr, GWL_EXSTYLE);
    // Adicionar estilo layered e toolwindow
    user32.SetWindowLongA(hwndPtr, GWL_EXSTYLE, currentStyle | WS_EX_LAYERED | WS_EX_TOOLWINDOW);

    // Definir transparência parcial (isso ajuda em alguns casos)
    user32.SetLayeredWindowAttributes(hwndPtr, 0, 254, LWA_ALPHA);

    return true;
  } catch (error) {
    console.error('Erro ao aplicar atributos ghost do Windows:', error);
    return applyAlternativeGhostMethod(hwnd);
  }
}

// Método específico para WSL
function applyWSLGhostMethod() {
  console.log('Aplicando método ghost para WSL');

  try {
    // No WSL não podemos acessar diretamente as DLLs do Windows,
    // mas podemos aplicar algumas configurações básicas no Electron
    return true;
  } catch (error) {
    console.error('Erro ao aplicar método ghost para WSL:', error);
    return false;
  }
}

// Método alternativo se o principal falhar
function applyAlternativeGhostMethod(hwnd) {
  console.log('Aplicando método alternativo de ghost...');

  // Se estivermos no WSL, usar método específico
  if (isWSL()) {
    return applyWSLGhostMethod();
  }

  try {
    // Converter o handle da janela para um formato adequado para o script PowerShell
    let hwndValue;

    if (Buffer.isBuffer(hwnd)) {
      // No Electron, o handle é um buffer contendo um valor de 64-bits (Windows)
      // Precisamos extrair o valor numérico para usar no PowerShell
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
      // Se for uma string, verificar se já está em formato hex
      hwndValue = hwnd.startsWith('0x') ? hwnd : `0x${hwnd}`;
      console.log('HWND value (string):', hwndValue);
    } else {
      // Tratamento genérico para outros tipos, convertendo para string
      try {
        const hwndStr = String(hwnd);
        hwndValue = hwndStr.startsWith('0x') ? hwndStr : `0x${hwndStr}`;
        console.log('HWND value (converted):', hwndValue);
      } catch (err) {
        console.error('Erro ao converter hwnd:', err);
        hwndValue = '0x0'; // Valor padrão em caso de falha
      }
    }

    // Escrever um script PowerShell que aplica as configurações via P/Invoke
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
    
    # Aplicar SetWindowDisplayAffinity
    $result1 = [WindowsGhost]::SetWindowDisplayAffinity([IntPtr]$hwnd, $WDA_EXCLUDEFROMCAPTURE)
    
    # Aplicar DwmSetWindowAttribute
    $value = $DWM_CLOAKED_APP
    $result2 = [WindowsGhost]::DwmSetWindowAttribute([IntPtr]$hwnd, $DWMWA_CLOAK, [ref]$value, 4)
    
    # Retornar resultados
    Write-Output "SetWindowDisplayAffinity: $result1"
    Write-Output "DwmSetWindowAttribute: $result2"
    `;

    // Salvar o script em um arquivo temporário
    const tempScript = path.join(os.tmpdir(), 'ghost_script.ps1');
    fs.writeFileSync(tempScript, psScript);

    // Executar o script PowerShell
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