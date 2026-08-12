# Gestion de rendez-vous — Frontend Angular

Frontend Angular moderne pour une application full stack de gestion de rendez-vous.

Application pensée comme projet portfolio : authentification sécurisée, interface SaaS responsive, gestion des rendez-vous, disponibilités, notifications et profil utilisateur.

## Démo

- Frontend Vercel : `https://appointment-front-gilt.vercel.app`
- Backend Render : `https://appointment-backend-vab1.onrender.com`
- API base URL : `https://appointment-backend-vab1.onrender.com/api`

## Stack technique

- Angular 22
- TypeScript
- Standalone Components
- Signals
- Reactive Forms
- Angular Router
- Guards
- HTTP Interceptors
- JWT Bearer Token
- API REST Spring Boot
- Déploiement Vercel

## Fonctionnalités

- Connexion avec compte recruteur de démonstration
- Gestion de session JWT
- Protection des routes avec guards
- Injection automatique du token via interceptor HTTP
- Tableau de bord
- Création de rendez-vous
- Modification de rendez-vous
- Annulation de rendez-vous
- Historique avec statuts
- Recherche de disponibilités backend
- Notifications
- Profil utilisateur
- Déconnexion
- Interface responsive desktop, tablette et mobile

## Architecture

```text
src/app
├── core
│   ├── api
│   ├── errors
│   ├── guards
│   ├── interceptors
│   ├── models
│   └── services
├── features
│   ├── appointments
│   ├── auth
│   ├── availability
│   ├── dashboard
│   ├── notifications
│   ├── profile
│   └── users
├── layouts
├── shared
├── app.config.ts
└── app.routes.ts
```

## Prérequis

Le projet utilise Angular 22. La version Node doit respecter les contraintes du projet :

```bash
node >=24.15.0 <25
npm >=11 <12
```

La version Node `v24.13.0` est insuffisante pour lancer Angular CLI 22.

## Installation

```bash
npm ci
```

## Développement local

```bash
npm start
```

Application locale :

```text
http://localhost:4200
```

## Vérifications

Typecheck application :

```bash
npm run typecheck
```

Typecheck des tests :

```bash
npm run typecheck:spec
```

Tests Angular :

```bash
npm test -- --watch=false
```

## Build production

```bash
npm run build:production
```

Sortie attendue :

```text
dist/frontend-rendez-vous/browser
```

## Déploiement Vercel

La configuration Vercel est définie dans `vercel.json` :

```json
{
  "installCommand": "npm ci",
  "buildCommand": "npm run build:production",
  "outputDirectory": "dist/frontend-rendez-vous/browser"
}
```

Une rewrite SPA redirige les routes Angular vers `index.html`.

## Configuration API

Les URLs API sont centralisées dans :

```text
src/environments/environment.ts
src/environments/environment.prod.ts
src/app/core/api/api-endpoints.ts
```

Backend production :

```text
https://appointment-backend-vab1.onrender.com/api
```

Endpoint de connexion :

```text
POST /api/auth/login
```

Endpoint rendez-vous :

```text
POST /api/appointments
PATCH /api/appointments/{id}
```

## Notes techniques

- Le backend Render peut être lent au premier appel si l’instance gratuite est en veille.
- Le frontend affiche un état de chargement et un message adapté lors d’un réveil lent du serveur.
- Les valeurs techniques des statuts backend sont conservées côté API.
- Les libellés affichés à l’utilisateur sont traduits en français.

## Sécurité

- Authentification JWT côté backend Spring Security.
- Token stocké côté frontend après connexion.
- Header `Authorization: Bearer <token>` ajouté via interceptor HTTP.
- Routes privées protégées par guard Angular.

## Commandes utiles

```bash
npm ci
npm start
npm run typecheck
npm run typecheck:spec
npm test -- --watch=false
npm run build:production
```
