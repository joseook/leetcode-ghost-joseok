const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Código para criar máscaras de janela no Linux que ajudam a evitar captura
class LinuxWindowMask {
  constructor() {
    this.initialized = false;
    this.maskWindowIds = [];
  }

  // Inicializar e verificar se temos as ferramentas necessárias
  async initialize() {
    if (this.initialized) return true;

    try {
      // Verificar se temos xdotool
      await this.execPromise('which xdotool');

      // Verificar se temos Node FFI
      try {
        const ffiBinPath = path.join(__dirname, '..', 'node_modules', 'ffi-napi');
        if (!fs.existsSync(ffiBinPath)) {
          console.log('Instalando módulos FFI para Linux...');
          await this.execPromise('cd "' + path.join(__dirname, '..') + '" && npm install ffi-napi ref-napi --no-save');
        }
      } catch (ffierr) {
        console.log('Não foi possível instalar FFI:', ffierr.message);
      }

      this.initialized = true;
      return true;
    } catch (error) {
      console.log('Erro ao inicializar LinuxWindowMask:', error.message);
      return false;
    }
  }

  // Criar uma janela especial que ajuda a bloquear capturas de tela
  async createMask(targetWindowId) {
    if (!this.initialized && !(await this.initialize())) {
      return false;
    }

    try {
      // Obter o ID da janela Electron se não fornecido
      const windowId = targetWindowId || await this.findElectronWindowId();
      if (!windowId) {
        console.log('Não foi possível encontrar ID da janela');
        return false;
      }

      console.log(`Criando máscara para janela ${windowId}`);

      // Obter informações da geometria da janela alvo
      const geometry = await this.getWindowGeometry(windowId);
      if (!geometry) {
        console.log('Não foi possível obter geometria da janela');
        return false;
      }

      // Criar um script temporário para usar com xdotool
      const scriptPath = this.createMaskScript(geometry);
      if (!scriptPath) {
        console.log('Não foi possível criar script de máscara');
        return false;
      }

      // Executar o script para criar janela de máscara
      const output = await this.execPromise(`bash "${scriptPath}"`);
      console.log('Saída do script de máscara:', output);

      // Limpar arquivo temporário
      try { fs.unlinkSync(scriptPath); } catch (e) { }

      return true;
    } catch (error) {
      console.error('Erro ao criar máscara de janela:', error);
      return false;
    }
  }

  // Encontrar o ID da janela Electron
  async findElectronWindowId() {
    try {
      const output = await this.execPromise('xdotool search --class "electron" || xdotool search --name "LeetCode Ghost Window"');
      if (!output) return null;

      const ids = output.trim().split('\n');
      if (ids.length === 0) return null;

      // Retornar o ID mais recente (geralmente último na lista)
      return ids[ids.length - 1];
    } catch (error) {
      console.log('Erro ao procurar ID da janela:', error.message);
      return null;
    }
  }

  // Obter geometria da janela
  async getWindowGeometry(windowId) {
    try {
      const output = await this.execPromise(`xwininfo -id ${windowId}`);

      // Extrair coordenadas e dimensões
      const xMatch = output.match(/Absolute upper-left X:\s+(\d+)/);
      const yMatch = output.match(/Absolute upper-left Y:\s+(\d+)/);
      const widthMatch = output.match(/Width:\s+(\d+)/);
      const heightMatch = output.match(/Height:\s+(\d+)/);

      if (!xMatch || !yMatch || !widthMatch || !heightMatch) {
        return null;
      }

      return {
        x: parseInt(xMatch[1]),
        y: parseInt(yMatch[1]),
        width: parseInt(widthMatch[1]),
        height: parseInt(heightMatch[1])
      };
    } catch (error) {
      console.log('Erro ao obter geometria:', error.message);
      return null;
    }
  }

  // Criar script para gerar máscara
  createMaskScript(geometry) {
    try {
      const scriptPath = path.join(os.tmpdir(), `ghost-mask-${Date.now()}.sh`);

      const script = `#!/bin/bash
# Script para criar máscara anti-captura
# Geometria: x=${geometry.x}, y=${geometry.y}, width=${geometry.width}, height=${geometry.height}

# Criar janela com xdotool
WINDOW_ID=$(xdotool selectwindow)

# Configurar janela como tipo especial (utility)
xprop -id $WINDOW_ID -f _NET_WM_WINDOW_TYPE 32a -set _NET_WM_WINDOW_TYPE _NET_WM_WINDOW_TYPE_UTILITY

# Configurar para ficar acima de todas as outras
xprop -id $WINDOW_ID -f _NET_WM_STATE 32a -set _NET_WM_STATE _NET_WM_STATE_ABOVE

# Deixar transparente mas bloqueando capturas
xprop -id $WINDOW_ID -f _NET_WM_WINDOW_OPACITY 32c -set _NET_WM_WINDOW_OPACITY 0xfffeffff

echo "ID da janela de máscara: $WINDOW_ID"
`;

      fs.writeFileSync(scriptPath, script);
      fs.chmodSync(scriptPath, '755');
      return scriptPath;
    } catch (error) {
      console.log('Erro ao criar script de máscara:', error.message);
      return null;
    }
  }

  // Promise wrapper para exec
  execPromise(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(stdout.trim());
      });
    });
  }
}

module.exports = new LinuxWindowMask(); 