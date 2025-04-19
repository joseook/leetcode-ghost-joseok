let isDragging = false;
let dragStartPos = { x: 0, y: 0 };

window.addEventListener('DOMContentLoaded', async () => {
    const platform = window.electron?.platform || 'unknown';
    const isWindows = window.electron?.isWindows || false;
    const isLinux = window.electron?.isLinux || false;
    const isMac = window.electron?.isMac || false;
    const isWSL = window.electron?.isWSL || false;
    const appVersion = window.electron?.appVersion || '1.0.0';

    updateSystemInfo(platform, isWindows, isLinux, isMac, isWSL, appVersion);

    updateShortcutDisplay(isMac);

    document.getElementById("log-content").innerHTML += '<br> [SYSTEM] sistema iniciado';
    document.getElementById("log-content").innerHTML += `<br> [SYSTEM] plataforma detectada: ${platform}`;
    document.getElementById("log-content").innerHTML += `<br> [SYSTEM] versão: ${appVersion}`;
    document.getElementById("log-content").innerHTML += '<br> [APP] aguardando screenshot';
    document.getElementById("log-content").innerHTML += '<br> [HELPER] você pode apertar ctrl+shift+1 para tirar o primeiro screenshot';

    document.getElementById("response-text").innerHTML = `
        <div class="solution-tips">
            <h3>Bem-vindo ao LeetCode Ghost!</h3>
            <p>Este aplicativo ajuda você a resolver problemas de LeetCode.</p>
            <ol>
                <li>Insira sua chave da API OpenAI acima</li>
                <li>Capture a tela com o problema do LeetCode usando ${isMac ? '⌘+⇧+1' : 'Ctrl+Shift+1'}</li>
                <li>Processe a imagem e obtenha a solução com ${isMac ? '⌘+⇧+A' : 'Ctrl+Shift+A'}</li>
            </ol>
            <p>Para problemas complexos, você pode capturar até 3 telas e processá-las juntas.</p>
        </div>
    `;

    updateGhostStatusIndicator(true);

    setupWindowDrag();

    setupWindowControls();
});

function updateShortcutDisplay(isMac) {
    const shortcutElements = document.querySelectorAll('.shortcut span');

    if (shortcutElements.length === 0) return;

    if (isMac) {
        shortcutElements.forEach(element => {
            const text = element.textContent;
            element.textContent = text.replace('Ctrl+', '⌘+').replace('Shift+', '⇧+');
        });
    }

    console.log(`Atalhos de teclado atualizados para ${isMac ? 'macOS' : 'Windows/Linux'}`);
}

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

    const versionElement = document.querySelector('.status-bar .status-item:first-child .status-value');
    if (versionElement) {
        versionElement.textContent = `Ghost v${appVersion}`;
    }
}

function setupWindowDrag() {
    const dragElements = document.querySelectorAll('.titlebar, .app-header');

    dragElements.forEach(element => {
        element.addEventListener('mousedown', (e) => {
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

        window.electron?.sendMovement?.(e.screenX - dragStartPos.x, e.screenY - dragStartPos.y);
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        document.body.classList.remove('dragging');
    });

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

window.electron?.onCheckGhostMode?.(async (_event) => {
    try {
        const ghostStatus = await window.electron?.testGhostMode?.() || {
            platform: window.electron?.platform || 'unknown',
            isWindows: window.electron?.isWindows || false,
            isLinux: window.electron?.isLinux || false,
            isMac: window.electron?.isMac || false
        };

        document.getElementById("log-content").innerHTML += `<br> [SYSTEM] modo ghost ativo: plataforma ${ghostStatus.platform}`;

        updateSystemInfo(
            ghostStatus.platform,
            ghostStatus.isWindows,
            ghostStatus.isLinux,
            ghostStatus.isMac,
            window.electron?.isWSL || false,
            window.electron?.appVersion || '1.0.0'
        );

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

        if (Array.isArray(answers)) {
            let fullText = '';
            for (const answer of answers) {
                if (answer.content && answer.content[0] && answer.content[0].text) {
                    fullText += answer.content[0].text;
                }
            }

            const hasSections = fullText.includes('## ') ||
                fullText.includes('# ') ||
                fullText.includes('**Abordagem**') ||
                fullText.includes('**Solução**') ||
                fullText.includes('**Explicação**');

            if (hasSections) {
                const processedText = processMarkdown(fullText);
                responseHtml += processedText;
            } else {
                const codeMatch = fullText.match(/```(?:javascript|js|python|java|cpp|c\+\+)?([\s\S]*?)```/);

                if (codeMatch && codeMatch[1]) {
                    let codeContent = codeMatch[1].trim();

                    let language = 'javascript';
                    if (fullText.includes('```python')) language = 'python';
                    else if (fullText.includes('```java')) language = 'java';
                    else if (fullText.includes('```cpp') || fullText.includes('```c++')) language = 'cpp';

                    const highlightedCode = hljs.highlight(codeContent, { language }).value;

                    const parts = fullText.split(/```(?:javascript|js|python|java|cpp|c\+\+)?[\s\S]*?```/);
                    let explanation = '';

                    if (parts.length > 0) {
                        for (const part of parts) {
                            if (part.trim().length > explanation.length) {
                                explanation = part.trim();
                            }
                        }
                    }

                    if (explanation) {
                        responseHtml += `<div class="solution-explanation">${formatExplanation(explanation)}</div>`;
                    }

                    responseHtml += `<h3>Solução (${getLanguageName(language)})</h3>`;
                    responseHtml += `<pre><code class="hljs ${language}">${highlightedCode}</code></pre>`;
                } else {
                    responseHtml += `<div class="solution-text">${formatSolutionText(fullText)}</div>`;
                }
            }
        } else if (answers.output) {
            responseHtml += `<div class="solution-text">${formatSolutionText(answers.output)}</div>`;
        }

        responseHtml += '</div>';

        document.getElementById("response-text").innerHTML = responseHtml;

        document.getElementById("log-content").innerHTML += '<br> [APP] resposta gerada com sucesso!';
    } catch (error) {
        console.error("Erro ao renderizar resposta:", error);
        document.getElementById("response-text").innerHTML =
            `<div class="error">Erro ao processar resposta: ${error.message}</div>`;
    }
}

function formatSolutionText(text) {
    text = text.replace(/[oO]\(([^)]+)\)/g, '<span class="complexity">O($1)</span>');
    text = text.replace(/(complexidade de tempo|time complexity|complexidade temporal)([^.]*)O\(([^)]+)\)/gi,
        '$1$2<span class="complexity">O($3)</span>');
    text = text.replace(/(complexidade de espaço|space complexity|complexidade espacial)([^.]*)O\(([^)]+)\)/gi,
        '$1$2<span class="complexity">O($3)</span>');

    text = text.replace(/\n\n/g, '<br><br>');
    text = text.replace(/\n/g, '<br>');

    return text;
}

function processMarkdown(text) {
    let html = '';

    const lines = text.split('\n');
    let inCodeBlock = false;
    let codeContent = '';
    let language = 'javascript';

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        if (line.trim().startsWith('```')) {
            if (!inCodeBlock) {
                inCodeBlock = true;
                const langMatch = line.trim().match(/```(\w+)/);
                if (langMatch && langMatch[1]) {
                    language = langMatch[1];
                }
                codeContent = '';
                continue;
            } else {
                inCodeBlock = false;
                const highlightedCode = hljs.highlight(codeContent, { language }).value;
                html += `<pre><code class="hljs ${language}">${highlightedCode}</code></pre>`;
                continue;
            }
        }

        if (inCodeBlock) {
            codeContent += line + '\n';
            continue;
        }

        if (line.startsWith('# ')) {
            html += `<h1>${line.substring(2)}</h1>`;
        } else if (line.startsWith('## ')) {
            html += `<h2>${line.substring(3)}</h2>`;
        } else if (line.startsWith('### ')) {
            html += `<h3>${line.substring(4)}</h3>`;
        } else if (line.startsWith('- ')) {
            html += `<ul><li>${line.substring(2)}</li></ul>`;
        } else if (/^\d+\.\s/.test(line)) {
            const content = line.replace(/^\d+\.\s/, '');
            html += `<ol><li>${content}</li></ol>`;
        } else if (line.trim() === '') {
            html += '<br>';
        } else {
            line = line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
            line = line.replace(/\*([^*]+)\*/g, '<em>$1</em>');
            line = line.replace(/`([^`]+)`/g, '<code>$1</code>');

            html += `<p>${line}</p>`;
        }
    }

    return html;
}

function formatExplanation(text) {
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    text = text.replace(/\n\n/g, '<br><br>');
    text = text.replace(/\n/g, '<br>');

    return text;
}

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
        mes = (data.getMonth() + 1).toString(),
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

let selectionActive = false;
let currentScreenshotNumber = 0;
let startPoint = { x: 0, y: 0 };
let selectionOverlay = null;
let selectionArea = { x: 0, y: 0, width: 0, height: 0 };

function startAreaSelection(screenshotNumber) {
    currentScreenshotNumber = screenshotNumber;

    document.getElementById("log-content").innerHTML +=
        '<br> [APP] capturando tela, por favor aguarde...';

    window.electron?.minimizeWindow?.();

    setTimeout(() => {
        window.electron?.startAreaSelection?.(screenshotNumber)
            .then(result => {
                if (result && result.path) {
                    document.getElementById("log-content").innerHTML +=
                        '<br> [APP] screenshot ' + screenshotNumber + ' capturado com sucesso às ' + novaHora();
                    updateScreenshotStatus(screenshotNumber, true);
                    displayScreenshotPreview(screenshotNumber, result.path);

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
    const timestamp = new Date().getTime();
    const imagePathWithTimestamp = `${imagePath}?t=${timestamp}`;

    let previewContainer = document.getElementById('screenshot-previews');
    if (!previewContainer) {
        previewContainer = document.createElement('div');
        previewContainer.id = 'screenshot-previews';
        previewContainer.className = 'screenshot-previews';
        document.querySelector('.main-content').appendChild(previewContainer);
    }

    const previewElement = document.getElementById(`screenshot-${screenshotNumber}-preview`);

    if (!previewElement) {
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

        setTimeout(() => {
            newPreview.classList.add('visible');
        }, 10);

        document.getElementById("response-text").textContent =
            screenshotNumber === 1 ? "Captura 1 realizada. Use Ctrl+Shift+A para processar ou capture mais telas." :
                "Capturas realizadas. Use Ctrl+Shift+A/B/C para processar as imagens.";
    } else {
        const imageElement = previewElement.querySelector('.preview-image');
        if (imageElement) {
            imageElement.src = imagePathWithTimestamp;
        }

        previewElement.style.display = 'flex';
        previewElement.classList.add('visible');
    }

    updateScreenshotStatus(screenshotNumber, true);
}

window.removeScreenshot = function (screenshotNumber) {
    const previewElement = document.getElementById(`screenshot-${screenshotNumber}-preview`);
    if (previewElement) {
        previewElement.classList.remove('visible');
        previewElement.classList.add('removing');

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