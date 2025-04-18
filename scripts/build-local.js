#!/usr/bin/env node

/**
 * Script para construir o aplicativo localmente
 * 
 * Este script constrói o aplicativo para todas as plataformas
 * ou para uma plataforma específica.
 * 
 * Uso: node scripts/build-local.js [plataforma]
 * 
 * Plataformas válidas: win, mac, linux, all (padrão: plataforma atual)
 */

const { execSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

// Cores para console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function getPackageInfo() {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  return {
    version: packageJson.version,
    productName: packageJson.build.productName || packageJson.name
  };
}

function getCurrentPlatform() {
  const platform = os.platform();
  if (platform === 'win32') return 'win';
  if (platform === 'darwin') return 'mac';
  if (platform === 'linux') return 'linux';
  return platform;
}

function getPlatformFromArgs() {
  const platform = process.argv[2];
  const validPlatforms = ['win', 'mac', 'linux', 'all'];

  if (!platform) {
    const currentPlatform = getCurrentPlatform();
    log(`Nenhuma plataforma especificada. Usando a plataforma atual: ${currentPlatform}`, colors.yellow);
    return currentPlatform;
  }

  if (!validPlatforms.includes(platform)) {
    log(`Plataforma inválida: ${platform}. Use uma das seguintes: ${validPlatforms.join(', ')}`, colors.red);
    process.exit(1);
  }

  return platform;
}

function buildApp(platform) {
  try {
    log(`\n=== Construindo aplicativo para ${platform} ===\n`, colors.magenta);

    let command;
    switch (platform) {
      case 'win':
        command = 'pnpm run dist:win --publish never';
        break;
      case 'mac':
        command = 'pnpm run dist:mac --publish never';
        break;
      case 'linux':
        // Para Linux, usar o comando que cria apenas AppImage para evitar problemas com maintainer
        command = 'pnpm run dist:linux:appimage';
        break;
      case 'all':
        // Para build de todas as plataformas, não podemos garantir que funcionará pelo mantainer,
        // então avisamos o usuário
        log('\n⚠️ Aviso: Build para todas as plataformas pode falhar em sistemas Linux.', colors.yellow);
        log('Tentando construir para cada plataforma individualmente...', colors.yellow);

        // Tentando construir plataforma por plataforma
        try {
          log('\n=== Construindo para Windows ===', colors.blue);
          execSync('pnpm run dist:win --publish never', { stdio: 'inherit' });
        } catch (e) {
          log('Falha ao construir para Windows. Continuando com outras plataformas...', colors.red);
        }

        try {
          log('\n=== Construindo para macOS ===', colors.blue);
          execSync('pnpm run dist:mac --publish never', { stdio: 'inherit' });
        } catch (e) {
          log('Falha ao construir para macOS. Continuando com outras plataformas...', colors.red);
        }

        try {
          log('\n=== Construindo para Linux (AppImage) ===', colors.blue);
          execSync('pnpm run dist:linux:appimage', { stdio: 'inherit' });
          return true;
        } catch (e) {
          log('Falha ao construir para Linux.', colors.red);
          return false;
        }
        break;
      default:
        log(`Plataforma não suportada: ${platform}`, colors.red);
        process.exit(1);
    }

    log(`Executando: ${command}`, colors.blue);
    const output = execSync(command, { encoding: 'utf-8', stdio: 'inherit' });

    return true;
  } catch (error) {
    log(`\n❌ Erro ao construir aplicativo para ${platform}:`, colors.red);
    log(error.message, colors.red);
    return false;
  }
}

function listBuiltFiles() {
  try {
    const distDir = path.join(__dirname, '..', 'dist');
    if (!fs.existsSync(distDir)) {
      log('\nDiretório dist/ não encontrado. A build pode ter falhado.', colors.red);
      return [];
    }

    const files = fs.readdirSync(distDir)
      .filter(file => {
        // Filtrar apenas arquivos que são distribuíveis
        return /\.(exe|dmg|zip|AppImage|deb|rpm)$/.test(file);
      });

    return files.map(file => path.join(distDir, file));
  } catch (error) {
    log('\nErro ao listar arquivos construídos:', colors.red);
    log(error.message, colors.red);
    return [];
  }
}

function showUploadInstructions(files, version) {
  if (files.length === 0) {
    log('\nNenhum arquivo de distribuição encontrado.', colors.yellow);
    return;
  }

  log('\n✅ Build concluída com sucesso!', colors.green);
  log('\nArquivos gerados:', colors.blue);

  files.forEach(file => {
    const relativePath = path.relative(path.join(__dirname, '..'), file);
    log(` • ${relativePath}`, colors.reset);
  });

  log('\nPara fazer upload manual destes arquivos para a release:', colors.magenta);
  log('1. Acesse a página de releases do seu repositório GitHub:', colors.reset);
  log('   https://github.com/joseook/leetcode-ghost-joseok/releases', colors.cyan);
  log(`2. Encontre a release com a tag v${version}`, colors.reset);
  log('3. Clique em "Edit release"', colors.reset);
  log('4. Arraste os arquivos acima para a área de upload ou use o botão "Attach binaries"', colors.reset);
  log('5. Clique em "Update release" para salvar as alterações', colors.reset);
}

function main() {
  const platform = getPlatformFromArgs();
  const { version, productName } = getPackageInfo();

  log(`\n🛠️  Construindo ${productName} v${version} para ${platform === 'all' ? 'todas as plataformas' : platform}...\n`, colors.green);

  const success = buildApp(platform);

  if (success) {
    const files = listBuiltFiles();
    showUploadInstructions(files, version);
  } else {
    log('\n❌ Build falhou. Verifique os erros acima.', colors.red);
  }
}

// Execute o script
main(); 