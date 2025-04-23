#!/bin/bash
# Cria uma janela de sobreposição invisível
xprop -id 0x800003 _NET_FRAME_EXTENTS | grep -o "[0-9]\+" | xargs | read left right top bottom
if [ $? -ne 0 ]; then
  left=0; right=0; top=0; bottom=0
fi

xprop -id 0x800003 _NET_WM_WINDOW_TYPE 32a -set _NET_WM_WINDOW_TYPE _NET_WM_WINDOW_TYPE_UTILITY
xprop -id 0x800003 -f _NET_WM_BYPASS_COMPOSITOR 32c -set _NET_WM_BYPASS_COMPOSITOR 1

echo "Aplicadas propriedades adicionais ao ID 0x800003"
exit 0
