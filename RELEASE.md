# Publicação de Releases do LeetCode Ghost Window

Este documento descreve o processo para publicar novas versões do LeetCode Ghost Window e como os artefatos são gerados automaticamente.

## Processo de Release Automatizado

O LeetCode Ghost Window usa GitHub Actions para automatizar a publicação de novas versões. Aqui está como funciona o processo:

### 1. Preparar uma nova versão

Usamos scripts para facilitar o processo de release. Escolha um dos comandos abaixo dependendo do tipo de mudança:

```bash
# Para atualização de patch (correção de bugs) - 1.4.0 -> 1.4.1
npm run release:patch

# Para atualização menor (novas funcionalidades) - 1.4.0 -> 1.5.0
npm run release:minor

# Para atualização maior (mudanças significativas) - 1.4.0 -> 2.0.0
npm run release:major
```

Estes comandos irão automaticamente:
- Verificar se não há alterações não commitadas
- Atualizar a versão no `package.json`
- Criar um commit com a mensagem de versão
- Criar uma tag git (por exemplo, `v1.4.1`)
- Fazer push para o repositório no GitHub

### 2. Monitorar o processo de build

Depois que a tag é enviada, o GitHub Actions inicia automaticamente o processo de build. Você pode verificar o status do build usando:

```bash
npm run release:check
```

Este comando mostra o status atual do workflow de build para a tag mais recente. Se o workflow ainda estiver em andamento, ele informará. Se já estiver concluído, ele mostrará o resultado e fornecerá um link para a release.

Você também pode verificar uma tag específica:

```bash
npm run release:check v1.4.1
```

### 3. Build automático

Durante o processo de build, o GitHub Actions executa:

1. Construção do software para cada plataforma:
   - Windows: Instalador `.exe` e versão portátil
   - macOS: Arquivos `.dmg` e `.zip`
   - Linux: Arquivos `.AppImage`, `.deb`, e `.rpm`

2. Publicação dos artefatos como uma nova release do GitHub

### 4. Verificação e Finalização

Após o GitHub Actions terminar (geralmente leva 5-10 minutos):

1. Acesse a página de Releases no GitHub ou execute `npm run release:check` para confirmar o status
2. Verifique se todos os artefatos foram gerados corretamente
3. Edite a release para adicionar notas detalhadas sobre as mudanças
4. Publique a release

## Solução de Problemas

### Se o workflow não for acionado automaticamente

Se o workflow não for acionado automaticamente após criar uma tag, você pode acioná-lo manualmente:

1. **Usando o script de trigger**:
   ```bash
   # Você precisará criar um token pessoal do GitHub com permissões "repo" e "workflow"
   npm run release:trigger v1.4.2 seu_token_pessoal
   ```

2. **Através da interface do GitHub**:
   - Acesse seu repositório no GitHub
   - Vá para a aba "Actions"
   - Selecione o workflow "Build and Release"
   - Clique em "Run workflow"
   - Escolha a branch "main" e informe a tag desejada

### Se os artefatos não aparecerem na release

1. Verifique se o workflow do GitHub Actions foi concluído com sucesso usando `npm run release:check`
2. Acesse a página do GitHub Actions no seu repositório para ver detalhes dos logs de build
3. Certifique-se de que o token GITHUB_TOKEN tem permissões suficientes para criar releases e fazer upload de artefatos
4. Verifique nas configurações do seu repositório se o GitHub Actions tem permissões de escrita:
   - Vá para "Settings" > "Actions" > "General" 
   - Em "Workflow permissions", certifique-se de que "Read and write permissions" está selecionado

### Build Manual Local

Se o GitHub Actions continuar falhando, você pode construir e fazer upload dos artefatos manualmente:

```bash
# Para construir localmente para todas as plataformas
npm run dist:all

# Para construir apenas para sua plataforma atual
npm run dist:win    # Windows
npm run dist:mac    # macOS
npm run dist:linux  # Linux
```

Depois, faça upload dos arquivos gerados na pasta `dist/` para a release no GitHub.

### Erros comuns:

- **404 Not Found**: O workflow não existe ou não está acessível
- **403 Forbidden**: O token não tem permissões suficientes
- **Falha no upload**: Verifique se a configuração da publicação do electron-builder está correta

## Build Manual (Opcional)

Se você precisar gerar builds localmente sem publicar uma release, pode usar os seguintes comandos:

```bash
# Para todas as plataformas (Windows, macOS, Linux)
npm run dist:all

# Apenas para Windows
npm run dist:win

# Apenas para macOS
npm run dist:mac

# Apenas para Linux
npm run dist:linux
```

Os arquivos compilados serão criados no diretório `dist/`.

## Estrutura do Release

Cada release contém:

- **Para Windows**:
  - Um instalador `.exe` que permite instalar o aplicativo com opções de configuração
  - Uma versão portátil `.exe` que pode ser executada sem instalação

- **Para macOS**:
  - Um arquivo `.dmg` para instalação drag-and-drop
  - Um arquivo `.zip` contendo o aplicativo

- **Para Linux**:
  - Um arquivo `.AppImage` que funciona na maioria das distribuições
  - Pacotes `.deb` para sistemas baseados em Debian/Ubuntu
  - Pacotes `.rpm` para sistemas baseados em RHEL/Fedora

## Versão CLI

O LeetCode Ghost Window também inclui uma versão de linha de comando, que é construída automaticamente durante o processo de release. Os usuários podem instalar o CLI via npm:

```bash
npm install -g leetcode-joseok
``` 