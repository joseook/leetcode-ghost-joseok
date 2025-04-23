#!/bin/bash
# Script especial para configurar bloqueio de capturas no WSL

# Detecta ID da janela Electron
WINDOW_ID=$(xdotool search --class electron | tail -1)
if [ -z "$WINDOW_ID" ]; then
  WINDOW_ID=$(xwininfo -root -children | grep -i electron | grep -o '0x[0-9a-f]*' | head -1)
fi

if [ -n "$WINDOW_ID" ]; then
  echo "Aplicando configurações anti-captura para ID: $WINDOW_ID"
  
  # Configurar como não gravável por ferramentas de captura
  xprop -id $WINDOW_ID -f _NET_WM_BYPASS_COMPOSITOR 32c -set _NET_WM_BYPASS_COMPOSITOR 2
  
  # Configuração para janelas especiais que não são capturadas
  xprop -id $WINDOW_ID -f _NET_WM_WINDOW_TYPE 32a -set _NET_WM_WINDOW_TYPE _NET_WM_WINDOW_TYPE_DOCK,_NET_WM_WINDOW_TYPE_NOTIFICATION
  
  # Configurar bits de opacidade para interferir com capturas
  xprop -id $WINDOW_ID -f _NET_WM_WINDOW_OPACITY 32c -set _NET_WM_WINDOW_OPACITY 0xfffffffd
  
  # Tenta configurações específicas do WSL Xserver
  xprop -id $WINDOW_ID -f _WSL_WINDOW_NO_CAPTURE 32c -set _WSL_WINDOW_NO_CAPTURE 1 2>/dev/null
  
  # Aplica flag ABOVE para ficar por cima
  xprop -id $WINDOW_ID -f _NET_WM_STATE 32a -set _NET_WM_STATE _NET_WM_STATE_ABOVE,_NET_WM_STATE_FOCUSED
  
  echo "Configurações WSL anti-captura aplicadas"
else
  echo "Não foi possível encontrar a janela do Electron"
fi