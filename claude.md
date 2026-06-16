# Mellmoth Forge — Hub D&D · Base de connaissances

> Document de référence du projet « espace de jeu D&D réservé aux membres » sur le site Mellmoth Forge.
> Établi le 16/06/2026 · Plugin `mellmoth-dnd` v0.1.7 (Inc. 1.1).

-----

## 1. Objectif

Construire un **hub de gestion de parties D&D** intégré au site, accessible uniquement aux utilisateurs autorisés. Périmètre cible : fiches de personnages (PJ/PNJ), notes & lore de campagne, suivi des sessions, et à terme une couche IA (génération de PNJ, résumés de session). Accès réservé aux membres ; pas d’ouverture au public.

-----

## 2. Contexte d’hébergement (déterminant)

C’est le point qui conditionne toute la faisabilité. Vérifié directement sur le compte :

- **Plateforme : WordPress.com** (et *non* WP Engine ni self-hosted, malgré l’hypothèse initiale).
- **Site :** `mellmoth-forge.com` — blog ID `248509664`.
- **Plan : payant Business ou Commerce** (site « Atomic »). Déduit du fait que le site fait tourner **23 plugins**, dont de nombreux plugins tiers (WooCommerce, FiboSearch, Flexible Shipping, YITH, Yoast, Complianz, Code Snippets…) — ce qui n’est possible que sur ces niveaux.

### Conséquences

|Capacité                                 |Disponible ?     |Implication                                                    |
|-----------------------------------------|-----------------|---------------------------------------------------------------|
|Plugins custom (upload de code à soi)    |✅ Oui            |Le plugin D&D est faisable, sans upgrade.                      |
|Exécution .NET / Kotlin sur l’hébergement|❌ Non            |WordPress.com = PHP + MySQL. Le hub est donc **un plugin PHP**.|
|Sites de staging                         |✅ Oui (Business+)|Tester hors prod avant mise en ligne.                          |
|Accès SFTP / SSH                         |✅ Oui (Business+)|Déploiement par fichiers / wp-cli possible.                    |


> **Décision actée :** puisque ça doit tourner sur le site WordPress.com, le hub est un **plugin PHP**. La stack .NET/Kotlin du dev n’est pas utilisable côté hébergement (elle le serait uniquement avec un service hébergé ailleurs + intégration, option écartée ici).

-----

## 3. Décisions d’architecture

- **Forme :** plugin WordPress custom, codé maison.
- **Données :** tables SQL dédiées (`$wpdb` + `dbDelta`) plutôt que CPT + post-meta, car le modèle est franchement relationnel (sessions ↔ PJ ↔ PNJ ↔ lieux ↔ quêtes).
- **API :** namespace REST (`mellmoth-dnd/v1`) avec `permission_callback` (autorisation vérifiée **côté serveur**, jamais sur le seul masquage d’UI).
- **Front :** PHP server-rendered pour le shell ; bascule vers une **SPA React** quand le vrai interactif (CRUD) arrivera.
- **Auth :** réutilisation native des comptes WordPress/WooCommerce existants + **capabilities** WordPress pour le contrôle d’accès (RBAC intégré, gratuit).
- **Responsive : norme du projet** (voir convention ci-dessous). Toute UI livrée doit être utilisable sur mobile/tablette, pas seulement desktop.
- **Méthode :** **agile**, par tranches verticales livrables (walking skeleton puis incréments fonctionnels).

### Convention responsive (norme — à respecter pour toute nouvelle UI)

Le hub doit fonctionner sur mobile et tablette (le site tourne sur WordPress.com, trafic mobile attendu). Règles en vigueur :

- **Breakpoints standard du plugin :**
  - `max-width: 900px` → bascule des **tableaux denses en cartes** (les tableaux à nombreuses colonnes débordent dès le paysage ~860px).
  - `max-width: 640px` → adaptations mobile générales (grilles en 1 colonne, `flex-wrap` sur la navigation, paddings réduits).
- **Pas de scroll horizontal** comme solution finale : un tableau qui déborde doit avoir une **vue carte** dédiée (résumé compact des champs clés), pas juste un `overflow-x: auto`.
- **Vue carte ≠ transformation CSS du tableau :** les cartes sont un rendu compact **généré en JS** à côté du tableau (`.mdnd-kb-cards`). Tableau affiché en desktop, cartes en mobile, via `display` dans les media queries. Le contenu détaillé reste accessible via la **modale** partagée (`buildDetailContent`), réutilisée par la ligne et la carte.
- **Viewport :** géré par le thème (balise `<meta name="viewport">` confirmée présente). Le plugin ne l'ajoute pas.
- **Cache-busting :** la constante `VERSION` versionne `app.css`/`app.js` (`wp_enqueue_*`). **Incrémenter la version à chaque modif d'asset** pour éviter le cache navigateur sur staging/prod.
- **Pas de bandeau superflu :** l'en-tête « titre + Bienvenue » a été retiré ; la navigation par onglets sert de point d'entrée. Garder l'UI sobre.

### Correspondance des concepts (repère pour un profil .NET / Kotlin)

|WordPress                                    |Équivalent mental                                    |
|---------------------------------------------|-----------------------------------------------------|
|Plugin                                       |Module déployable qui se greffe sur l’app            |
|Hooks (`add_action` / `add_filter`)          |Système d’événements / pipeline d’extension          |
|`register_rest_route` + `permission_callback`|Controllers REST + middleware d’autorisation         |
|`$wpdb` + `dbDelta`                          |Couche data brute + applicateur de schéma (migration)|
|Users + capabilities                         |Identité + RBAC                                      |

-----

## 4. Backlog agile (incréments)

> Le découpage des incréments est piloté par le lead. Inc. 1 est défini ; les suivants sont une proposition à confirmer/réordonner.

- **Inc. 1 — Shell gated** *(livré)* : page dédiée, ajoutée au menu si l’utilisateur connecté a le droit, avec une navigation interne à deux entrées (Scénario / Fiches perso), encore vides.
- **Inc. 1.1 — Gestion des accès UI** *(livré)* : Interface d'administration native dans WordPress pour octroyer/retirer le droit d'accès au Hub sans passer par du code.
- **Inc. 2+ (proposés)** : Personnages (PJ/PNJ) + appartenance par campagne · Sessions (log + résumé) · Lore / lieux / quêtes + relations · Couche IA · (le cas échéant) gestion fine des accès dans le hub.

-----

## 5. Inc. 1 et 1.1 — Livré

### Structure du plugin

```
mellmoth-dnd/
├── mellmoth-dnd.php            # fichier principal : constantes + bootstrap
├── includes/
│   ├── class-capabilities.php  # crée/accorde le droit access_dnd_hub (par défaut aux admins)
│   ├── class-router.php        # route /table-de-jeu + garde serveur + assets
│   ├── class-menu.php          # ajoute l'entrée de menu si autorisé
│   └── class-admin-users.php   # UI back-office pour attribuer l'accès par utilisateur
├── templates/
│   └── app.php                 # la page : nav par onglets + tableaux (sorts/équipement) + cartes mobile + lanceur de dés
└── assets/
    ├── app.css                 # styles : onglets, tableaux, cartes responsive, modale, dés
    └── app.js                  # onglets, rendu tableaux/cartes, tri/recherche, modale, dés (vanilla, pas de build)
```

> ⚠️ L’arborescence doit être préservée : le code fait des `require` vers `includes/`, `templates/`, `assets/`.

### Constantes / réglages (en haut de `mellmoth-dnd.php`)

|Constante      |Valeur par défaut|Rôle                                         |
|---------------|-----------------|---------------------------------------------|
|`CAPABILITY`   |`access_dnd_hub` |Droit requis pour voir le hub                |
|`ROUTE_SLUG`   |`table-de-jeu`   |URL publique : `/table-de-jeu`               |
|`MENU_LABEL`   |`Table de jeu`   |Libellé dans le menu                         |
|`MENU_LOCATION`|`primary`        |Emplacement de menu du thème (**à vérifier**)|

### Installation (WordPress.com)

1. Disposer du plugin en **`.zip` intact** (ne pas dézipper).
1. wp-admin → **Plugins → Add New Plugin → Upload** → glisser le `.zip`.
1. Installer puis **activer**. L’activation accorde `access_dnd_hub` à l’administrateur et enregistre la route.

### Gestion du droit d’accès (Inc. 1.1)

L'attribution du droit d'accès au Hub se fait désormais directement depuis l'interface d'administration de WordPress :

- **Vue d'ensemble** : Dans `Comptes > Tous les comptes` (ou `Users > All Users`), une colonne **Accès Hub D&D** affiche `✔ Autorisé` (en vert) ou `✖ Non` (en gris).
- **Modification individuelle** : En modifiant le profil d'un utilisateur, une section **Hub D&D** est présente en bas de page. Il suffit de cocher ou décocher la case "Autoriser cet utilisateur à accéder au Hub D&D" et de sauvegarder.

*Note technique : Le code retire silencieusement la capacité si la case est décochée, sauf pour les administrateurs pour éviter qu'ils ne se bloquent eux-mêmes s'ils utilisent la case à d'autres fins.*

### Tests de la garde

- **Connecté avec le droit** (admin ou compte validé manuellement) → la page `/table-de-jeu` s’affiche, et l’entrée « Table de jeu » apparaît dans le menu. ✅ *(validé)*
- **Connecté sans le droit** (compte non-admin sans case cochée) → **403**. Aucun compte non-admin n’a le droit par défaut.
- **Déconnecté** → redirection vers le login.

> Conseil : tester le cas « refusé » avec un **second compte**, pas en retirant le droit à son propre admin.

### Pièges connus

- **404 sur `/table-de-jeu`** → Réglages → Permaliens → Enregistrer (recharge les règles de réécriture).
- **Entrée de menu absente** → le thème n’utilise pas l’emplacement `primary` : ajuster `MENU_LOCATION`.

-----

## 6. Workflow de déploiement (staging-first)

### Procédure de build (norme — à chaque livraison d'asset/code)

1. **Bump de version** aux **deux** endroits de `mellmoth-dnd/mellmoth-dnd.php` (en-tête `Version:` *et* `const VERSION`) + le marqueur de version en tête de ce `claude.md`. Patch (`0.1.x`) pour un correctif/ajustement UI, mineur pour une fonctionnalité. La constante `VERSION` sert aussi de cache-buster aux assets (`wp_enqueue_*`) : sans bump, le navigateur garde l'ancien `app.css`/`app.js`.
2. **Générer `<version>.zip`** à la racine du repo, contenant le dossier `mellmoth-dnd/`.
   - **Séparateurs `/`** obligatoires dans les chemins (le spec ZIP l'exige ; `Compress-Archive` de PowerShell met des `\` → extraction WordPress peu fiable). Construire l'archive via `System.IO.Compression.ZipFile` en remplaçant `\` par `/`.
   - **Exclure** `.idea/` (et tout dossier d'outillage IDE) : ça n'a pas sa place dans un plugin distribué.
3. Uploader le `.zip` sur le **staging** (jamais la prod en premier).

> Le `.zip` est l'artefact de livraison. Les `<version>.zip` précédents sont conservés à la racine du repo comme historique.

### Mise en ligne (staging-first)

1. **Ne jamais tester du code non validé sur la prod** (boutique live avec commandes WooCommerce réelles).
1. Cloner la prod vers le **site de staging** (tableau de bord d’hébergement WordPress.com — pas le wp-admin).
1. Installer/valider le plugin sur le staging.
1. **Promotion en prod = réuploader le même `.zip`** sur la production. Le plugin étant autonome, **pas besoin de pousser la base de données** d’un environnement à l’autre → **zéro risque pour les commandes/clients WooCommerce**.

-----

## 7. Référence WordPress.com (rappels)

- **Installer un plugin tiers :** Plugins → Add New Plugin → Upload → déposer le `.zip` **sans le dézipper** → Install → Activate.
- **Plans & capacités :** depuis avril 2026, l’accès aux plugins est inclus sur tous les plans payants. **Staging, SFTP/SSH et sauvegardes restent réservés au Business+.**
- **Limite d’upload dashboard :** au-delà de ~100 Mo, passer par SFTP (Business+).
- **Gestion des environnements :** tableau de bord d’hébergement WordPress.com (≠ wp-admin, qui ne gère qu’un environnement donné).

-----

## 8. Prochaines étapes

- Valider l'interface d'administration des utilisateurs sur le **staging**.
- Définir l’**Inc. 2** (contenu des onglets : modèle de données + CRUD).
- Trancher le moment du passage **PHP → SPA React** (probablement à l’arrivée du CRUD interactif).
