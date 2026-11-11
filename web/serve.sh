#!/bin/sh
# Serve baduanjin_app/ over http (Chrome/Firefox then use the WebGL background key) and run the
# 问一问 · Ask chat's TypeSafe endpoint. Then open:
#   http://localhost:8765/web/baduanjin-v2.html
# Key: $TYPESAFE_API_KEY or ~/.config/brocade-mirror/typesafe.key (see web/tools/ask_server.py).
cd "$(dirname "$0")/.." && exec python3 web/tools/ask_server.py
