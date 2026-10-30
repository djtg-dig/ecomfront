# Optimisation des performances E-commerce

Date : 30 octobre 2026  
Périmètre : `ecommerce/backend` et `ecomfront`

## Résumé

Les corrections portent sur les goulots confirmés par l'audit HMAC : la sélection publique non bornée, le chargement catalogue après hydratation et les connexions PostgreSQL de développement. HMAC, OAuth, CSRF, session chiffrée, permissions et isolation par entreprise restent inchangés.

## Problèmes confirmés

| Problème | Preuve | Correction |
|---|---|---|
| Accueil public non borné | `PublicHomeProductsView` matérialisait tous les produits puis en gardait 100 | Limitation SQL à 100 avant préchargement et sérialisation |
| Pages publiques après hydratation | Accueil, recherche, catégorie, boutique et détail utilisaient `useEffect` | Chargement initial dans les Server Components |
| Pagination affichée incomplète | Les résultats publics n'avaient pas de navigation de pages | Liens précédent/suivant qui préservent les paramètres URL |
| Connexions développement | Django utilisait `CONN_MAX_AGE=0` par défaut | Connexions persistantes 60 s + contrôles de santé, uniquement en développement |

## Corrections effectuées

### Backend

- `PublicHomeProductsView` applique maintenant `LIMIT 100` avant la conversion en liste et le `prefetch_related` des images.
- L'ordre reste déterministe : catégorie, boutique puis identifiant public.
- L'accueil retourne des pages de 20, avec `next` et `previous`, sans dépasser la sélection de 100.
- Les pages invalides sont refusées par 404 au lieu de provoquer une conversion entière invalide.
- Les settings de développement configurent `CONN_MAX_AGE=60` par défaut, surchargable par `ECOMMERCE_DEV_DB_CONN_MAX_AGE`, et `CONN_HEALTH_CHECKS=True`.

La production n'a pas été modifiée : sa valeur doit rester explicitement définie selon workers, instances, plafond PostgreSQL et pooler éventuel.

### Frontend

- Les pages publiques demandent directement Django depuis un Server Component via le BFF serveur existant; le navigateur ne doit plus attendre l'hydratation pour la première liste ou le premier produit.
- Les composants clients conservent la recherche de suggestions, le panier et l'interactivité existante.
- Le normaliseur `loadPublicCatalogPage` préserve les deux contrats Django existants : listes directes (`results: []`) et listes catégorie/boutique (`results: { products: [] }`). Aucun contrat backend n'a été changé.
- La réponse BFF publique reste nécessaire pour les suggestions navigateur. La généralisation du pass-through JSON a été différée : les Route Handlers privés transforment des erreurs, persistent parfois une session et doivent conserver leur contrat.

## Fichiers modifiés

### Backend

- `backend/apps/catalog/views.py`
- `backend/apps/catalog/tests/test_public_catalog.py`
- `backend/config/settings/development.py`

### Frontend

- `src/lib/api/public-catalog.ts`
- `src/components/public/marketplace.tsx`
- `src/components/public/product-page.tsx`
- `src/components/public/public-page-content.tsx`
- pages publiques accueil, recherche, catégories, boutiques et produit
- `tests/public-catalog.test.ts`

## Contrats API

Le contrat de recherche, catégorie, boutique, détail et catalogue privé n'est pas modifié.

L'accueil public garde les champs `count`, `next` et `results`; il ajoute `previous`, déjà conforme à la convention DRF utilisée ailleurs. Sa sélection reste plafonnée à 100 et est maintenant exécutée avant matérialisation des objets.

## Mesures avant/après

| Scénario | Avant | Après | Gain | Statut |
|---|---|---|---|---|
| Accueil marketplace HTTP | Non mesuré | Non mesuré | Non mesuré | Serveur HTTP indisponible |
| Recherche produits HTTP | Non mesuré | Non mesuré | Non mesuré | Serveur HTTP indisponible |
| Fiche produit HTTP | Non mesuré | Non mesuré | Non mesuré | Serveur HTTP indisponible |
| Catalogue privé HTTP | Non mesuré | Non mesuré | Non mesuré | Serveur HTTP indisponible |
| Temps BFF/Django/SQL | Non mesuré | Non mesuré | Non mesuré | Instrumentation corrélée non activée |
| Connexion PostgreSQL développement | Non mesuré | Non mesuré | Non mesuré | Configuration appliquée, serveur HTTP absent |

La réduction algorithmique de l'accueil est vérifiée par le code et le test : au-delà de 100 produits publics éligibles, il ne lit/sérialise que les 100 premiers de l'ordre déterministe, puis transmet 20 produits par page. Aucun gain chiffré n'est annoncé sans scénario HTTP identique.

## Tests exécutés

Frontend :

```text
npx tsc --noEmit
npx vitest run tests/public-catalog.test.ts tests/product-catalog.test.ts tests/backend-client.test.ts tests/product-routes.test.ts
npm run build
git diff --check
```

Résultats : typage réussi, 39 tests réussis, build Next.js réussi et diff valide.

La suite complète `npm test` a aussi été exécutée : 304 tests réussis, 2 ignorés et 6 échecs. Les échecs concernent des assertions existantes hors périmètre dans `tests/auth-routes.test.ts`, `tests/inventory-manager.test.ts` et `tests/site-footer.test.ts`; aucun ne cible le catalogue public modifié. Ils ne sont pas présentés comme réussis.

Backend :

```text
../env/bin/python manage.py check
../env/bin/python manage.py makemigrations --check --dry-run
../env/bin/python -m pytest apps/catalog/tests/test_public_catalog.py -q -p no:cacheprovider
```

Résultats : contrôle Django réussi, aucune migration à créer et 3 tests réussis.

## Risques et limites

- La nouvelle sélection d'accueil est déterministe mais ne reproduit plus l'ancien round-robin global. Elle évite volontairement de charger un catalogue entier; la diversité reste d'abord portée par l'ordre catégorie/boutique.
- Les pages publiques sont rendues au moment de la requête car le client backend existant utilise `no-store`. Une stratégie de cache public devra être ajoutée séparément après validation de la politique HMAC et de l'invalidation catalogue.
- Aucun plan `EXPLAIN`, benchmark HTTP, p95 ou mesure réseau n'a été possible faute de services accessibles.
- Les connexions persistantes ne sont activées qu'en développement. La production doit définir une valeur selon sa capacité et son pooler.
- Les optimisations BFF JSON privées et les agrégations d'écrans privés exigent une mesure corrélée avant généralisation.

## Recommandations suivantes

1. Activer l'instrumentation de corrélation décrite dans `hmac-performance-comparison.md` en développement.
2. Rejouer au moins 30 requêtes par scénario, avec échauffement, médiane et p95.
3. Mesurer les recherches `icontains` avec `EXPLAIN (ANALYZE, BUFFERS)` avant de proposer un index.
4. Définir le cache public Next.js/CDN et l'invalidation après publication ou modification d'un produit.
5. Évaluer des endpoints agrégés pour les écrans privés uniquement après avoir identifié les appels parallèles dominants.
