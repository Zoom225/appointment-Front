# Documentation Frontend — Gestion de rendez-vous

Ce document décrit la conception complète du frontend Angular, les choix d’architecture, les méthodes exploitées et les mécanismes UI/UX utilisés dans l’application de gestion de rendez-vous.

## 1. Vue d’ensemble

Le frontend est une application Angular moderne construite avec :

- Angular standalone components ;
- TypeScript ;
- Angular Router ;
- Signals ;
- Reactive Forms ;
- HttpClient ;
- interceptors HTTP ;
- guards de navigation ;
- CSS responsive ;
- thème clair / sombre global ;
- intégration avec une API REST Spring Boot sécurisée par JWT.

L’objectif principal du frontend est de fournir une interface claire, responsive et sécurisée pour gérer :

- l’authentification ;
- les rendez-vous ;
- les disponibilités ;
- les notifications ;
- le tableau de bord ;
- le profil utilisateur ;
- l’administration ;
- la documentation API Swagger.

## 2. Organisation du projet

```text
src/app
├── core
│   ├── api
│   ├── auth
│   ├── errors
│   ├── guards
│   ├── interceptors
│   ├── models
│   └── services
│
├── features
│   ├── admin
│   ├── appointments
│   ├── auth/login
│   ├── availability
│   ├── dashboard
│   ├── landing
│   ├── notifications
│   ├── profile
│   └── users
│
├── layouts
│   └── main-layout
│
├── shared
│   ├── components
│   └── services
│
├── app.config.ts
├── app.routes.ts
└── app.ts
```

Cette organisation sépare les responsabilités :

- `core` contient les briques techniques globales ;
- `features` contient les écrans métier ;
- `layouts` contient la structure commune après connexion ;
- `shared` contient les composants et services réutilisables.

## 3. Conception architecturale

### 3.1 Standalone Components

L’application utilise des composants standalone. Cela permet de réduire la dépendance aux modules Angular classiques et de rendre chaque écran plus autonome.

Exemples :

- `Landing`
- `Login`
- `Dashboard`
- `Appointments`
- `Notifications`
- `Availability`
- `Admin`
- `Users`

Chaque feature possède généralement :

```text
feature.ts
feature.html
feature.css
```

Cette approche facilite :

- la maintenance ;
- la lecture du code ;
- le découpage fonctionnel ;
- le lazy loading.

### 3.2 Routing

Le routing est centralisé dans :

```text
src/app/app.routes.ts
```

Les routes publiques incluent notamment :

- landing page ;
- login ;
- pages d’erreur.

Les routes privées sont protégées par des guards.

### 3.3 Layout principal

Après connexion, les pages privées utilisent un layout commun :

```text
src/app/layouts/main-layout
```

Il contient :

- menu latéral ;
- header ;
- bouton de déconnexion ;
- bouton thème clair / sombre ;
- zone de rendu des pages privées via `router-outlet`.

## 4. Gestion de l’état

L’application utilise principalement les Signals Angular pour gérer les états locaux et globaux.

Exemples :

- état de connexion ;
- utilisateur courant ;
- chargement global ;
- thème actif ;
- état des formulaires ;
- messages d’erreur ;
- données chargées depuis l’API.

Les Signals permettent :

- une mise à jour réactive immédiate ;
- une meilleure lisibilité ;
- moins de code impératif ;
- une gestion simple de l’état UI.

## 5. Authentification

L’authentification est gérée par :

```text
src/app/core/services/auth.ts
src/app/core/services/token-storage.ts
src/app/core/interceptors/auth.interceptor.ts
src/app/core/guards/auth.guard.ts
src/app/core/guards/guest.guard.ts
src/app/core/guards/role.guard.ts
```

### 5.1 Flux de connexion

```text
Utilisateur
↓
Formulaire login Angular
↓
POST /api/auth/login
↓
Réponse JWT
↓
Stockage du token
↓
Redirection vers dashboard
```

### 5.2 Stockage de session

Le token JWT et l’utilisateur courant sont stockés via un service dédié :

```text
TokenStorage
```

Ce service isole la logique de persistance pour éviter de disperser l’accès au stockage dans toute l’application.

### 5.3 Interceptor JWT

L’interceptor d’authentification ajoute automatiquement le header :

```http
Authorization: Bearer <token>
```

sur les requêtes API protégées.

Il évite de modifier chaque service API individuellement.

### 5.4 Guards

Les guards contrôlent l’accès aux routes :

- `authGuard` : bloque les utilisateurs non connectés ;
- `guestGuard` : empêche un utilisateur connecté de revenir sur la page login ;
- `roleGuard` : protège les pages réservées à certains rôles.

## 6. Communication avec l’API REST

Les endpoints sont centralisés dans :

```text
src/app/core/api/api-endpoints.ts
src/app/core/api/api.config.ts
```

Les services API dédiés sont :

- `appointments-api.ts`
- `notifications-api.ts`
- `profile-api.ts`
- `users-api.ts`
- `admin-api.ts`
- `auth.ts`

Cette séparation évite de mélanger logique UI et appels réseau.

Exemple de flux :

```text
Composant
↓
Service API
↓
HttpClient
↓
Interceptors
↓
Backend Spring Boot
```

## 7. Gestion du chargement global

Un loader global est géré par :

```text
src/app/core/services/loading.ts
src/app/core/interceptors/loading.interceptor.ts
```

Le principe :

- chaque requête API incrémente un compteur ;
- quand la requête se termine, le compteur est décrémenté ;
- tant que le compteur est supérieur à zéro, un spinner global est affiché.

Cela permet de couvrir toutes les requêtes HTTP sans ajouter manuellement un loader dans chaque composant.

## 8. Gestion des erreurs

La gestion des messages d’erreur est centralisée dans :

```text
src/app/core/errors/api-error.ts
```

Les erreurs importantes sont traduites en messages compréhensibles :

- `401` : identifiants incorrects ;
- `500` : erreur serveur ;
- `0` : serveur indisponible ou en démarrage ;
- timeout : connexion trop longue.

L’objectif est d’éviter d’afficher des erreurs techniques brutes à l’utilisateur.

## 9. Gestion du backend Render lent

Le backend étant hébergé sur Render, il peut être en veille.

Sur la page login :

- un état de chargement est affiché ;
- le bouton est désactivé ;
- un message discret apparaît si la connexion dure plus de quelques secondes ;
- le message disparaît automatiquement après succès ou erreur.

Cela améliore l’expérience utilisateur sur une offre gratuite Render.

## 10. Système de thème clair / sombre

Le thème est géré par :

```text
src/app/core/services/theme.ts
src/app/app.ts
src/styles.css
```

### 10.1 Principe

Le service de thème :

- stocke le thème actif dans un Signal ;
- expose l’état courant ;
- expose l’icône du bouton ;
- sauvegarde le choix dans `localStorage` ;
- restaure automatiquement le thème au prochain lancement.

Le composant racine applique une classe globale :

```text
light-theme
dark-theme
```

Cela permet au thème de s’appliquer à toute l’application.

### 10.2 Variables CSS

Le thème repose sur des variables globales :

```css
--background
--surface
--surface-secondary
--primary
--primary-hover
--text-primary
--text-secondary
--text-muted
--border-color
--shadow
--card-background
--input-background
--input-text
--input-border
--button-background
--button-text
```

Ces variables permettent de conserver un design cohérent sur :

- landing page ;
- login ;
- dashboard ;
- cartes ;
- formulaires ;
- badges ;
- tableaux ;
- menus ;
- pages d’erreur.

## 11. UI / UX

### 11.1 Landing page

La landing page présente :

- le projet ;
- la stack technique ;
- les accès de démonstration ;
- les liens GitHub ;
- le lien Swagger ;
- les principaux modules fonctionnels.

Elle est conçue comme une page portfolio orientée recruteur.

### 11.2 Login

La page login inclut :

- formulaire réactif ;
- validation email ;
- validation mot de passe ;
- accès démo ;
- spinner dans le bouton ;
- message Render ;
- erreurs utilisateur lisibles.

### 11.3 Pages privées

Les pages privées utilisent une structure cohérente :

- header de page ;
- cartes d’état ;
- panels ;
- listes ;
- boutons d’action ;
- messages d’erreur ;
- responsive mobile.

## 12. Accessibilité

Les choix d’accessibilité incluent :

- contraste élevé en mode clair et sombre ;
- focus visible sur boutons, liens et champs ;
- labels sur les formulaires ;
- états désactivés pour éviter les doubles clics ;
- textes d’erreur compréhensibles ;
- bouton thème avec `aria-label` ;
- loader global avec `role="status"` et `aria-live`.

## 13. Responsive design

Le design s’adapte aux écrans :

- desktop ;
- tablette ;
- mobile.

Les principales méthodes utilisées :

- `grid` ;
- `flexbox` ;
- `clamp()` ;
- media queries ;
- largeurs fluides ;
- cartes empilées sur mobile ;
- menu adapté aux petits écrans.

## 14. Méthodes exploitées

### 14.1 Séparation des responsabilités

Chaque couche a un rôle clair :

- composant : affichage et interactions ;
- service API : communication backend ;
- service métier : état global ;
- interceptor : traitement transversal ;
- guard : contrôle d’accès ;
- modèle : typage TypeScript.

### 14.2 Centralisation

Les éléments sensibles sont centralisés :

- endpoints API ;
- gestion des erreurs ;
- stockage du token ;
- thème ;
- loading global ;
- guards.

### 14.3 Typage fort

Les modèles TypeScript décrivent :

- utilisateurs ;
- rendez-vous ;
- notifications ;
- réponses API ;
- statistiques admin ;
- authentification.

Cela limite les erreurs et rend le code plus maintenable.

### 14.4 Progressive enhancement

L’interface reste utilisable même si :

- le backend démarre lentement ;
- une requête échoue ;
- aucun résultat n’est retourné ;
- l’utilisateur n’est pas authentifié.

## 15. Tests et vérifications

Scripts utiles :

```bash
npm run build
npm run typecheck
npm run typecheck:spec
npm test
```

Le build de production permet de vérifier :

- compilation TypeScript ;
- templates Angular ;
- styles ;
- budget CSS ;
- bundling.

## 16. Déploiement

Le frontend est prévu pour Vercel.

Configuration :

```text
vercel.json
```

Points importants :

- build Angular ;
- output `dist/frontend-rendez-vous/browser` ;
- rewrite vers `index.html` pour Angular Router ;
- backend Render appelé via l’URL configurée dans les environnements.

## 17. Résumé des choix techniques

| Sujet | Choix |
|---|---|
| Framework | Angular |
| Architecture | Standalone components + features |
| État UI | Signals |
| Formulaires | Reactive Forms |
| Navigation | Angular Router |
| Sécurité frontend | Guards + JWT interceptor |
| API | Services dédiés + endpoints centralisés |
| Loading | Interceptor global |
| Thème | ThemeService + variables CSS |
| Responsive | CSS Grid, Flexbox, media queries |
| Déploiement | Vercel |

## 18. Conclusion

Le frontend est conçu pour être clair, maintenable et évolutif.

Il sépare les responsabilités, centralise les éléments critiques et propose une interface responsive avec gestion complète de l’authentification, des appels API, des erreurs, du chargement global et du thème clair / sombre.

Cette conception permet d’ajouter de nouvelles fonctionnalités sans casser l’architecture existante.
