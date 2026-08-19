# Gestion de rendez-vous — Application Full Stack

Application web Full Stack de gestion de rendez-vous développée avec **Angular** pour le frontend et **Spring Boot** pour le backend.

Ce projet a été conçu comme un projet portfolio afin de mettre en pratique une architecture frontend/backend séparée, une API REST sécurisée par JWT, la gestion des rendez-vous et disponibilités ainsi qu'un déploiement complet en production.

## Démo en ligne

| Service | Hébergement |
|---|---|
| Frontend | Vercel |
| Backend | Render |
| API | Spring Boot REST |
| Base de données | PostgreSQL |

### Liens

Frontend :

`https://gestion-de-rendez-vous.vercel.app`

Backend :

`https://appointment-backend-vab1.onrender.com`

API :

`https://appointment-backend-vab1.onrender.com/api`

Swagger :

`https://appointment-backend-vab1.onrender.com/swagger-ui/index.html`

> Le backend est hébergé sur Render. Sur une instance gratuite, le premier appel peut prendre quelques secondes lorsque le serveur sort de veille.

---

## Fonctionnalités

L'application permet notamment :

- authentification sécurisée ;
- gestion d'une session JWT ;
- protection des routes Angular ;
- tableau de bord utilisateur ;
- consultation des rendez-vous ;
- création d'un rendez-vous ;
- modification d'un rendez-vous ;
- annulation d'un rendez-vous ;
- historique et gestion des statuts ;
- recherche des créneaux disponibles ;
- consultation des notifications ;
- marquage des notifications comme lues ;
- consultation du profil utilisateur ;
- déconnexion sécurisée ;
- interface responsive.

---

## Technologies

### Frontend

- Angular 22
- TypeScript
- Standalone Components
- Signals
- Reactive Forms
- Angular Router
- Route Guards
- HTTP Interceptors
- JWT
- HTML
- CSS

### Backend

- Java
- Spring Boot
- Spring Web
- Spring Data JPA
- Spring Security
- JWT
- Bean Validation
- API REST
- PostgreSQL
- OpenAPI / Swagger

### Déploiement

- Frontend : Vercel
- Backend : Render
- Base de données : PostgreSQL

---

## Architecture frontend

```text
src/app
├── core
│   ├── api
│   ├── errors
│   ├── guards
│   ├── interceptors
│   ├── models
│   └── services
│
├── features
│   ├── appointments
│   ├── auth
│   ├── availability
│   ├── dashboard
│   ├── notifications
│   ├── profile
│   └── users
│
├── layouts
├── shared
├── app.config.ts
└── app.routes.ts
```

Cette organisation sépare les responsabilités de l'application.

**core** contient les éléments techniques utilisés globalement par l'application, notamment les services, modèles, guards et interceptors.

**features** contient les différentes fonctionnalités métier.

**layouts** contient la structure générale de l'interface.

**shared** contient les composants et éléments réutilisables.

---

## Communication Frontend / Backend

Le frontend Angular communique avec le backend Spring Boot à travers une **API REST**.

Exemple :

```text
Angular
   ↓
HttpClient
   ↓
JWT Interceptor
   ↓
Authorization: Bearer <token>
   ↓
API REST Spring Boot
   ↓
Spring Security
   ↓
Services métier
   ↓
Spring Data JPA
   ↓
PostgreSQL
```

Les URLs de l'API sont centralisées dans :

```text
src/environments/environment.ts
src/environments/environment.prod.ts
src/app/core/api/api-endpoints.ts
```

API de production :

```text
https://appointment-backend-vab1.onrender.com/api
```

---

## Authentification et sécurité

L'authentification repose sur **JWT** et **Spring Security**.

Flux simplifié :

```text
Utilisateur
    ↓
Formulaire Angular
    ↓
POST /api/auth/login
    ↓
Spring Security
    ↓
JWT
    ↓
Frontend Angular
    ↓
Stockage de la session
    ↓
HTTP Interceptor
    ↓
Authorization: Bearer <token>
```

Les routes privées du frontend sont protégées par des **Angular Guards**.

L'autorisation réelle des ressources reste contrôlée côté backend par **Spring Security**.

---

## API

### Authentification

```http
POST /api/auth/login
```

### Rendez-vous

```http
POST /api/appointments
PATCH /api/appointments/{id}
```

Les autres endpoints disponibles peuvent être consultés directement dans Swagger.

---

## Prérequis

Le projet utilise Angular 22.

```text
Node >= 24.15.0 < 25
npm >= 11 < 12
```

Vérification :

```bash
node -v
npm -v
```

---

## Installation

Cloner le dépôt :

```bash
git clone <URL_DU_REPOSITORY>
```

Entrer dans le projet :

```bash
cd frontend-rendez-vous
```

Installer les dépendances :

```bash
npm ci
```

---

## Lancement en développement

```bash
npm start
```

L'application est ensuite accessible sur :

```text
http://localhost:4200
```

---

## Tests et vérifications

### TypeScript

```bash
npm run typecheck
```

### Tests TypeScript

```bash
npm run typecheck:spec
```

### Tests Angular

```bash
npm test -- --watch=false
```

Le projet possède des tests automatisés permettant de vérifier plusieurs composants et services du frontend.

---

## Build de production

```bash
npm run build:production
```

Sortie :

```text
dist/frontend-rendez-vous/browser
```

---

## Déploiement Vercel

Le frontend est automatiquement construit et déployé sur Vercel.

Configuration principale :

```json
{
  "installCommand": "npm ci",
  "buildCommand": "npm run build:production",
  "outputDirectory": "dist/frontend-rendez-vous/browser"
}
```

Une règle de réécriture SPA permet à Angular Router de gérer correctement les routes lors d'un accès direct à une URL.

---

## Gestion des erreurs et performances

Le frontend gère notamment :

- les erreurs provenant de l'API ;
- les états de chargement ;
- les erreurs d'authentification ;
- les réponses lentes du backend ;
- l'expiration ou l'absence d'une session valide.

Le backend Render pouvant entrer en veille, l'interface affiche un état de chargement pendant son redémarrage.

---

## État du projet

- Frontend développé
- Backend développé
- Authentification JWT opérationnelle
- API REST connectée
- PostgreSQL connecté
- Tests frontend opérationnels
- Backend déployé
- Frontend déployé
- Application accessible en production

---

## Objectif du projet

Ce projet démontre la mise en œuvre d'une application Full Stack moderne avec :

- séparation frontend/backend ;
- architecture structurée ;
- API REST ;
- authentification JWT ;
- Spring Security ;
- persistance PostgreSQL ;
- Angular ;
- tests automatisés ;
- déploiement cloud.

Il constitue un projet de démonstration destiné à présenter mes compétences en développement **Java / Spring Boot / Angular**.
