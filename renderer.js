let isDragging = false;
let dragStartPos = { x: 0, y: 0 };

window.addEventListener('DOMContentLoaded', async () => {
    // Usar a API correta conforme definida no preload
    const platform = window.electron?.platform || 'unknown';
    const isWindows = window.electron?.isWindows || false;
    const isLinux = window.electron?.isLinux || false;
    const isMac = window.electron?.isMac || false;
    const isWSL = window.electron?.isWSL || false;
    const appVersion = window.electron?.appVersion || '1.0.0';

    // Atualizar informações do sistema na barra de status
    updateSystemInfo(platform, isWindows, isLinux, isMac, isWSL, appVersion);

    // Mostra informações da plataforma nos logs
    document.getElementById("log-content").innerHTML += '<br> [SYSTEM] sistema iniciado';
    document.getElementById("log-content").innerHTML += `<br> [SYSTEM] plataforma detectada: ${platform}`;
    document.getElementById("log-content").innerHTML += `<br> [SYSTEM] versão: ${appVersion}`;
    document.getElementById("log-content").innerHTML += '<br> [APP] aguardando screenshot';
    document.getElementById("log-content").innerHTML += '<br> [HELPER] você pode apertar ctrl+shift+1 para tirar o primeiro screenshot';

    // Mostrar mensagem inicial explicativa
    document.getElementById("response-text").innerHTML = `
        <div class="solution-tips">
            <h3>Bem-vindo ao LeetCode Ghost!</h3>
            <p>Este aplicativo ajuda você a resolver problemas de LeetCode.</p>
            <ol>
                <li>Insira sua chave da API OpenAI acima</li>
                <li>Capture a tela com o problema do LeetCode usando Ctrl+Shift+1</li>
                <li>Processe a imagem e obtenha a solução com Ctrl+Shift+A</li>
            </ol>
            <p>Para problemas complexos, você pode capturar até 3 telas e processá-las juntas.</p>
        </div>
    `;

    // Adiciona um indicador visual para modo ghost ativo
    updateGhostStatusIndicator(true);

    // Configurar o drag da janela (para janela sem bordas)
    setupWindowDrag();

    // Configurar os botões da janela
    setupWindowControls();
});

// Função para atualizar informações do sistema na barra de status
function updateSystemInfo(platform, isWindows, isLinux, isMac, isWSL, appVersion) {
    const nodeVersionElement = document.getElementById('node-version');
    if (nodeVersionElement) {
        let platformDisplay = '';

        if (isWindows) platformDisplay = 'Windows';
        else if (isMac) platformDisplay = 'macOS';
        else if (isWSL) platformDisplay = 'WSL';
        else if (isLinux) platformDisplay = 'Linux';
        else platformDisplay = platform;

        nodeVersionElement.textContent = platformDisplay;
    }

    // Atualizar a versão do aplicativo na barra de status
    const versionElement = document.querySelector('.status-bar .status-item:first-child .status-value');
    if (versionElement) {
        versionElement.textContent = `Ghost v${appVersion}`;
    }
}

function setupWindowDrag() {
    // Elementos onde iniciaremos o drag (header e áreas vazias)
    const dragElements = document.querySelectorAll('.titlebar, .app-header');

    dragElements.forEach(element => {
        element.addEventListener('mousedown', (e) => {
            // Não iniciar drag em botões ou outros controles
            if (e.target.closest('.window-controls') || e.target.closest('.ghost-status')) {
                return;
            }

            isDragging = true;
            dragStartPos = { x: e.clientX, y: e.clientY };
            document.body.classList.add('dragging');
        });
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        // Para movimento de janela, enviamos para o main process
        // Electron possui uma API específica para isso que será implementada no main.js
        window.electron?.sendMovement?.(e.screenX - dragStartPos.x, e.screenY - dragStartPos.y);
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        document.body.classList.remove('dragging');
    });

    // Suporte ao atalho para toggle do modo drag
    // Ajustar para usar a API correta conforme definida no preload
    window.electron?.onToggleWindowDrag?.((_event) => {
        isDragging = !isDragging;
        if (isDragging) {
            document.body.classList.add('dragging');
        } else {
            document.body.classList.remove('dragging');
        }
    });
}

function setupWindowControls() {
    const minimizeBtn = document.getElementById('minimize-btn');
    const closeBtn = document.getElementById('close-btn');

    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', () => {
            window.electron?.minimizeWindow?.();
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            window.electron?.closeWindow?.();
        });
    }
}

// Verificar se o modo ghost está realmente funcionando
// Ajustar para usar a API correta conforme definida no preload
window.electron?.onCheckGhostMode?.(async (_event) => {
    try {
        const ghostStatus = await window.electron?.testGhostMode?.() || {
            platform: window.electron?.platform || 'unknown',
            isWindows: window.electron?.isWindows || false,
            isLinux: window.electron?.isLinux || false,
            isMac: window.electron?.isMac || false
        };

        document.getElementById("log-content").innerHTML += `<br> [SYSTEM] modo ghost ativo: plataforma ${ghostStatus.platform}`;

        // Atualizar informações do sistema na barra de status
        updateSystemInfo(
            ghostStatus.platform,
            ghostStatus.isWindows,
            ghostStatus.isLinux,
            ghostStatus.isMac,
            window.electron?.isWSL || false,
            window.electron?.appVersion || '1.0.0'
        );

        // Verificar vulnerabilidades específicas da plataforma
        if (ghostStatus.isWindows) {
            document.getElementById("log-content").innerHTML += '<br> [GHOST] modo ghost do Windows ativado';
        } else if (ghostStatus.isLinux) {
            document.getElementById("log-content").innerHTML += '<br> [GHOST] modo ghost do Linux ativado';
        } else if (ghostStatus.isMac) {
            document.getElementById("log-content").innerHTML += '<br> [GHOST] modo ghost do macOS ativado';
        }
    } catch (error) {
        console.error("Erro ao verificar modo ghost:", error);
    }
});

// Ajustar os handlers para usar a API correta
window.electron?.onTriggerScreenshot?.(async (_event) => {
    try {
        document.getElementById("log-content").innerHTML += '<br> [APP] iniciando captura de tela para screenshot 1...';
        startAreaSelection(1);
    } catch (error) {
        console.error("Erro ao capturar screenshot 1:", error);
        document.getElementById("log-content").innerHTML += '<br> [ERROR] Falha ao capturar screenshot 1';
    }
});

window.electron?.onTriggerScreenshot2?.(async (_event) => {
    try {
        document.getElementById("log-content").innerHTML += '<br> [APP] iniciando captura de tela para screenshot 2...';
        startAreaSelection(2);
    } catch (error) {
        console.error("Erro ao capturar screenshot 2:", error);
        document.getElementById("log-content").innerHTML += '<br> [ERROR] Falha ao capturar screenshot 2';
    }
});

window.electron?.onTriggerScreenshot3?.(async (_event) => {
    try {
        document.getElementById("log-content").innerHTML += '<br> [APP] iniciando captura de tela para screenshot 3...';
        startAreaSelection(3);
    } catch (error) {
        console.error("Erro ao capturar screenshot 3:", error);
        document.getElementById("log-content").innerHTML += '<br> [ERROR] Falha ao capturar screenshot 3';
    }
});

window.electron?.onTriggerAi1?.(async (_event) => {
    const openai_api_key = document.getElementById("apikey").value;

    if (!openai_api_key) {
        showError("Por favor, insira sua chave da API OpenAI");
        return;
    }

    showLoading(true);
    document.getElementById("log-content").innerHTML += '<br> [APP] processando com 1 imagem...';

    try {
        const answers = await window.electron?.findAnswerUsingScreenshot?.({ quantityScreenshotToUse: 1, openai_api_key });
        renderAnswer({ answers });
    } catch (error) {
        showError("Erro ao processar imagem: " + (error.message || "Erro desconhecido"));
    } finally {
        showLoading(false);
    }
});

window.electron?.onTriggerAi2?.(async (_event) => {
    const openai_api_key = document.getElementById("apikey").value;

    if (!openai_api_key) {
        showError("Por favor, insira sua chave da API OpenAI");
        return;
    }

    showLoading(true);
    document.getElementById("log-content").innerHTML += '<br> [APP] processando com 2 imagens...';

    try {
        const answers = await window.electron?.findAnswerUsingScreenshot?.({ quantityScreenshotToUse: 2, openai_api_key });
        renderAnswer({ answers });
    } catch (error) {
        showError("Erro ao processar imagens: " + (error.message || "Erro desconhecido"));
    } finally {
        showLoading(false);
    }
});

window.electron?.onTriggerAi3?.(async (_event) => {
    const openai_api_key = document.getElementById("apikey").value;

    if (!openai_api_key) {
        showError("Por favor, insira sua chave da API OpenAI");
        return;
    }

    showLoading(true);
    document.getElementById("log-content").innerHTML += '<br> [APP] processando com 3 imagens...';

    try {
        const answers = await window.electron?.findAnswerUsingScreenshot?.({ quantityScreenshotToUse: 3, openai_api_key });
        renderAnswer({ answers });
    } catch (error) {
        showError("Erro ao processar imagens: " + (error.message || "Erro desconhecido"));
    } finally {
        showLoading(false);
    }
});

function renderAnswer({ answers }) {
    if (!Array.isArray(answers) && !answers.hasOwnProperty("output")) {
        if (answers.error) {
            document.getElementById("response-text").innerHTML = `<div class="error">${answers.error.message}</div>`;
        } else {
            document.getElementById("response-text").innerHTML = `<div class="error">Ocorreu um erro desconhecido</div>`;
        }
        return;
    }

    try {
        let responseHtml = '<div class="leetcode-solution">';

        // Construir a resposta formatada
        if (Array.isArray(answers)) {
            // Unificar o conteúdo de todas as respostas
            let fullText = '';
            for (const answer of answers) {
                if (answer.content && answer.content[0] && answer.content[0].text) {
                    fullText += answer.content[0].text;
                }
            }

            // Analisar se há padrões de seções na resposta
            const hasSections = fullText.includes('## ') ||
                fullText.includes('# ') ||
                fullText.includes('**Abordagem**') ||
                fullText.includes('**Solução**') ||
                fullText.includes('**Explicação**');

            if (hasSections) {
                // Para respostas com formatação Markdown
                const processedText = processMarkdown(fullText);
                responseHtml += processedText;
            } else {
                // Tratar como código simples com possíveis comentários
                const codeMatch = fullText.match(/```(?:javascript|js|python|java|cpp|c\+\+)?([\s\S]*?)```/);

                if (codeMatch && codeMatch[1]) {
                    // Extrair e formatar o código
                    let codeContent = codeMatch[1].trim();

                    // Detectar a linguagem
                    let language = 'javascript'; // padrão
                    if (fullText.includes('```python')) language = 'python';
                    else if (fullText.includes('```java')) language = 'java';
                    else if (fullText.includes('```cpp') || fullText.includes('```c++')) language = 'cpp';

                    // Aplicar highlight ao código
                    const highlightedCode = hljs.highlight(codeContent, { language }).value;

                    // Buscar explicação antes ou depois do código
                    const parts = fullText.split(/```(?:javascript|js|python|java|cpp|c\+\+)?[\s\S]*?```/);
                    let explanation = '';

                    if (parts.length > 0) {
                        // Procurar pela explicação mais substancial
                        for (const part of parts) {
                            if (part.trim().length > explanation.length) {
                                explanation = part.trim();
                            }
                        }
                    }

                    // Adicionar explicação se existir
                    if (explanation) {
                        responseHtml += `<div class="solution-explanation">${formatExplanation(explanation)}</div>`;
                    }

                    // Adicionar o código formatado
                    responseHtml += `<h3>Solução (${getLanguageName(language)})</h3>`;
                    responseHtml += `<pre><code class="hljs ${language}">${highlightedCode}</code></pre>`;
                } else {
                    // Caso não encontre código formatado, mostrar o texto completo com análise de complexidade destacada
                    responseHtml += `<div class="solution-text">${formatSolutionText(fullText)}</div>`;
                }
            }
        } else if (answers.output) {
            // Caso a resposta venha diretamente como output (texto livre)
            responseHtml += `<div class="solution-text">${formatSolutionText(answers.output)}</div>`;
        }

        responseHtml += '</div>';

        // Adicionar o HTML formatado à página
        document.getElementById("response-text").innerHTML = responseHtml;

        // Adicionar informação no log
        document.getElementById("log-content").innerHTML += '<br> [APP] resposta gerada com sucesso!';
    } catch (error) {
        console.error("Erro ao renderizar resposta:", error);
        document.getElementById("response-text").innerHTML =
            `<div class="error">Erro ao processar resposta: ${error.message}</div>`;
    }
}

// Formatar texto simples com destaque para partes importantes
function formatSolutionText(text) {
    // Destacar análise de complexidade
    text = text.replace(/[oO]\(([^)]+)\)/g, '<span class="complexity">O($1)</span>');
    text = text.replace(/(complexidade de tempo|time complexity|complexidade temporal)([^.]*)O\(([^)]+)\)/gi,
        '$1$2<span class="complexity">O($3)</span>');
    text = text.replace(/(complexidade de espaço|space complexity|complexidade espacial)([^.]*)O\(([^)]+)\)/gi,
        '$1$2<span class="complexity">O($3)</span>');

    // Destacar quebras de linha
    text = text.replace(/\n\n/g, '<br><br>');
    text = text.replace(/\n/g, '<br>');

    return text;
}

// Processar markdown para HTML
function processMarkdown(text) {
    let html = '';

    // Dividir por linhas para processar cabeçalhos e listas
    const lines = text.split('\n');
    let inCodeBlock = false;
    let codeContent = '';
    let language = 'javascript';

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // Verificar início/fim de bloco de código
        if (line.trim().startsWith('```')) {
            if (!inCodeBlock) {
                // Início do bloco de código
                inCodeBlock = true;
                const langMatch = line.trim().match(/```(\w+)/);
                if (langMatch && langMatch[1]) {
                    language = langMatch[1];
                }
                codeContent = '';
                continue;
            } else {
                // Fim do bloco de código
                inCodeBlock = false;
                const highlightedCode = hljs.highlight(codeContent, { language }).value;
                html += `<pre><code class="hljs ${language}">${highlightedCode}</code></pre>`;
                continue;
            }
        }

        // Adicionar linhas ao bloco de código
        if (inCodeBlock) {
            codeContent += line + '\n';
            continue;
        }

        // Processar cabeçalhos
        if (line.startsWith('# ')) {
            html += `<h1>${line.substring(2)}</h1>`;
        } else if (line.startsWith('## ')) {
            html += `<h2>${line.substring(3)}</h2>`;
        } else if (line.startsWith('### ')) {
            html += `<h3>${line.substring(4)}</h3>`;
        } else if (line.startsWith('- ')) {
            // Listas não ordenadas
            html += `<ul><li>${line.substring(2)}</li></ul>`;
        } else if (/^\d+\.\s/.test(line)) {
            // Listas ordenadas
            const content = line.replace(/^\d+\.\s/, '');
            html += `<ol><li>${content}</li></ol>`;
        } else if (line.trim() === '') {
            // Linhas em branco
            html += '<br>';
        } else {
            // Processar ênfases dentro do texto
            line = line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
            line = line.replace(/\*([^*]+)\*/g, '<em>$1</em>');
            line = line.replace(/`([^`]+)`/g, '<code>$1</code>');

            html += `<p>${line}</p>`;
        }
    }

    return html;
}

// Formatar explicação textual
function formatExplanation(text) {
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    text = text.replace(/\n\n/g, '<br><br>');
    text = text.replace(/\n/g, '<br>');

    return text;
}

// Obter nome da linguagem para exibição
function getLanguageName(langCode) {
    const languages = {
        'javascript': 'JavaScript',
        'js': 'JavaScript',
        'python': 'Python',
        'java': 'Java',
        'cpp': 'C++',
        'c++': 'C++',
        'c': 'C',
        'csharp': 'C#',
        'cs': 'C#',
        'ruby': 'Ruby',
        'go': 'Go',
        'swift': 'Swift',
        'php': 'PHP'
    };

    return languages[langCode] || langCode;
}

function updateGhostStatusIndicator(isActive) {
    const ghostIndicator = document.getElementById("ghost-indicator");
    if (ghostIndicator) {
        ghostIndicator.className = isActive ? "active" : "inactive";
        ghostIndicator.title = isActive ? "Modo Ghost Ativo" : "Modo Ghost Inativo";
    }
}

function updateScreenshotStatus(number, isActive) {
    const statusElement = document.getElementById(`screenshot-${number}-status`);
    if (statusElement) {
        statusElement.className = isActive ? "status-ok" : "status-missing";
        statusElement.title = isActive ? `Screenshot ${number} capturado` : `Screenshot ${number} pendente`;
    }
}

function showLoading(isLoading) {
    const responseElement = document.getElementById("response-text");
    if (isLoading) {
        // Mostrar animação de carregamento com dica
        responseElement.innerHTML = `
            <div class="loading">
                <div class="loading-animation">
                    <div class="thinking">Analisando código...</div>
                </div>
                <div class="loading-message">
                    <p>Processando as capturas de tela com IA...</p>
                    <p class="loading-tip">Enquanto espera, você pode tirar screenshots adicionais com Ctrl+Shift+2 ou Ctrl+Shift+3</p>
                </div>
            </div>
        `;
    }
}

function showError(message) {
    document.getElementById("response-text").innerHTML = `<div class="error">${message}</div>`;
    document.getElementById("log-content").innerHTML += `<br> [ERROR] ${message}`;
}

function dataAtualFormatada() {
    var data = new Date(),
        dia = data.getDate().toString(),
        diaF = (dia.length == 1) ? '0' + dia : dia,
        mes = (data.getMonth() + 1).toString(), //+1 pois no getMonth Janeiro começa com zero.
        mesF = (mes.length == 1) ? '0' + mes : mes,
        anoF = data.getFullYear();
    return diaF + "/" + mesF + "/" + anoF;
}

function novaHora() {
    function pad(s) {
        return (s < 10) ? '0' + s : s;
    }
    var date = new Date();
    return [date.getHours(), date.getMinutes(), date.getSeconds()].map(pad).join(':');
}

// Sistema de seleção de área para captura de tela
let selectionActive = false;
let currentScreenshotNumber = 0;
let startPoint = { x: 0, y: 0 };
let selectionOverlay = null;
let selectionArea = { x: 0, y: 0, width: 0, height: 0 };

function startAreaSelection(screenshotNumber) {
    currentScreenshotNumber = screenshotNumber;

    // Atualizar o status para indicar que está capturando
    document.getElementById("log-content").innerHTML +=
        '<br> [APP] capturando tela, por favor aguarde...';

    // Minimiza a janela atual para permitir a captura da tela 
    window.electron?.minimizeWindow?.();

    // Aguarda um tempo para a janela minimizar antes de iniciar a captura
    setTimeout(() => {
        window.electron?.startAreaSelection?.(screenshotNumber)
            .then(result => {
                if (result && result.path) {
                    document.getElementById("log-content").innerHTML +=
                        '<br> [APP] screenshot ' + screenshotNumber + ' capturado com sucesso às ' + novaHora();
                    updateScreenshotStatus(screenshotNumber, true);
                    displayScreenshotPreview(screenshotNumber, result.path);

                    // Mostrar dica sobre como usar o LeetCode Ghost
                    if (screenshotNumber === 1) {
                        document.getElementById("response-text").innerHTML =
                            `<div>Captura 1 realizada. Você pode:</div>
                             <ul>
                                <li>Usar <b>Ctrl+Shift+A</b> para processar esta imagem</li>
                                <li>Capturar mais telas com <b>Ctrl+Shift+2</b> ou <b>Ctrl+Shift+3</b></li>
                             </ul>`;
                    } else {
                        const count = document.querySelectorAll('.screenshot-preview.visible').length;
                        document.getElementById("response-text").innerHTML =
                            `<div>${count} capturas realizadas. Use as teclas <b>Ctrl+Shift+A/B/C</b> para processar ${count === 1 ? 'esta imagem' : 'as imagens'}.</div>`;
                    }
                }
            })
            .catch(error => {
                console.error(`Erro ao capturar screenshot ${screenshotNumber}:`, error);
                document.getElementById("log-content").innerHTML +=
                    `<br> [ERROR] Falha ao capturar screenshot ${screenshotNumber}: ${error.message || "Erro desconhecido"}`;
            });
    }, 500);
}

function displayScreenshotPreview(screenshotNumber, imagePath) {
    // Garantir que o caminho da imagem tem um timestamp para evitar cache
    const timestamp = new Date().getTime();
    const imagePathWithTimestamp = `${imagePath}?t=${timestamp}`;

    // Verificar se o container de previews existe
    let previewContainer = document.getElementById('screenshot-previews');
    if (!previewContainer) {
        // Se não existir, criar o container
        previewContainer = document.createElement('div');
        previewContainer.id = 'screenshot-previews';
        previewContainer.className = 'screenshot-previews';
        document.querySelector('.main-content').appendChild(previewContainer);
    }

    // Verificar se já existe um preview para este número
    const previewElement = document.getElementById(`screenshot-${screenshotNumber}-preview`);

    if (!previewElement) {
        // Se o elemento de preview não existe, cria um novo
        const newPreview = document.createElement('div');
        newPreview.id = `screenshot-${screenshotNumber}-preview`;
        newPreview.className = 'screenshot-preview';

        newPreview.innerHTML = `
            <div class="preview-number">${screenshotNumber}</div>
            <div class="preview-image-container">
                <img src="${imagePathWithTimestamp}" alt="Screenshot ${screenshotNumber}" class="preview-image" />
            </div>
            <button class="preview-remove-btn" onclick="removeScreenshot(${screenshotNumber})">
                <svg width="8" height="8" viewBox="0 0 8 8">
                    <path d="M1 1l6 6m0-6l-6 6" stroke="currentColor" stroke-width="1.5" />
                </svg>
            </button>
        `;

        previewContainer.appendChild(newPreview);

        // Adicionar animação de fade-in
        setTimeout(() => {
            newPreview.classList.add('visible');
        }, 10);

        // Mostrar mensagem informativa
        document.getElementById("response-text").textContent =
            screenshotNumber === 1 ? "Captura 1 realizada. Use Ctrl+Shift+A para processar ou capture mais telas." :
                "Capturas realizadas. Use Ctrl+Shift+A/B/C para processar as imagens.";
    } else {
        // Se o elemento já existe, atualiza a imagem
        const imageElement = previewElement.querySelector('.preview-image');
        if (imageElement) {
            imageElement.src = imagePathWithTimestamp;
        }

        // Garantir que o preview esteja visível
        previewElement.style.display = 'flex';
        previewElement.classList.add('visible');
    }

    // Atualizar o status do screenshot
    updateScreenshotStatus(screenshotNumber, true);
}

// Função para remover um screenshot
window.removeScreenshot = function (screenshotNumber) {
    const previewElement = document.getElementById(`screenshot-${screenshotNumber}-preview`);
    if (previewElement) {
        // Adicionar animação de fade-out antes de esconder
        previewElement.classList.remove('visible');
        previewElement.classList.add('removing');

        // Aguardar a animação terminar antes de esconder
        setTimeout(() => {
            previewElement.style.display = 'none';
            previewElement.classList.remove('removing');
        }, 300);
    }

    updateScreenshotStatus(screenshotNumber, false);

    window.electron?.removeScreenshot?.(screenshotNumber)
        .then(() => {
            document.getElementById("log-content").innerHTML +=
                `<br> [APP] screenshot ${screenshotNumber} removido`;

            // Atualizar mensagem informativa
            const previewContainer = document.getElementById('screenshot-previews');
            const visiblePreviews = previewContainer.querySelectorAll('.screenshot-preview[style*="display: flex"], .screenshot-preview.visible');

            if (visiblePreviews.length === 0) {
                document.getElementById("response-text").textContent = "Aguardando capturas...";
            }
        })
        .catch(error => {
            console.error(`Erro ao remover screenshot ${screenshotNumber}:`, error);
        });
};