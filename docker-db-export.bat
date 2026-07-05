@echo off
echo ============================================
echo  Export de la base de donnees optisaas
echo ============================================
echo.

if "%DB_BACKUP_PASSPHRASE%"=="" (
    echo [ERREUR] La variable DB_BACKUP_PASSPHRASE doit etre definie ^(mot de passe de chiffrement du backup^).
    echo Exemple: set DB_BACKUP_PASSPHRASE=... ^&^& docker-db-export.bat
    pause
    exit /b 1
)

REM Verifier que le container est actif
docker ps --filter "name=optisaas-db" --format "{{.Names}}" | findstr /i "optisaas-db" >nul 2>&1
if errorlevel 1 (
    echo [ERREUR] Le container optisaas-db n'est pas en cours d'execution.
    echo Lancez d'abord: docker-compose up -d db
    pause
    exit /b 1
)

echo [1/4] Export des donnees depuis le container...
docker exec -t optisaas-db pg_dump -U postgres --no-owner --no-acl --clean --if-exists optisaas > dump.sql

if errorlevel 1 (
    echo [ERREUR] L'export a echoue.
    pause
    exit /b 1
)

echo [2/4] Copie locale vers init-scripts ^(utilisee uniquement par docker-compose.shared.yml sur cette machine, jamais a transmettre^)...
if not exist "init-scripts" mkdir init-scripts
copy /Y dump.sql init-scripts\dump.sql >nul

echo [3/4] Chiffrement du backup a partager...
openssl enc -aes-256-cbc -pbkdf2 -salt -in dump.sql -out dump.sql.enc -pass env:DB_BACKUP_PASSPHRASE
del /f dump.sql >nul

echo [4/4] Export termine avec succes!
echo.
echo  Fichiers crees:
echo    - dump.sql.enc          (chiffre - c'est CELUI-CI qu'il faut partager avec l'equipe)
echo    - init-scripts\dump.sql (en clair, LOCAL UNIQUEMENT, ne jamais committer ni transmettre)
echo.
echo  Taille du backup chiffre:
for %%F in (dump.sql.enc) do echo    %%~zF octets
echo.
pause
