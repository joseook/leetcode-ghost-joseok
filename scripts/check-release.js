#!/usr/bin/env node

/**
 * Script para verificar o status de um workflow do GitHub Actions
 * 
 * Este script consulta a API do GitHub para verificar o status de um workflow 
 * de build/release para uma tag específica.
 * 
 * Uso: node scripts/check-release.js [tag]
 * 
 * Exemplo: node scripts/check-release.js v1.4.1
 */

const https = require('https');
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

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function getRepoInfo() {
  try {
    const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf-8' }).trim();

    // Padrões para URLs do GitHub
    // HTTPS: https://github.com/username/repo.git
    // SSH: git@github.com:username/repo.git
    let match;
    if (remoteUrl.startsWith('https://')) {
      match = remoteUrl.match(/https:\/\/github\.com\/([^\/]+)\/([^\.]+)(?:\.git)?/);
    } else if (remoteUrl.startsWith('git@')) {
      match = remoteUrl.match(/git@github\.com:([^\/]+)\/([^\.]+)(?:\.git)?/);
    }

    if (match && match.length >= 3) {
      return {
        owner: match[1],
        repo: match[2],
      };
    }

    log('Não foi possível determinar o proprietário e repositório a partir da URL remota.', colors.red);
    process.exit(1);
  } catch (error) {
    log('Erro ao obter informações do repositório Git:', colors.red);
    log(error.message, colors.red);
    process.exit(1);
  }
}

function getTagFromArgs() {
  const tag = process.argv[2];

  if (!tag) {
    // Se nenhuma tag for fornecida, tente usar a última tag
    try {
      const latestTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf-8' }).trim();
      log(`Nenhuma tag especificada. Usando a tag mais recente: ${latestTag}`, colors.yellow);
      return latestTag;
    } catch (error) {
      log('Erro ao obter a tag mais recente:', colors.red);
      log(error.message, colors.red);
      log('Uso: node scripts/check-release.js [tag]', colors.cyan);
      log('Exemplo: node scripts/check-release.js v1.4.1', colors.cyan);
      process.exit(1);
    }
  }

  return tag;
}

function fetchWorkflowRuns(owner, repo, tag, callback) {
  const options = {
    hostname: 'api.github.com',
    path: `/repos/${owner}/${repo}/actions/runs?event=push&branch=${encodeURIComponent(tag)}`,
    method: 'GET',
    headers: {
      'User-Agent': 'Node.js',
      'Accept': 'application/vnd.github.v3+json'
    }
  };

  const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      if (res.statusCode === 200) {
        const response = JSON.parse(data);
        callback(null, response);
      } else {
        callback(new Error(`Status code: ${res.statusCode}, message: ${data}`), null);
      }
    });
  });

  req.on('error', (error) => {
    callback(error, null);
  });

  req.end();
}

function checkWorkflowStatus() {
  const { owner, repo } = getRepoInfo();
  const tag = getTagFromArgs();

  log(`\n=== Verificando status do workflow para a tag ${tag} ===\n`, colors.magenta);
  log(`Repositório: ${owner}/${repo}`, colors.blue);

  fetchWorkflowRuns(owner, repo, tag, (error, data) => {
    if (error) {
      log(`Erro ao obter dados do workflow: ${error.message}`, colors.red);
      return;
    }

    if (!data.workflow_runs || data.workflow_runs.length === 0) {
      log(`Nenhum workflow encontrado para a tag ${tag}.`, colors.yellow);
      log('Verifique se o workflow foi disparado corretamente.', colors.yellow);
      log(`URL de verificação manual: https://github.com/${owner}/${repo}/actions`, colors.blue);
      return;
    }

    const latestWorkflow = data.workflow_runs[0];

    log(`\nWorkflow: ${latestWorkflow.name} (#${latestWorkflow.run_number})`, colors.cyan);
    log(`Status: ${getStatusWithColor(latestWorkflow.status, latestWorkflow.conclusion)}`, colors.reset);
    log(`Criado em: ${new Date(latestWorkflow.created_at).toLocaleString()}`, colors.reset);

    if (latestWorkflow.status === 'completed') {
      log(`Concluído em: ${new Date(latestWorkflow.updated_at).toLocaleString()}`, colors.reset);

      if (latestWorkflow.conclusion === 'success') {
        log('\n✅ O workflow foi concluído com sucesso!', colors.green);
        log(`\nOs artefatos da release devem estar disponíveis em:`, colors.green);
        log(`https://github.com/${owner}/${repo}/releases/tag/${tag}`, colors.blue);
      } else {
        log('\n❌ O workflow falhou ou foi cancelado.', colors.red);
        log(`Verifique os detalhes no GitHub Actions:`, colors.yellow);
        log(latestWorkflow.html_url, colors.blue);
      }
    } else if (latestWorkflow.status === 'in_progress') {
      log('\n⏳ O workflow ainda está em andamento...', colors.yellow);
      log(`Você pode acompanhar o progresso em:`, colors.yellow);
      log(latestWorkflow.html_url, colors.blue);
    } else {
      log('\n⏱️ O workflow está aguardando para iniciar...', colors.yellow);
    }

    log('\nPara verificar novamente mais tarde, execute:', colors.magenta);
    log(`node scripts/check-release.js ${tag}`, colors.cyan);
  });
}

function getStatusWithColor(status, conclusion) {
  if (status === 'completed') {
    if (conclusion === 'success') {
      return `${colors.green}${status} (${conclusion})${colors.reset}`;
    } else {
      return `${colors.red}${status} (${conclusion})${colors.reset}`;
    }
  } else if (status === 'in_progress') {
    return `${colors.yellow}${status}${colors.reset}`;
  } else {
    return `${colors.blue}${status}${colors.reset}`;
  }
}

// Execute o script
checkWorkflowStatus(); 