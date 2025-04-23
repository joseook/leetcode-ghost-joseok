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

      // Extrair ID da máscara do output
      const maskId = this.extractMaskId(output);
      if (maskId) {
        this.maskWindowIds.push(maskId);

        // Aplicar atributos X11 avançados
        await this.applyAdvancedMaskAttributes(maskId);
      }

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
xprop -id $WINDOW_ID -f _NET_WM_WINDOW_TYPE 32a -set _NET_WM_WINDOW_TYPE _NET_WM_WINDOW_TYPE_UTILITY,_NET_WM_WINDOW_TYPE_DND

# Configurar para ficar acima de todas as outras
xprop -id $WINDOW_ID -f _NET_WM_STATE 32a -set _NET_WM_STATE _NET_WM_STATE_ABOVE,_NET_WM_STATE_FOCUSED

# Aplicar configurações anti-captura adicionais
xprop -id $WINDOW_ID -f _NET_WM_BYPASS_COMPOSITOR 32c -set _NET_WM_BYPASS_COMPOSITOR 1
xprop -id $WINDOW_ID -f _COMPIZ_WM_WINDOW_BLUR 32c -set _COMPIZ_WM_WINDOW_BLUR 1
xprop -id $WINDOW_ID -f _NET_WM_SYNC_REQUEST_COUNTER 32c -set _NET_WM_SYNC_REQUEST_COUNTER 0x0

# Aplicar bits de configuração específicos para bloqueio de captura
# Valor especial 0xfffffffd - conhecido por ajudar a bloquear capturas em alguns compositors
xprop -id $WINDOW_ID -f _NET_WM_WINDOW_OPACITY 32c -set _NET_WM_WINDOW_OPACITY 0xfffffffd

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

  // Extrair ID da máscara do output
  extractMaskId(output) {
    const match = output.match(/ID da janela de máscara:\s*(\d+)/);
    return match ? match[1] : null;
  }

  // Aplicar atributos X11 avançados para a máscara
  async applyAdvancedMaskAttributes(maskId) {
    if (!maskId) return false;

    try {
      // Lista de comandos avançados para bloquear capturas de tela
      const commands = [
        // Configurar tipo específico para evitar captura
        `xprop -id ${maskId} -f _NET_WM_WINDOW_TYPE 32a -set _NET_WM_WINDOW_TYPE _NET_WM_WINDOW_TYPE_DOCK,_NET_WM_WINDOW_TYPE_NOTIFICATION,_NET_WM_WINDOW_TYPE_DROPDOWN_MENU`,

        // Configurar estado para ficar acima
        `xprop -id ${maskId} -f _NET_WM_STATE 32a -set _NET_WM_STATE _NET_WM_STATE_ABOVE,_NET_WM_STATE_FOCUSED,_NET_WM_STATE_MODAL`,

        // Fazer compositing especial
        `xprop -id ${maskId} -f _NET_WM_BYPASS_COMPOSITOR 32c -set _NET_WM_BYPASS_COMPOSITOR 2`,

        // Definir opacidade especial conhecida por interferir com gravadores
        `xprop -id ${maskId} -f _NET_WM_WINDOW_OPACITY 32c -set _NET_WM_WINDOW_OPACITY 0xfffffffc`,

        // Adicionar flag específica para o mutter/gnome-shell
        `xprop -id ${maskId} -f _MUTTER_HINTS 32c -set _MUTTER_HINTS 0x1`,

        // Configuração adicional para evitar detecção
        `xprop -id ${maskId} -f _COMPIZ_WM_WINDOW_BLUR 32c -set _COMPIZ_WM_WINDOW_BLUR 2`,

        // Configurar como janela para ignorar via X11
        `xprop -id ${maskId} -f _X11_NO_SNOOP 32c -set _X11_NO_SNOOP 1 2>/dev/null`
      ];

      // Executar os comandos sequencialmente
      for (const cmd of commands) {
        try {
          await this.execPromise(cmd);
        } catch (err) {
          // Ignorar erros individuais de comandos
        }
      }

      return true;
    } catch (error) {
      console.error('Erro ao aplicar atributos avançados à máscara:', error);
      return false;
    }
  }
}

module.exports = new LinuxWindowMask(); 