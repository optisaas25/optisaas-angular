#!/bin/bash
echo "Importation de la base de données dans Docker..."
echo "ATTENTION : Cela écrasera les données actuelles dans le container Docker."
read -p "Voulez-vous continuer ? (y/n) : " confirm
if [[ $confirm != "y" ]]; then
    exit 1
fi

if [ ! -f dump.sql.enc ]; then
    echo "Erreur : Le fichier dump.sql.enc est introuvable."
    exit 1
fi

if [ -z "$DB_BACKUP_PASSPHRASE" ]; then
    echo "Erreur : la variable DB_BACKUP_PASSPHRASE doit être définie."
    exit 1
fi

openssl enc -d -aes-256-cbc -pbkdf2 -in dump.sql.enc -out dump.sql -pass env:DB_BACKUP_PASSPHRASE
docker exec -i optisaas-db psql -U postgres optisaas < dump.sql
rm -f dump.sql
echo "Importation terminée avec succès."
