# Fatou Shop

Vitrine React/Vite et API Laravel pour le catalogue, les commandes, les paiements à vérifier manuellement et l’administration de la boutique.

## Démarrage local

Prérequis : PHP 8.4.1 ou plus récent avec `openssl`, `mbstring`, `fileinfo`, `pdo_mysql` et `curl`, Composer, Node.js, ainsi que MySQL/MariaDB.

1. Dans `backend/`, copier `.env.example` vers `.env`, renseigner l’accès à une base de données dédiée, puis générer la clé avec `php artisan key:generate`.
2. Définir `ADMIN_EMAIL` et `ADMIN_PASSWORD` dans `backend/.env`. L’adresse doit être valide et le mot de passe doit comporter au moins 14 caractères. Garder ces valeurs privées et ne jamais publier `.env`.
3. Depuis `backend/`, préparer la base et les données de démonstration :

   ```powershell
   php artisan migrate --seed
   php artisan storage:link
   ```

4. Lancer Laravel dans un terminal ouvert dans `backend/` :

   ```powershell
   php artisan serve --host=127.0.0.1 --port=8000
   ```

5. Lancer Vite dans un autre terminal ouvert à la racine du projet :

   ```powershell
   npm install
   npm run dev -- --host 127.0.0.1
   ```

La vitrine est sur `http://127.0.0.1:5173/`, l’espace administrateur sur `http://127.0.0.1:5173/admin` et l’espace client facultatif sur `http://127.0.0.1:5173/client`. Se connecter à l’administration avec les identifiants configurés dans `backend/.env`.

L’espace propriétaire superadmin est disponible sur `http://127.0.0.1:5173/superadmin`. Définir `SUPERADMIN_NAME`, `SUPERADMIN_EMAIL` et un `SUPERADMIN_PASSWORD` unique d’au moins 14 caractères dans `backend/.env`, puis exécuter depuis `backend/` `php artisan migrate --seed`. La migration crée les rôles superadmin et les journaux d’activité ; le superadmin peut consulter commandes et tentatives de connexion admin/client/livreur, créer des comptes admin et suspendre/réactiver leurs accès. Les ajouts et modifications effectués depuis l’admin sont aussi journalisés. Les mots de passe et les justificatifs de paiement ne sont jamais inscrits au journal.

## Installation sur téléphone ou ordinateur

Fatou Shop est une application web installable (PWA). Sur un déploiement, servir le front et l’API derrière le même domaine en HTTPS et configurer le serveur web pour renvoyer `index.html` pour les chemins `/admin`, `/client` et `/driver` ; conserver `/api` et les fichiers existants comme routes prioritaires. HTTPS est obligatoire pour l’installation et la géolocalisation hors `localhost`.

Depuis la vitrine, utiliser le bouton « Installer l’application » ou le menu du navigateur. Sur iPhone/iPad, ouvrir le site dans Safari, toucher Partager puis « Sur l’écran d’accueil ». Les raccourcis de l’application ouvrent la vitrine, l’admin, l’espace client ou l’espace livreur. Chaque espace garde son propre écran de connexion et ses autorisations.

Le service worker conserve l’interface et ses ressources pour accélérer le chargement et permettre de rouvrir l’application hors connexion. Les commandes, connexions, données administratives, cartes et suivi GPS nécessitent toujours une connexion Internet ; aucune donnée de compte ou de commande n’est enregistrée hors ligne.

Les commandes sont enregistrées avant toute proposition d’espace client ; aucune redirection WhatsApp n’est déclenchée par le bouton de validation. Après l’enregistrement, le client peut terminer sans compte, ou créer/se connecter puis être redirigé vers son espace avec cette commande rattachée. Les clients peuvent y suivre leurs commandes et paiements, revoir leurs justificatifs, consulter leurs dépenses hebdomadaires et mensuelles, ajouter une photo de profil et partager un code d’invitation.

Dans « Clients & parrainage », l’administration peut rechercher tous les clients inscrits par nom ou numéro, consulter leurs commandes, ouvrir un message WhatsApp prérempli individuellement et supprimer un compte avec ses commandes, paiements et justificatifs associés. Les annonces publiées s’affichent dans les espaces clients. WhatsApp s’ouvre avec un message préparé, mais l’administrateur doit envoyer chaque message manuellement ; aucun envoi groupé automatique n’est configuré.

Une invitation est validée uniquement lorsque le filleul inscrit termine une commande livrée par l’administration. Le seuil et le pourcentage de la remise unique sont modifiables depuis « Clients & parrainage » dans l’administration. Les clients peuvent également commander sans créer de compte.

## Tests

Depuis `backend/`, lancer `php artisan test`. Depuis la racine, lancer `npm run build`.

## Paiements

Wave et Orange Money ne sont pas débités par le site : le client peut signaler un paiement et joindre une capture, puis l’administrateur la vérifie dans l’espace protégé. Les justificatifs restent privés.

## Déploiement automatique sur `fatoushop.multibrain.cloud`

Le workflow GitHub Actions teste l’API, compile la vitrine, puis transfère une version au VPS par SSH. Chaque version est conservée séparément ; les migrations et le contrôle de santé sont exécutés avant de garder la nouvelle version. Le premier déploiement initialise les données et les comptes une seule fois. Les déploiements suivants ne réexécutent pas les seeders et ne réinitialisent donc pas les mots de passe.

Le VPS vérifié tourne déjà sous Ubuntu 24.04 avec Nginx, MySQL, Docker et PHP-FPM 8.2, 8.3 et 8.4. Fatou Shop utilise PHP 8.4-FPM ; le workflow de compilation peut rester sous PHP 8.5. Le DNS A de `fatoushop.multibrain.cloud` doit pointer vers `72.62.239.108`. N’installez pas de dépôt PHP, ne changez pas le pare-feu et ne redémarrez pas MySQL, Docker ou les autres versions PHP pour ce déploiement.

### 1. Vérifier les prérequis sans modifier les services

Avant toute installation, vérifier la version et les extensions du PHP déjà installé, ainsi que l’état des dossiers, certificat et hôtes Nginx. Ces commandes sont en lecture seule :

```bash
php8.4 -v
php8.4 -m
test -S /run/php/php8.4-fpm.sock && echo "PHP 8.4 FPM est disponible"
command -v nginx
command -v certbot
sudo certbot certificates
sudo test ! -e /var/www/fatou-shop && echo "/var/www/fatou-shop est libre"
getent passwd deploy || true
sudo test ! -e /etc/nginx/snippets/fatoushop-locations.conf && echo "Snippet Fatou Shop absent"
sudo test ! -e /etc/nginx/sites-available/fatoushop.conf && echo "Vhost Fatou Shop absent"
sudo test ! -e /etc/nginx/sites-enabled/fatoushop.conf && echo "Activation Fatou Shop absente"
sudo nginx -T 2>/dev/null | grep -F "fatoushop.multibrain.cloud" || true
```

Le PHP CLI doit être en version 8.4.1 ou plus et inclure au minimum `ctype`, `curl`, `fileinfo`, `mbstring`, `openssl`, `PDO`, `pdo_mysql`, `tokenizer` et `xml`. Vérifier que le socket PHP-FPM existe. Si PHP ou une extension manque, arrêter et examiner le plan APT avant toute installation : une installation de paquet peut redémarrer le service PHP-FPM concerné. N’ajouter aucun dépôt APT.

Le rapport actuel montre que Nginx dessert déjà plusieurs sites et qu’il existe des avertissements de noms de serveur dupliqués, malgré un `nginx -t` réussi. Ne supprimez aucun fichier de `sites-enabled`, ne remplacez aucun hôte existant et ne rechargez pas Nginx avant d’avoir confirmé que le nom Fatou Shop n’est pas déjà configuré. Le sous-domaine doit avoir son propre bloc `server_name`.

### 2. Créer uniquement les ressources Fatou Shop

Créer un utilisateur SSH dédié (ne pas utiliser `root` pour GitHub Actions) et uniquement le nouveau dossier `/var/www/fatou-shop`. Ces commandes ne modifient pas les autres dossiers, bases ou applications ; ne les lancer qu’après avoir vérifié que l’utilisateur `deploy` et ce chemin n’existent pas déjà :

```bash
sudo adduser --disabled-password --gecos "" deploy
sudo usermod -aG www-data deploy
sudo install -d -o deploy -g www-data -m 2750 /var/www/fatou-shop
sudo install -d -o deploy -g www-data -m 2750 \
  /var/www/fatou-shop/incoming /var/www/fatou-shop/releases \
  /var/www/fatou-shop/shared /var/www/fatou-shop/acme
sudo install -d -o deploy -g www-data -m 2770 \
  /var/www/fatou-shop/shared/backend-storage
sudo install -d -o deploy -g www-data -m 2750 \
  /var/www/fatou-shop/acme/.well-known/acme-challenge
```

Avant de créer la base, vérifier qu’aucune base `fatou_shop` ni aucun compte MySQL `fatou_shop` n’existe. N’exécuter `CREATE DATABASE`/`CREATE USER` que s’ils sont absents ; ne jamais supprimer ou remplacer une base existante. MySQL reste lié à `127.0.0.1:3306` et n’a pas besoin d’être redémarré.

Si les deux sont absents, créer la base avec un compte dédié (remplacer le mot de passe d’exemple par une valeur aléatoire forte) :

```bash
sudo mysql
```

```sql
CREATE DATABASE fatou_shop CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'fatou_shop'@'127.0.0.1' IDENTIFIED BY 'REMPLACER_PAR_UN_MOT_DE_PASSE_FORT';
GRANT ALL PRIVILEGES ON fatou_shop.* TO 'fatou_shop'@'127.0.0.1';
EXIT;
```

Après avoir vérifié que `/etc/nginx/snippets/fatoushop-locations.conf` et `/etc/nginx/sites-available/fatoushop.conf` n’existent pas déjà, installer les fichiers Nginx Fatou Shop sans toucher aux sites existants :

```bash
sudo curl -fsSL https://raw.githubusercontent.com/bniasseisidp-boop/fatou-shop/main/deployment/nginx/fatoushop-locations.conf \
  -o /etc/nginx/snippets/fatoushop-locations.conf
sudo curl -fsSL https://raw.githubusercontent.com/bniasseisidp-boop/fatou-shop/main/deployment/nginx/fatoushop.conf \
  -o /etc/nginx/sites-available/fatoushop.conf
sudo ln -s /etc/nginx/sites-available/fatoushop.conf /etc/nginx/sites-enabled/fatoushop.conf
sudo nginx -t
sudo systemctl reload nginx
```

Ne modifiez pas UFW ni le pare-feu de l’hébergeur : les ports 80 et 443 écoutent déjà. Si le sous-domaine n’est pas accessible depuis Internet, vérifier d’abord les règles existantes avec l’hébergeur.

### 3. Configurer l’application et HTTPS

Créer le fichier d’environnement de production à partir du modèle, puis l’éditer **uniquement sur le VPS** :

```bash
if sudo test ! -e /var/www/fatou-shop/shared/backend.env; then
  sudo -u deploy curl -fsSL \
    https://raw.githubusercontent.com/bniasseisidp-boop/fatou-shop/main/backend/.env.example \
    -o /var/www/fatou-shop/shared/backend.env
else
  echo "backend.env existe déjà : il est conservé, ne pas le remplacer."
fi
sudo chown deploy:www-data /var/www/fatou-shop/shared/backend.env
sudo chmod 640 /var/www/fatou-shop/shared/backend.env
sudoedit /var/www/fatou-shop/shared/backend.env
```

Dans ce fichier, renseigner `APP_ENV=production`, `APP_URL=https://fatoushop.multibrain.cloud`, `SESSION_SECURE_COOKIE=true`, laisser `APP_DEBUG=false`, définir `APP_KEY` avec une clé générée par `php -r "echo 'base64:'.base64_encode(random_bytes(32)), PHP_EOL;"`, et compléter `DB_PASSWORD`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SUPERADMIN_EMAIL` et `SUPERADMIN_PASSWORD`. Les deux mots de passe administrateur doivent être uniques et comporter au moins 14 caractères. Garder ce fichier privé ; ne jamais le copier dans GitHub.

Émettre le certificat Let's Encrypt depuis le serveur, en vérifiant que le DNS et les ports 80/443 sont accessibles :

```bash
sudo certbot certonly --webroot -w /var/www/fatou-shop/acme \
  -d fatoushop.multibrain.cloud --email votre-adresse-email --agree-tos --no-eff-email
sudo curl -fsSL https://raw.githubusercontent.com/bniasseisidp-boop/fatou-shop/main/deployment/nginx/fatoushop-https.conf \
  -o /etc/nginx/sites-available/fatoushop.conf
sudo nginx -t
sudo systemctl reload nginx
sudo certbot renew --dry-run
```

La configuration HTTPS conserve le chemin HTTP-01 pour renouveler le certificat. N’activer le déploiement que lorsque `sudo nginx -t` et le test de renouvellement réussissent.

### 4. Autoriser les déploiements GitHub

Sur votre ordinateur Windows, créer une clé dédiée à GitHub Actions et copier la clé publique sur le compte `deploy` du VPS. Ne partagez jamais la clé privée :

```powershell
ssh-keygen -t ed25519 -C "github-actions-fatou-shop" -f "$env:USERPROFILE\.ssh\fatou-shop-deploy"
Get-Content "$env:USERPROFILE\.ssh\fatou-shop-deploy.pub"
```

À l’invite de la phrase secrète, appuyer sur Entrée pour laisser la clé sans phrase secrète ; protéger sa clé privée en la stockant uniquement comme secret GitHub.

Sur le VPS, ajouter la ligne publique affichée :

```bash
sudo install -d -o deploy -g deploy -m 700 /home/deploy/.ssh
echo 'COLLER_ICI_LA_CLE_PUBLIQUE_SSH' | sudo tee -a /home/deploy/.ssh/authorized_keys
sudo chown deploy:deploy /home/deploy/.ssh/authorized_keys
sudo chmod 600 /home/deploy/.ssh/authorized_keys
```

Vérifier l’empreinte de la clé hôte du VPS avec `sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub`, puis collecter les clés d’hôte depuis Windows avec `ssh-keyscan -H fatoushop.multibrain.cloud`. Comparer les empreintes avant d’enregistrer la sortie de `ssh-keyscan`.

Dans **GitHub → Settings → Secrets and variables → Actions**, créer les secrets de dépôt suivants :

| Secret | Valeur |
|---|---|
| `VPS_HOST` | `fatoushop.multibrain.cloud` |
| `VPS_USER` | `deploy` |
| `VPS_SSH_PRIVATE_KEY` | Contenu du fichier `~/.ssh/fatou-shop-deploy` (clé privée, jamais `.pub`) |
| `VPS_KNOWN_HOSTS` | Sortie vérifiée de `ssh-keyscan -H fatoushop.multibrain.cloud` |

Créer aussi la variable de dépôt `FATOU_SHOP_DEPLOY_ENABLED` avec la valeur `true`. Tant qu’elle n’existe pas, les tests et la compilation s’exécutent, mais le job de déploiement reste désactivé. Lancer ensuite **Actions → Test and deploy Fatou Shop → Run workflow** pour la première mise en ligne. Les prochains push sur `main` seront déployés automatiquement après validation des tests et du build.

Le script de déploiement conserve les cinq versions les plus récentes. Les migrations sont appliquées avec `--force` ; elles ne sont pas annulées si une vérification de santé échoue. Sauvegarder régulièrement la base et les fichiers de `shared/backend-storage`.
