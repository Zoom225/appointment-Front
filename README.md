# Frontend Rendez-vous

Frontend Angular pour l’application de gestion de rendez-vous.

## Stack

- Angular 22
- Standalone Components
- Signals
- Guards
- HTTP Interceptors
- Reactive Forms
- Backend Render : `https://appointment-backend-vab1.onrender.com/api`

## Prérequis

Angular CLI 22 exige une version Node compatible :

```bash
node >=24.15.0 <25
npm >=11 <12
```

La version locale `v24.13.0` ne suffit pas pour lancer `ng build`.

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

```bash
npm run typecheck
npm run typecheck:spec
```

## Build production

```bash
npm run build:production
```

Sortie attendue pour Vercel :

```text
dist/frontend-rendez-vous/browser
```

## Déploiement Vercel

Configuration présente dans `vercel.json` :

- installation : `npm ci`
- build : `npm run build:production`
- output : `dist/frontend-rendez-vous/browser`
- rewrite SPA vers `index.html`

## Configuration API

Les URLs API sont centralisées dans :

```text
src/environments/environment.ts
src/environments/environment.prod.ts
src/app/core/api/api-endpoints.ts
```

URL production actuelle :

```text
https://appointment-backend-vab1.onrender.com/api
```
