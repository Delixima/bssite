# Mise en place — Brigade Scientifique (Supabase + Netlify)

## 1. Créer le projet Supabase

1. Va sur supabase.com, crée un compte et un nouveau projet (gratuit).
2. Une fois le projet créé, va dans **SQL Editor** et colle tout le contenu de `supabase-schema.sql`, puis exécute.
3. Va dans **Settings > API**. Note les trois valeurs suivantes :
   - `Project URL` → sera `SUPABASE_URL`
   - `anon public` key → sera `SUPABASE_ANON_KEY`
   - `service_role` key → sera `SUPABASE_SERVICE_ROLE_KEY` (secrète, jamais côté client)

## 2. Créer une application Discord (pour la connexion)

1. Va sur discord.com/developers/applications, crée une application.
2. Onglet **OAuth2** : note le `Client ID` et génère un `Client Secret`.
3. Dans Supabase : **Authentication > Providers > Discord**, active le provider, colle Client ID / Secret.
4. Supabase te donne une **Redirect URL** (ex : `https://TON-PROJET.supabase.co/auth/v1/callback`).
   Colle-la dans Discord Developer Portal, onglet OAuth2 > Redirects.

## 3. Compléter config.js

Ouvre `config.js` et remplace :
```js
const SUPABASE_URL = "https://TON-PROJET.supabase.co";
const SUPABASE_ANON_KEY = "TON-ANON-KEY";
```
par les vraies valeurs (URL et clé anon, jamais la clé service_role ici).

## 4. Déployer sur Netlify (avec les fonctions actives)

Le drag-and-drop de app.netlify.com/drop ne fait pas tourner les Netlify Functions.
Pour que soumission de rapport, demande d'expérience et validation fonctionnent, il faut déployer via Git ou la CLI :

**Option Git (recommandée)**
1. Mets tout ce dossier dans un dépôt GitHub.
2. Sur app.netlify.com, "Add new site > Import an existing project", connecte le dépôt.
3. Netlify détecte `netlify.toml` automatiquement (publish `.`, functions `netlify/functions`).

**Option CLI**
```
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

## 5. Variables d'environnement sur Netlify

Dans le dashboard Netlify du site : **Site configuration > Environment variables**, ajoute :
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Ce sont ces variables que les Netlify Functions utilisent (jamais exposées au navigateur).

## 6. Promouvoir un membre

Les nouveaux comptes arrivent avec le rang `scientifique_test`. Pour changer un rang :
1. Supabase > **Table Editor > profiles**.
2. Modifie la colonne `rang` directement (valeurs possibles : `scientifique_test`, `scientifique_confirme`, `scientifique_sous_chef`, `scientifique_chef`, `co_gerant`, `gerant`, `dirigeant`).

## 7. Vérification hebdomadaire des quotas

La fonction `weekly-check` tourne automatiquement chaque dimanche via `netlify.toml` (`schedule = "0 15 * * 0"`).
Netlify exécute les cron en UTC : 15h UTC correspond à 16h en Suisse en heure d'hiver, mais 17h en heure d'été (le décalage n'est pas corrigé automatiquement). Ajuste l'heure dans `netlify.toml` si besoin.

Elle ne fait que créer des lignes dans `avertissements` (statut `en_attente`) : aucun rang n'est jamais modifié ni aucun compte supprimé automatiquement. La validation ou l'annulation se fait à la main sur la page Suivi des membres, et la sanction recommandée reste à appliquer manuellement si tu la retiens.

## Fichiers concernés

- `supabase-schema.sql` — à exécuter une seule fois dans Supabase
- `config.js` — clés publiques Supabase, à compléter
- `auth.js` — widget de connexion Discord partagé
- `rapport.js`, `demande.js`, `effectif.js`, `suivi.js` — logique des pages
- `netlify/functions/*.js` — vérification serveur de l'accréditation, validation, avertissements
- `netlify.toml`, `package.json` — configuration du déploiement
