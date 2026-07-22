@echo off
title ZUBIX SERVICE - Demarrage du Serveur
chcp 65001 > nul

echo ========================================================
echo   ZUBIX SERVICE - Initialisation du site dynamique
echo ========================================================
echo.

:: Verification de Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERREUR] Node.js n'est pas installe sur votre ordinateur.
    echo.
    echo Node.js est necessaire pour executer l'application en mode dynamique.
    echo Nous allons ouvrir la page officielle de telechargement...
    echo.
    echo Une fois Node.js installe, veuillez relancer ce fichier.
    echo.
    pause
    start https://nodejs.org/
    exit
)

:: Installation des dependances si necessaire
if not exist "node_modules\" (
    echo Installation des modules requis (cette etape peut prendre quelques secondes)...
    call npm install
    echo.
)

:: Demarrage du serveur et ouverture automatique
echo Demarrage du serveur local...
echo Accedez a : http://localhost:3000
echo.

:: Lancer le navigateur apres 2 secondes
start /b cmd /c "timeout /t 2 >nul && start http://localhost:3000"

:: Lancer le serveur Node.js
node server.js

pause
