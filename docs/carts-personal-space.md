# Paniers personnels

Les paniers acheteur sont accessibles dans l’espace authentifié :

- `/compte/paniers` : liste paginée, recherche et filtres.
- `/compte/paniers/[reference]` : détail et actions sur un panier `DRAFT`.

`/paniers` est conservée comme route historique et redirige vers `/compte/paniers`. Seuls les paramètres de navigation `search`, `business`, `status` et `page` sont conservés.

Ces pages utilisent exclusivement le BFF `/api/private/carts/`, qui délègue les autorisations et la propriété des paniers à Django. Les paniers `LOCKED` restent en lecture seule.
