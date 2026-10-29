# Fatou Shop

Vitrine React/Vite et API Laravel pour le catalogue, les commandes, les paiements à vérifier manuellement et l’administration de la boutique.

## Démarrage local

Prérequis : PHP 8.3 ou plus récent avec `openssl`, `mbstring`, `fileinfo`, `pdo_mysql` et `curl`, Composer, Node.js, ainsi que MySQL/MariaDB.

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

## Paiements et déploiement

Wave et Orange Money ne sont pas débités par le site : le client peut signaler un paiement et joindre une capture, puis l’administrateur la vérifie dans l’espace protégé. Les justificatifs restent privés.

Pour un déploiement, créer un utilisateur MySQL dédié avec les permissions minimales, utiliser HTTPS, définir `APP_DEBUG=false`, choisir un mot de passe administrateur unique et ne pas transférer la configuration locale. Appliquer les migrations en production avec `php artisan migrate --force`.
