@echo off
echo Importation de la base de donnees dans Docker...
echo ATTENTION : Cela ecrasera les donnees actuelles dans le container Docker.
set /p confirm="Voulez-vous continuer ? (y/n) : "
if /i "%confirm%" neq "y" exit /b

if not exist dump.sql.enc (
    echo Erreur : Le fichier dump.sql.enc est introuvable.
    pause
    exit /b
)

if "%DB_BACKUP_PASSPHRASE%"=="" (
    echo Erreur : la variable DB_BACKUP_PASSPHRASE doit etre definie.
    pause
    exit /b
)

openssl enc -d -aes-256-cbc -pbkdf2 -in dump.sql.enc -out dump.sql -pass env:DB_BACKUP_PASSPHRASE
docker exec -i optisaas-db psql -U postgres optisaas < dump.sql
del /f dump.sql
echo Importation terminee avec succes.
pause
