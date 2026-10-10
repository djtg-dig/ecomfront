# E-commerce Web

Frontend Next.js du portail E-commerce. Il utilise l’App Router et prépare un
Backend for Frontend (BFF) : le navigateur parlera aux Route Handlers Next.js,
et seuls les modules serveur contacteront Django.

## Prérequis

- Node.js 22 (ou une version LTS prise en charge par Next.js)
- npm 10+
- Le backend Django E-commerce disponible pour l’intégration future

## Installation

```bash
npm install
cp .env.example .env.local
npm run dev
```

Ouvrir `http://localhost:3000`.

## Commandes

```bash
npm run dev
npm run lint
npx tsc --noEmit
npm run build
```

## Architecture

- `src/app` contient les pages App Router, les groupes public et
  authentification, et accueillera les futures routes BFF sous `api`.
- `src/lib/api` est le point d’entrée serveur vers Django.
- `src/lib/auth` préparera les sessions HTTP-only et le renouvellement JWT.
- `src/lib/hmac` fixe le vocabulaire du contrat `Ecommerce-HMAC v1` existant.
- `src/lib/config/server.ts` lit les variables sensibles exclusivement côté
  serveur via `server-only`.

Les JWT ne seront ni dans `localStorage`, ni dans l’URL. Le secret HMAC reste
dans `ECOMMERCE_HMAC_SECRET`, sans préfixe `NEXT_PUBLIC_`; aucun Client
Component ne peut l’importer.

## Intégrations à venir

Le prochain lot connectera Carri Account, son callback, la consommation du
handoff, les cookies de session, le refresh JWT et la signature HMAC compatible
avec Django. Aucun de ces flux n’est simulé dans cette initialisation.
