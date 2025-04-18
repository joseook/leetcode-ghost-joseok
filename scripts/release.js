#!/usr/bin/env node

/**
 * Script de Release Automático
 * 
 * Este script ajuda a criar releases automáticas:
 * 1. Atualiza a versão no package.json
 * 2. Cria um commit com a mensagem de release
 * 3. Cria uma tag com a versão
 * 4. Faz push para o repositório remoto
 * 
 * Uso: node scripts/release.js [major|minor|patch] [--no-push]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

// Utilidades
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function exec(command) {
  try {
    return execSync(command, { encoding: 'utf-8' }).trim();
  } catch (error) {
    log(`Erro ao executar comando: ${command}`, colors.red);
    log(error.message, colors.red);
    process.exit(1);
  }
}

// Verificar se temos mudanças não commitadas
function checkCleanWorkingDirectory() {
  const status = exec('git status --porcelain');
  if (status) {
    log('Há mudanças não commitadas no repositório. Commit ou stash antes de fazer release.', colors.red);
    log(status, colors.yellow);
    process.exit(1);
  }
}

// Determinar o tipo de incremento de versão
function getVersionIncrement() {
  const arg = process.argv[2];
  const validIncrements = ['major', 'minor', 'patch'];

  if (!arg || !validIncrements.includes(arg)) {
    log(`Uso: node scripts/release.js [${validIncrements.join('|')}] [--no-push]`, colors.cyan);
    process.exit(1);
  }

  return arg;
}

// Atualizar versão no package.json
function updateVersion(versionIncrement) {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');

  // Ler package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const currentVersion = packageJson.version;

  log(`Versão atual: ${currentVersion}`, colors.cyan);

  // Incrementar versão
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  let newVersion;

  switch (versionIncrement) {
    case 'major':
      newVersion = `${major + 1}.0.0`;
      break;
    case 'minor':
      newVersion = `${major}.${minor + 1}.0`;
      break;
    case 'patch':
      newVersion = `${major}.${minor}.${patch + 1}`;
      break;
  }

  packageJson.version = newVersion;

  // Escrever de volta no package.json
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

  log(`Versão atualizada para: ${newVersion}`, colors.green);

  return { currentVersion, newVersion };
}

// Criar commit e tag
function createCommitAndTag(newVersion) {
  const releaseMessage = `Release v${newVersion}`;

  exec(`git add package.json`);
  exec(`git commit -m "${releaseMessage}"`);
  exec(`git tag -a v${newVersion} -m "${releaseMessage}"`);

  log(`Commit e tag criados para v${newVersion}`, colors.green);
}

// Push para o repositório remoto
function pushChanges(shouldPush = true) {
  if (!shouldPush) {
    log('Push ignorado. Use os seguintes comandos para fazer push manualmente:', colors.yellow);
    log('  git push origin main', colors.cyan);
    log('  git push origin --tags', colors.cyan);
    return;
  }

  log('Fazendo push para o repositório remoto...', colors.blue);
  exec('git push origin main');
  exec('git push origin --tags');

  log('Push concluído com sucesso!', colors.green);
}

// Função principal
function main() {
  // Verificar argumentos
  const versionIncrement = getVersionIncrement();
  const shouldPush = !process.argv.includes('--no-push');

  log('=== Iniciando processo de release ===', colors.magenta);

  // Verificar estado do repositório
  checkCleanWorkingDirectory();

  // Atualizar versão
  const { newVersion } = updateVersion(versionIncrement);

  // Criar commit e tag
  createCommitAndTag(newVersion);

  // Push (se solicitado)
  pushChanges(shouldPush);

  log(`\n=== Release v${newVersion} preparada com sucesso! ===`, colors.magenta);
  log(`GitHub Actions construirá automaticamente os executáveis e publicará a release.`, colors.green);
}

// Executar
main(); 