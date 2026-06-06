@echo off
chcp 65001 >nul
echo ========================================
echo   Doc_Cy -- Cours de Medecine
echo ========================================
echo.

:: Verifier que Node.js est installe
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERREUR : Node.js n'est pas installe !
    echo.
    echo Veuillez installer Node.js depuis : https://nodejs.org
    echo Choisissez la version LTS, puis relancez ce fichier.
    echo.
    pause
    start https://nodejs.org
    exit /b 1
)

for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo Node.js detecte : %NODE_VER%
echo.

:: Installer les dependances backend si necessaire
if not exist "%~dp0backend\node_modules" (
    echo [1/4] Installation des dependances backend...
    cd /d "%~dp0backend"
    npm install
    if %ERRORLEVEL% neq 0 (
        echo ERREUR lors de npm install backend !
        pause
        exit /b 1
    )
    cd /d "%~dp0"
) else (
    echo [1/4] Backend : dependances deja installees
)

:: Installer les dependances frontend si necessaire
if not exist "%~dp0frontend\node_modules" (
    echo [2/4] Installation des dependances frontend...
    cd /d "%~dp0frontend"
    npm install
    if %ERRORLEVEL% neq 0 (
        echo ERREUR lors de npm install frontend !
        pause
        exit /b 1
    )
    cd /d "%~dp0"
) else (
    echo [2/4] Frontend : dependances deja installees
)

:: Construire le frontend
echo [3/4] Construction du frontend...
cd /d "%~dp0frontend"
call npm run build
if %ERRORLEVEL% neq 0 (
    echo ERREUR lors de la construction du frontend !
    pause
    exit /b 1
)
cd /d "%~dp0"
echo     Frontend construit avec succes.
echo.

:: Demarrer uniquement le backend (qui sert aussi le frontend)
echo [4/4] Demarrage de l'application sur http://localhost:3001
start "Doc_Cy App" cmd /k "cd /d "%~dp0backend" && node server.js"

timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo  Application lancee !
echo  Ouvrez votre navigateur sur :
echo  http://localhost:3001
echo ========================================
echo.
start http://localhost:3001
pause
