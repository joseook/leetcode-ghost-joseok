const os = require('os');
const fs = require('fs');
const path = require('path');
const { exec, execSync } = require('child_process');

// Import do LinuxWindowMask
let linuxMask;
try {
  linuxMask = require('./create-mask');
} catch (error) {
  console.log('Módulo create-mask não encontrado, funcionalidade limitada');
}

// Verifica se as bibliotecas necessárias estão instaladas
function checkLinuxDependencies() {
  try {
    // Verifica xprop
    execSync('which xprop', { stdio: 'ignore' });

    // Verifica xdotool
    try {
      execSync('which xdotool', { stdio: 'ignore' });
    } catch (e) {
      console.log('xdotool não encontrado, algumas funcionalidades ghost serão limitadas');
    }

    return true;
  } catch (error) {
    console.error('Dependências do Linux não encontradas:', error.message);
    console.log('Tente instalar: sudo apt-get install libx11-dev libxss-dev x11-utils xdotool');
    return false;
  }
}

// Aplica métodos de ocultação avançados para o Linux
async function linuxSetWindowAttributes(windowId) {
  try {
    // Primeiro tenta usar métodos nativos do Electron
    applyBasicElectronAttributes(windowId);

    // Depois tenta métodos X11 mais avançados
    await applyX11Attributes(windowId);

    // Se temos o LinuxWindowMask disponível, usamos ele também
    if (linuxMask) {
      try {
        console.log('Inicializando sistema de máscaras Linux...');
        await linuxMask.initialize();
        console.log('Criando máscara para janela...');
        setTimeout(async () => {
          await linuxMask.createMask();
        }, 1000);
      } catch (maskError) {
        console.error('Erro ao usar LinuxWindowMask:', maskError);
      }
    }

    return true;
  } catch (error) {
    console.error('Erro ao aplicar atributos Linux:', error.message);
    return false;
  }
}

// Aplica atributos básicos do Electron
function applyBasicElectronAttributes(window) {
  try {
    // Aplica configurações básicas via electron
    window.setContentProtection(true);
    window.setOpacity(0.99); // Pequena modificação na opacidade que ajuda a evitar captura

    console.log('Aplicadas configurações básicas Electron');
    return true;
  } catch (error) {
    console.error('Erro nas configurações básicas:', error);
    return false;
  }
}

// Aplica atributos avançados via X11
async function applyX11Attributes(window) {
  try {
    // Obtém o ID nativo da janela X11
    const windowId = await getX11WindowId(window.id);
    if (!windowId) {
      console.log('Não foi possível obter ID da janela X11');
      return false;
    }

    console.log(`ID da janela X11 obtido: ${windowId}`);

    // Aplica uma série de configurações X11 para ocultar a janela
    const commands = [
      // Desabilita captura de conteúdo
      `xprop -id ${windowId} -f _NET_WM_STATE 32a -set _NET_WM_STATE _NET_WM_STATE_SKIP_PAGER,_NET_WM_STATE_SKIP_TASKBAR`,

      // Configura opacidade e tipo de janela
      `xprop -id ${windowId} -f _NET_WM_WINDOW_OPACITY 32c -set _NET_WM_WINDOW_OPACITY 0xfffffffe`,

      // Define a janela como tipo "utility" para reduzir a visibilidade
      `xprop -id ${windowId} -f _NET_WM_WINDOW_TYPE 32a -set _NET_WM_WINDOW_TYPE _NET_WM_WINDOW_TYPE_UTILITY,_NET_WM_WINDOW_TYPE_NOTIFICATION`,

      // Configura propriedades avançadas
      `xprop -id ${windowId} -f _MOTIF_WM_HINTS 32c -set _MOTIF_WM_HINTS 0x2, 0x0, 0x1, 0x0, 0x0`,

      // Configura como não-capturável (funciona em alguns compositors)
      `xprop -id ${windowId} -f _NET_WM_BYPASS_COMPOSITOR 32c -set _NET_WM_BYPASS_COMPOSITOR 1`,

      // Configura como janela acima das outras
      `xprop -id ${windowId} -f _NET_WM_STATE 32a -set _NET_WM_STATE _NET_WM_STATE_ABOVE,_NET_WM_STATE_FOCUSED`
    ];

    // Executa os comandos em paralelo
    const promises = commands.map(cmd => {
      return new Promise((resolve) => {
        exec(cmd, (error) => {
          if (error) {
            console.log(`Falha ao executar: ${cmd}`, error.message);
          } else {
            console.log(`Executado com sucesso: ${cmd}`);
          }
          resolve();
        });
      });
    });

    await Promise.all(promises);

    // Tenta criar uma janela virtual "acima" para bloquear capturas
    createOverlayWindow(windowId);

    return true;
  } catch (error) {
    console.error('Erro ao aplicar atributos X11:', error);
    return false;
  }
}

// Obtém o ID real da janela X11 a partir do ID do Electron
async function getX11WindowId(electronWindowId) {
  return new Promise((resolve) => {
    try {
      // Tenta obter o ID da janela X11 associada à janela Electron
      exec('xwininfo -root -children | grep -i electron', (error, stdout) => {
        if (error) {
          console.error('Erro ao buscar janela X11:', error);

          // Tenta método alternativo
          exec('xdotool search --class "electron"', (err2, stdout2) => {
            if (err2 || !stdout2.trim()) {
              console.log('Nenhuma janela Electron encontrada com xdotool');
              resolve(null);
            } else {
              const lines = stdout2.trim().split('\n');
              // Pega a janela mais recente
              const windowId = lines[lines.length - 1].trim();
              console.log('ID da janela encontrado via xdotool:', windowId);
              resolve(windowId);
            }
          });
          return;
        }

        // Processa a saída do xwininfo
        const lines = stdout.split('\n');
        for (const line of lines) {
          // Busca por uma janela Electron
          if (line.includes('Electron') || line.includes('electron')) {
            const match = line.match(/0x[0-9a-f]+/);
            if (match) {
              console.log('ID da janela X11 encontrado via xwininfo:', match[0]);
              resolve(match[0]);
              return;
            }
          }
        }

        console.log('ID da janela X11 não encontrado nos resultados');
        resolve(null);
      });
    } catch (error) {
      console.error('Erro ao obter ID da janela X11:', error);
      resolve(null);
    }
  });
}

// Cria uma janela de sobreposição para ajudar a bloquear capturas
function createOverlayWindow(parentWindowId) {
  try {
    // Tenta criar uma janela de sobreposição usando xlib diretamente
    const scriptPath = path.join(__dirname, 'create-overlay.sh');

    // Cria o script se não existir
    if (!fs.existsSync(scriptPath)) {
      const script = `#!/bin/bash
# Cria uma janela de sobreposição invisível
xprop -id ${parentWindowId} _NET_FRAME_EXTENTS | grep -o "[0-9]\\+" | xargs | read left right top bottom
if [ $? -ne 0 ]; then
  left=0; right=0; top=0; bottom=0
fi

xprop -id ${parentWindowId} _NET_WM_WINDOW_TYPE 32a -set _NET_WM_WINDOW_TYPE _NET_WM_WINDOW_TYPE_UTILITY
xprop -id ${parentWindowId} -f _NET_WM_BYPASS_COMPOSITOR 32c -set _NET_WM_BYPASS_COMPOSITOR 1

echo "Aplicadas propriedades adicionais ao ID ${parentWindowId}"
exit 0
`;

      fs.writeFileSync(scriptPath, script);
      fs.chmodSync(scriptPath, '755');

      exec(scriptPath, (error, stdout) => {
        if (error) {
          console.error('Erro ao executar script de sobreposição:', error);
        } else {
          console.log('Script de sobreposição executado com sucesso:', stdout);
        }
      });
    }

    return true;
  } catch (error) {
    console.error('Erro ao criar janela de sobreposição:', error);
    return false;
  }
}

module.exports = {
  linuxSetWindowAttributes,
  checkLinuxDependencies
}; 