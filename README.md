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

## BFF et HMAC

Les appels sensibles suivent ce flux : navigateur → Route Handler Next.js →
Django. Les Route Handlers choisiront explicitement les opérations exposées; le
client `backendClient` n’est pas un proxy générique et refuse toute cible hors
de `/api/v1/`.

`src/lib/hmac/signing.ts` applique exactement `Ecommerce-HMAC v1` avec le
module `node:crypto`: corps brut SHA-256, query décodée/triée/réencodée,
timestamp Unix, nonce UUID et HMAC-SHA256 hexadécimal. Le secret et la signature
ne sont jamais journalisés. Exemple conceptuel de chaîne signée :

```text
v1
ecommerce-web
<timestamp>
<nonce>
POST
/api/v1/auth/carri/handoff/consume/
<sha256-du-corps>
```

Variables serveur requises :

```text
DJANGO_BACKEND_URL=http://localhost:8000
ECOMMERCE_HMAC_CLIENT_ID=ecommerce-web
ECOMMERCE_HMAC_SECRET=<secret-serveur>
```

`NEXT_PUBLIC_FRONTEND_URL` est public; les trois variables ci-dessus, et en
particulier le secret, restent dans `.env.local` et ne doivent jamais utiliser
le préfixe `NEXT_PUBLIC_`.

Le client désactive le cache, omet les cookies du navigateur, accepte un JWT
uniquement lorsqu’un Route Handler le fournit explicitement, et normalise les
erreurs Django `{code, detail}` sans propager de détail réseau interne.

## Tests locaux

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

Les vecteurs documentés par Django sont testés sans secret réel. Pour vérifier
l’intégration locale avec Django démarré, exporter temporairement
`RUN_DJANGO_HMAC_INTEGRATION=true` avec les trois variables serveur, puis lancer
`npm test`. Le test envoie un handoff volontairement invalide: `400` prouve que
HMAC a passé; la requête directe non signée doit retourner `401`.

## SEO public

Les pages publiques sont rendues côté serveur par l'App Router : `/`,
`/fonctionnalites`, `/tarifs` et `/contact`. Elles utilisent la Metadata API de
Next.js (titre, description, canonical absolue, Open Graph et Twitter Card) et
ne contiennent que des informations confirmées. Les tarifs et coordonnées qui
ne sont pas encore validés restent explicitement absents.

`NEXT_PUBLIC_FRONTEND_URL` contient l'URL publique réelle du site et sert de
base aux canonical, à `robots.txt` et à `sitemap.xml`. Elle peut rester
`http://localhost:3000` en local; aucun domaine de production n'est fourni par
défaut.

L'indexation est volontairement désactivée tant que ces trois conditions ne
sont pas satisfaites : build de production, URL HTTPS non locale et
`SEO_ALLOW_INDEXING=true`. En local et en préproduction, les métadonnées
utilisent `noindex, nofollow`, `robots.txt` interdit l'exploration et le
sitemap est vide. Avant une mise en production, définir l'URL publique réelle,
activer explicitement cette variable, puis vérifier les canonical, les balises
Open Graph, `/robots.txt` et `/sitemap.xml` sur l'environnement déployé.

`/connexion` et les futurs callbacks OAuth restent `noindex` grâce au groupe
`(auth)`. Les futures pages authentifiées doivent être créées sous le groupe
`(private)`, qui applique la même règle. Les routes API et callbacks sont aussi
exclus de `robots.txt` une fois l'indexation activée. Ils ne figurent jamais
dans le sitemap. Ces directives ne protègent pas les données : les pages
privées et les endpoints doivent conserver leur authentification et leurs
autorisations côté serveur.
