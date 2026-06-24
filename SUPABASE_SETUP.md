# Connecter le site à Supabase — Guide pas à pas

Objectif : rendre le site **autonome**. Une fois ces étapes faites, tout ce que tu
modifies dans `/admin` (concerts, boutique, musique, compte à rebours…) est enregistré
en ligne et visible **immédiatement par tous les visiteurs**, depuis n'importe quel appareil.

⏱️ Compte ~15 minutes. Aucune carte bancaire requise (offre gratuite Supabase).

---

## 1. Créer un compte et un projet Supabase

1. Va sur **https://supabase.com** → clique sur **Start your project** et crée un compte
   (le plus simple : « Continue with GitHub » ou avec ton email).
2. Une fois connecté, clique sur **New project**.
3. Remplis :
   - **Name** : `one-last-chance` (ou ce que tu veux)
   - **Database Password** : choisis un mot de passe fort et **note-le quelque part**
     (c'est le mot de passe de la base, pas celui de l'admin du site).
   - **Region** : choisis la plus proche (ex. *West EU (Paris)* / *Frankfurt*).
4. Clique **Create new project** et attends ~2 minutes que le projet se prépare.

---

## 2. Créer les tables (copier-coller du SQL)

1. Dans le menu de gauche de ton projet Supabase, ouvre **SQL Editor**.
2. Clique **+ New query**.
3. Ouvre le fichier **`supabase/schema.sql`** (dans ce projet), copie **tout** son contenu,
   colle-le dans l'éditeur SQL.
4. Clique **Run** (en bas à droite).
   → Tu dois voir « Success. No rows returned ». Les tables et le contenu de départ
   sont créés.

> ⚠️ N'exécute ce script **qu'une seule fois**. Si tu le relances, il essaiera de
> recréer des règles déjà existantes et te mettra des erreurs (sans gravité, mais inutile).

---

## 3. Récupérer tes clés (URL + clé publique)

1. Menu de gauche → **Project Settings** (la roue dentée) → **API**.
2. Repère :
   - **Project URL** → ex. `https://abcd1234.supabase.co`
   - **Project API keys** → la clé **`anon` `public`** (longue chaîne commençant par `eyJ…`).

> Ces deux valeurs sont **publiques**, c'est normal qu'elles soient dans le site.
> Elles sont protégées par les règles de sécurité (RLS) créées à l'étape 2.
> ❌ Ne copie **jamais** la clé `service_role` dans le site.

---

## 4. Brancher les clés dans le projet

1. Dans le dossier **`olc/`**, fais une copie du fichier **`.env.example`** et renomme-la **`.env`**.
2. Ouvre `.env` et remplace les valeurs par les tiennes :

   ```
   VITE_SUPABASE_URL=https://abcd1234.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...ta_cle_anon...
   ```

3. **Enregistre** le fichier. (Le fichier `.env` est ignoré par Git, il ne sera pas publié — c'est voulu.)

---

## 5. Créer ton compte administrateur

Le login `/admin` utilise désormais un vrai compte sécurisé (email + mot de passe).

1. Dans Supabase, menu de gauche → **Authentication** → **Users**.
2. Clique **Add user** → **Create new user**.
3. Saisis ton **email** et un **mot de passe** (celui que tu utiliseras pour entrer dans `/admin`).
4. **Coche « Auto Confirm User »** (important, sinon tu devras confirmer par email).
5. Clique **Create user**.

Tu peux créer plusieurs comptes (un par membre du groupe) en répétant l'opération.

---

## 6. Lancer le site

Dans un terminal, place-toi dans le dossier `olc/` et lance :

```
npm install      # (déjà fait normalement)
npm run dev
```

Ouvre l'adresse affichée (ex. `http://localhost:5173`).

- Va sur `/admin`, connecte-toi avec l'email + mot de passe de l'étape 5.
- L'avertissement orange a disparu : tu es en ligne. ✅
- Modifie un concert, ajoute un article, règle le compte à rebours…
  Rafraîchis la page : **tout est conservé**. Ouvre le site sur ton téléphone : c'est identique.

---

## 7. Mise en ligne (déploiement)

Quand tu déploieras le site (Vercel, Netlify, etc.), n'oublie pas d'ajouter les **deux
variables d'environnement** `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans les
réglages de l'hébergeur (section « Environment Variables »). Sans elles, le site déployé
repassera en mode « données par défaut ».

---

## Récapitulatif de ce qui est géré en base

| Table         | Contenu                                              |
|---------------|------------------------------------------------------|
| `concerts`    | Dates de concerts                                    |
| `merch`       | Articles de la boutique                              |
| `tracks`      | Tracklist + paroles                                  |
| `settings`    | Album, liens streaming, réglages du compte à rebours |
| `subscribers` | Emails de la newsletter                              |

## Images par glisser-déposer (admin)

Pour pouvoir déposer une image depuis ton ordinateur (articles boutique + pochette d'album)
au lieu de coller une URL :

1. Supabase → **SQL Editor** → **New query** → copie-colle **`supabase/migrations/phase2b_storage.sql`** → **Run**.
   (Crée un espace de stockage public `media` : images visibles par tous, dépôt réservé à l'admin connecté.)
2. C'est tout. Dans `/admin`, les champs image deviennent des zones « Glisse une image ou clique ».

## Prochaines étapes (à venir)

- **Phase 2 — Paiement** : Stripe Checkout pour la boutique (panier + paiement).
- **Phase 3 — Newsletter** : envoi réel des emails (Resend ou Mailchimp).
