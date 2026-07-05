#!/bin/bash
echo "Exportation de la base de données depuis Docker..."

if [ -z "$DB_BACKUP_PASSPHRASE" ]; then
    echo "Erreur : la variable DB_BACKUP_PASSPHRASE doit être définie (mot de passe de chiffrement du backup)."
    echo "Exemple : DB_BACKUP_PASSPHRASE='...' ./docker-db-export.sh"
    exit 1
fi

docker exec -t optisaas-db pg_dump -U postgres optisaas > dump.sql
openssl enc -aes-256-cbc -pbkdf2 -salt -in dump.sql -out dump.sql.enc -pass env:DB_BACKUP_PASSPHRASE
rm -f dump.sql

echo "Exportation chiffrée terminée : dump.sql.enc"
