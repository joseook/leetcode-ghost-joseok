#!/usr/bin/env node

/**
 * Script para acionar manualmente o workflow de build
 *
 * Este script usa a API do GitHub para acionar manualmente o workflow de build
 * para uma tag específica, útil quando o trigger automático falha.
 *
 * Uso: node scripts/trigger-build.js [tag] [token]
 *
 * Exemplo: node scripts/trigger-build.js v1.4.2 ghp_seu_token_pessoal
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
      log('Uso: node scripts/trigger-build.js [tag] [token]', colors.cyan);
      log('Exemplo: node scripts/trigger-build.js v1.4.2 ghp_seu_token_pessoal', colors.cyan);
      process.exit(1);
    }
  }

  return tag;
}

function getToken() {
  const token = process.argv[3];

  if (!token) {
    log('É necessário um token pessoal do GitHub com permissões de workflow.', colors.red);
    log('Uso: node scripts/trigger-build.js [tag] [token]', colors.cyan);
    log('Exemplo: node scripts/trigger-build.js v1.4.2 ghp_seu_token_pessoal', colors.cyan);
    log('\nPara criar um token:', colors.yellow);
    log('1. Acesse https://github.com/settings/tokens', colors.blue);
    log('2. Clique em "Generate new token"', colors.blue);
    log('3. Selecione as permissões: repo, workflow', colors.blue);
    log('4. Copie o token e use-o como segundo argumento deste script', colors.blue);
    process.exit(1);
  }

  return token;
}

function triggerWorkflow(owner, repo, tag, token) {
  return new Promise((resolve, reject) => {
    const workflowId = 'build.yml';
    const endpoint = `/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`;

    const data = JSON.stringify({
      ref: 'main',
      inputs: {
        tag: tag
      }
    });

    const options = {
      hostname: 'api.github.com',
      path: endpoint,
      method: 'POST',
      headers: {
        'User-Agent': 'Node.js',
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    log(`Endpoint: ${endpoint}`, colors.blue);
    log(`Payload: ${data}`, colors.blue);

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 204) {
          resolve({ success: true });
        } else {
          reject(new Error(`Status code: ${res.statusCode}, message: ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function main() {
  try {
    const { owner, repo } = getRepoInfo();
    const tag = getTagFromArgs();
    const token = getToken();

    log(`\n=== Acionando workflow de build para a tag ${tag} ===\n`, colors.magenta);
    log(`Repositório: ${owner}/${repo}`, colors.blue);

    log('\nEnviando solicitação para acionar o workflow...', colors.yellow);

    await triggerWorkflow(owner, repo, tag, token);

    log('\n✅ Workflow acionado com sucesso!', colors.green);
    log('\nVocê pode verificar o status do build executando:', colors.magenta);
    log(`node scripts/check-release.js ${tag}`, colors.cyan);
    log('\nOu acessando a página do GitHub Actions:', colors.magenta);
    log(`https://github.com/${owner}/${repo}/actions`, colors.blue);

  } catch (error) {
    log(`\n❌ Erro ao acionar o workflow: ${error.message}`, colors.red);

    if (error.message.includes('404')) {
      log('\nErro 404: O workflow não foi encontrado.', colors.yellow);
      log('Verifique se o arquivo .github/workflows/build.yml existe no repositório.', colors.yellow);
    } else if (error.message.includes('403')) {
      log('\nErro 403: Permissão negada.', colors.yellow);
      log('Verifique se o token tem as permissões necessárias (repo, workflow).', colors.yellow);
    }
  }
}

// Execute o script
main(); 