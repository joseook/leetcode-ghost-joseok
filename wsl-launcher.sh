#!/bin/bash

# LeetCode Ghost Window - WSL Launcher Script
# Este script configura o ambiente WSL para executar a aplicação Electron

# Cores para mensagens
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Função para exibir mensagens de cabeçalho
print_header() {
    echo -e "\n${BOLD}${BLUE}=== $1 ===${NC}\n"
}

# Função para exibir passo a passo
print_step() {
    echo -e "${BOLD}${GREEN}[$1]${NC} $2"
}

# Função para exibir erros
print_error() {
    echo -e "${BOLD}${RED}ERRO:${NC} $1"
}

print_header "LeetCode Ghost Window - WSL Launcher"
print_step "1"print_step "2" "Verificando dependências necessárias"

# Verificar se o Node.js está instalado
if ! command -v node &> /dev/null; then
    print_error "Node.js não encontrado."
    echo -e "${YELLOW}Por favor, instale com:${NC}"
    echo -e "${YELLOW}curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -${NC}"
    echo -e "${YELLOW}sudo apt-get install -y nodejs${NC}"
    exit 1
else
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓ Node.js ${NODE_VERSION} está instalado${NC}"
fi

# Verificar se o npm está instalado
if ! command -v npm &> /dev/null; then
    print_error "npm não encontrado."
    echo -e "${YELLOW}Por favor, instale com:${NC}"
    echo -e "${YELLOW}sudo apt-get install -y npm${NC}"
    exit 1
else
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}✓ npm ${NPM_VERSION} está instalado${NC}"
fi

# Verificar se pacotes X11 necessários estão instalados
for pkg in xauth x11-utils; do
    if ! dpkg -l | grep -q $pkg; then
        echo -e "${YELLOW}Pacote ${pkg} não encontrado. Tentando instalar...${NC}"
        sudo apt-get update && sudo apt-get install -y $pkg
        if [ $? -ne 0 ]; then
            print_error "Falha ao instalar ${pkg}. Tente manualmente: sudo apt-get install -y ${pkg}"
        fi
    else
        echo -e "${GREEN}✓ ${pkg} está instalado${NC}"
    fi
done

# Verificar se o npm está instalado
if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm não encontrado. Por favor, instale com:${NC}"
    echo -e "${YELLOW}sudo apt-get install -y npm${NC}"
    exit 1
fi

print_step "3" "Identificando versão do WSL"

# Determinar a versão do WSL
WSL_VERSION="1"
if grep -q "WSL2" /proc/version; then
    WSL_VERSION="2"
fi
echo -e "${GREEN}✓ Detectado WSL${WSL_VERSION}${NC}"

print_step "4" "Configurando conexão X11"

# Verificar se temos uma GPU disponível
HAS_GPU=false
if lspci 2>/dev/null | grep -i 'vga\|3d\|2d' | grep -i 'nvidia\|amd\|intel' > /dev/null; then
    HAS_GPU=true
    echo -e "${GREEN}✓ GPU detectada - usando aceleração de hardware quando possível${NC}"
else
    echo -e "${YELLOW}GPU não detectada - usando modo de renderização de software${NC}"
fi

# Verificar qual servidor X está em execução no Windows
detect_x_server() {
    # Verificar processos comuns de servidores X no Windows
    local processes=$(powershell.exe "Get-Process | Where-Object {\$_.Name -match 'vcxsrv|xming|x410|xserver'} | Select-Object Name" 2>/dev/null)
    
    if echo "$processes" | grep -q "vcxsrv"; then
        echo "VcXsrv"
    elif echo "$processes" | grep -q "Xming"; then
        echo "Xming"
    elif echo "$processes" | grep -q "X410"; then
        echo "X410"
    else
        echo "Unknown"
    fi
}

X_SERVER=$(detect_x_server)
echo -e "${GREEN}✓ Detectado servidor X: ${X_SERVER}${NC}"

# Configurar DISPLAY para X11 forwarding
echo -e "${BLUE}Configurando DISPLAY para X11...${NC}"

# Obter IP do host Windows
get_host_ip() {
    # Método 1: /etc/resolv.conf (mais comum para WSL2)
    local ip1=$(cat /etc/resolv.conf | grep nameserver | awk '{print $2}' | head -1)
    
    # Método 2: IP da interface do host (mais preciso às vezes)
    local ip2=$(ip route | grep default | awk '{print $3}' | head -1)
    
    # Método 3: Gateway (alternativa)
    local ip3=$(ip route | grep -v 'link' | grep default | awk '{print $3}' | head -1)
    
    # Se o primeiro método deu resultado, use-o
    if [[ -n "$ip1" && "$ip1" != "127.0.0.1" ]]; then
        echo "$ip1"
    # Senão, tente o segundo método
    elif [[ -n "$ip2" && "$ip2" != "127.0.0.1" ]]; then
        echo "$ip2"
    # Senão, tente o terceiro método
    elif [[ -n "$ip3" && "$ip3" != "127.0.0.1" ]]; then
        echo "$ip3"
    # Se tudo falhar, use localhost
    else
        echo "127.0.0.1"
    fi
}

# Verificar se DISPLAY já está configurado
if [ -n "$DISPLAY" ]; then
    echo -e "${GREEN}DISPLAY já configurado como $DISPLAY${NC}"
    
    # Mesmo com DISPLAY configurado, testar conexão
    if ! xset q &>/dev/null; then
        echo -e "${YELLOW}⚠️ DISPLAY configurado para $DISPLAY, mas a conexão falhou.${NC}"
        echo -e "${YELLOW}Tentando reconfigurar...${NC}"
        unset DISPLAY
    else
        echo -e "${GREEN}✓ DISPLAY=$DISPLAY está funcionando!${NC}"
    fi
fi

# Se DISPLAY não estiver configurado ou a conexão falhou, reconfigure
if [ -z "$DISPLAY" ]; then
    # Obter IP do host Windows
    WSL_HOST_IP=$(get_host_ip)
    echo -e "${BLUE}IP do host Windows: ${WSL_HOST_IP}${NC}"
    
    # Configurar opções de DISPLAY com base na versão do WSL e no servidor X detectado
    if [ "$WSL_VERSION" = "2" ]; then
        # WSL2 precisa do IP do host
        case "$X_SERVER" in
            "VcXsrv")
                DISPLAY_OPTIONS=(
                    "${WSL_HOST_IP}:0.0"
                    "${WSL_HOST_IP}:0"
                    "localhost:0.0"
                    ":0.0"
                )
                ;;
            "Xming")
                DISPLAY_OPTIONS=(
                    "${WSL_HOST_IP}:0"
                    "${WSL_HOST_IP}:0.0"
                    ":0"
                )
                ;;
            "X410")
                DISPLAY_OPTIONS=(
                    "${WSL_HOST_IP}:0"
                    "localhost:0"
                    ":0"
                )
                ;;
            *)
                # Servidor X genérico/desconhecido
                DISPLAY_OPTIONS=(
                    "${WSL_HOST_IP}:0.0"
                    "${WSL_HOST_IP}:0"
                    "localhost:0.0"
                    ":0.0"
                    ":0"
                )
                ;;
        esac
    else
        # WSL1 geralmente usa :0 ou localhost:0.0
        DISPLAY_OPTIONS=(
            ":0"
            ":0.0"
            "localhost:0.0"
            "127.0.0.1:0.0"
        )
    fi
    
    # Testar cada opção de DISPLAY
    DISPLAY_FOUND=false
    for disp in "${DISPLAY_OPTIONS[@]}"; do
        export DISPLAY="$disp"
        echo -e "${YELLOW}Testando DISPLAY=$DISPLAY...${NC}"
        # Usar timeout para não travar se o X server estiver inacessível
        timeout 2s xset q &>/dev/null
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ DISPLAY=$DISPLAY funciona!${NC}"
            DISPLAY_FOUND=true
            break
        fi
    done
    
    if [ "$DISPLAY_FOUND" = false ]; then
        echo -e "${YELLOW}⚠️ Nenhuma configuração de DISPLAY funcionou automaticamente.${NC}"
        echo -e "${YELLOW}Definindo DISPLAY=${DISPLAY_OPTIONS[0]} como padrão.${NC}"
        export DISPLAY="${DISPLAY_OPTIONS[0]}"
    fi
fi

    echo -e "${YELLOW}Consulte o README.md para instruções detalhadas.${NC}"
    
    # Tentar algumas soluções comuns
    echo -e "${YELLOW}Tentando algumas soluções comuns...${NC}"
    
    # 1. Verificar firewall do Windows
    echo -e "${YELLOW}Dica: Verifique se o Windows Defender Firewall está permitindo o acesso ao X server${NC}"
    echo -e "${YELLOW}Dica: Tente executar o VcXsrv com a opção 'Disable access control' marcada${NC}"
    
    # 2. Sugestão para permitir conexões públicas no VcXsrv
    echo -e "${YELLOW}Dica: No firewall do Windows, permita que o VcXsrv aceite conexões públicas e privadas${NC}"
    
    # Perguntar se deseja continuar mesmo assim
    read -p "Deseja continuar mesmo assim? (s/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        exit 1
    fi
else
    echo -e "${GREEN}Conexão com o servidor X bem-sucedida!${NC}"
fi

# Verificar se existe o ~/.Xauthority
if [ ! -f "$HOME/.Xauthority" ]; then
    echo -e "${YELLOW}Arquivo ~/.Xauthority não encontrado. Tentando criar...${NC}"
    touch "$HOME/.Xauthority"
    xauth generate $DISPLAY . trusted 2>/dev/null
fi

# Configurações adicionais para melhorar a compatibilidade
export ELECTRON_DISABLE_SANDBOX=1
export ELECTRON_NO_ASAR=1
export NODE_OPTIONS="--no-sandbox"
export LIBGL_ALWAYS_INDIRECT=1

# Verificar se o aplicativo já foi instalado
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Instalando dependências...${NC}"
    npm install
fi

# Iniciar a aplicação
echo -e "${GREEN}Iniciando LeetCode Ghost Window...${NC}"
echo -e "${GREEN}Usando DISPLAY=$DISPLAY${NC}"
npm start

# Retornar código de saída do npm
exit $? 