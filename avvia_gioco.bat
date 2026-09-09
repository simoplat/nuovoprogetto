@echo off
chcp 65001 > nul
title Gioco dell'Impostore - Server Locale Wi-Fi
cls

echo =====================================================================
echo               🕵️  GIOCO DELL'IMPOSTORE - SERVER LOCALE  🕵️
echo =====================================================================
echo.
echo  Sto avviando il server sulla tua rete locale...
echo.

:: Avvia il server Python
start "" http://localhost:8000
python server.py

pause
