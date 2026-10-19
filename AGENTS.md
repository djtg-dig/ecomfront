# AGENTS.md — E-commerce Frontend

<!-- BEGIN:nextjs-agent-rules -->

**## This is NOT the Next.js you know**

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# 1. Présentation du projet

Ce dépôt contient le frontend d'une plateforme e-commerce multi-entreprises.

Technologies principales :

- Next.js 16 avec App Router.
- React et TypeScript.
- CSS et composants UI existants.
- Backend Django REST API.
- Carri Account comme fournisseur d'identité OAuth 2.0 / OpenID Connect.
- Cloudinary pour les médias.
- Architecture BFF (Backend for Frontend).

Répertoire frontend :

`/home/mubaraka/Documents/Entreprise/ecomfront`

Backend associé :

`/home/mubaraka/Documents/Entreprise/ecommerce`

L'agent doit respecter l'architecture existante et éviter les modifications non demandées dans les autres projets.

# 2. Règles générales de développement

Avant toute modification :

1. Lire les fichiers concernés.
2. Comprendre l'architecture et les conventions existantes.
3. Consulter la documentation Next.js locale pertinente dans `node_modules/next/dist/docs/`.
4. Identifier les dépendances et les impacts possibles.
5. Privilégier la solution la plus simple, robuste et maintenable.

Ne jamais supposer qu'une API Next.js fonctionne comme dans les anciennes versions.

Ne pas réécrire inutilement des composants fonctionnels.

Ne pas introduire de dépendances supplémentaires sans justification.

Ne pas modifier des fonctionnalités hors du périmètre demandé.

Ne pas supprimer du code ou des données sans comprendre leurs dépendances.

Préserver les modifications préexistantes dans le dépôt.

# 3. Architecture Next.js

Respecter les conventions App Router de la version installée.

Privilégier :

- Server Components lorsque cela est approprié.
- Client Components uniquement lorsque l'interactivité l'exige.
- Route Handlers pour les endpoints BFF.
- Composants réutilisables.
- Séparation des responsabilités.
- Typage TypeScript strict.
- Gestion explicite des erreurs.

Éviter les composants monolithiques et la duplication de logique métier.

Ne pas exposer directement au navigateur les secrets, les tokens internes ou les credentials backend.

Les opérations sensibles doivent passer par les mécanismes serveur existants.

# 4. Authentification et sécurité

Carri Account assure l'authentification OAuth/OIDC.

Respecter les mécanismes existants :

- Authorization Code Flow.
- PKCE.
- State.
- Nonce.
- JWT.
- HMAC.
- CSRF.
- Cookies HttpOnly.
- Gestion des sessions.
- Rafraîchissement des tokens.

Ne jamais désactiver une protection de sécurité pour masquer un dysfonctionnement.

Les communications HTTP locales ne sont acceptables que dans les conditions explicitement prévues pour le développement.

Les communications publiques en production doivent utiliser HTTPS.

Ne pas modifier Carri Account sans demande explicite.

Ne pas stocker les tokens sensibles dans `localStorage`.

Ne pas afficher les secrets dans les logs.

# 5. API et architecture BFF

Le frontend communique avec Django au moyen de l'architecture BFF existante.

Respecter :

- Les contrats API.
- Les méthodes HTTP.
- Les permissions.
- Les codes de statut.
- Les erreurs structurées.
- Les mécanismes de signature HMAC.
- Les contraintes multi-entreprises.

Ne pas inventer des champs ou des endpoints.

Ne pas contourner le BFF pour accéder directement aux endpoints privés Django depuis le navigateur.

Éviter les appels API répétés ou inutiles.

Utiliser les mécanismes de cache, d'invalidation et de rafraîchissement existants lorsqu'ils sont adaptés.

En cas d'erreur réseau, distinguer clairement les problèmes de session, d'autorisation, de validation et de disponibilité du service.

# 6. Isolation multi-entreprises

La plateforme est multi-entreprises.

Chaque opération métier doit respecter le contexte de l'entreprise sélectionnée.

Ne jamais utiliser un identifiant d'entreprise provenant du navigateur comme preuve suffisante d'autorisation.

Les permissions doivent être vérifiées par le backend.

Ne pas mélanger les données de deux entreprises.

Les caches contenant des données privées doivent être correctement isolés par utilisateur et entreprise.

Ne pas exposer les données privées dans les pages publiques ou dans les métadonnées SEO.

# 7. SEO — Référencement naturel

Le SEO est obligatoire pour les pages publiques pertinentes.

Lors de la création ou de la modification d'une page publique, examiner systématiquement :

- Le titre HTML.
- La meta description.
- Les métadonnées Open Graph.
- Les métadonnées Twitter/X.
- L'URL canonique.
- Les balises sémantiques HTML.
- La hiérarchie des titres H1, H2 et H3.
- Les textes alternatifs des images.
- Le maillage interne.
- L'indexabilité.
- Les données structurées Schema.org lorsque pertinentes.

Utiliser les APIs Metadata de la version Next.js installée.

Éviter les titres génériques tels que « Page » ou « Accueil ».

Chaque page publique indexable doit avoir un titre descriptif et une description pertinente.

## 7.1 Pages produits

Pour les pages produits publiques :

- Générer des métadonnées adaptées au produit.
- Inclure le nom du produit dans le titre.
- Utiliser une description pertinente et non trompeuse.
- Définir une URL canonique stable.
- Prévoir les métadonnées de partage social.
- Utiliser les données structurées `Product` lorsque les informations sont fiables et suffisantes.
- Ne pas inventer les prix, la disponibilité, les évaluations ou les avis.

## 7.2 Pages entreprises

Pour les vitrines publiques des entreprises :

- Utiliser le nom réel de l'entreprise.
- Fournir une description pertinente.
- Utiliser une image de partage lorsque disponible.
- Définir une URL canonique.
- Employer des données structurées appropriées si elles sont justifiées.

## 7.3 Pages privées

Les pages suivantes ne doivent pas être indexées :

- Connexion et callbacks OAuth.
- Espace utilisateur.
- Tableaux de bord privés.
- Gestion des entreprises.
- Stocks.
- Achats et ventes privés.
- Finances.
- Paramètres.
- Pages contenant des données personnelles ou confidentielles.

Utiliser `noindex` lorsque nécessaire.

Ne pas inclure ces pages dans le sitemap public.

Ne jamais exposer de données privées dans des métadonnées.

## 7.4 Sitemap et robots

Maintenir les fichiers `sitemap` et `robots` conformément aux conventions Next.js.

Inclure uniquement les pages publiques pertinentes.

Éviter les URL privées, temporaires ou invalides.

Ne pas considérer `robots.txt` comme un mécanisme de protection des données privées.

# 8. Performance

Optimiser les performances sans sacrifier la maintenabilité.

Éviter :

- Les appels API redondants.
- Les boucles de rendu.
- Les effets React inutiles.
- Les chargements bloquants évitables.
- Les dépendances lourdes non justifiées.
- Les images inutilement volumineuses.

Utiliser les mécanismes Next.js adaptés aux images, au rendu et au cache.

Ne jamais mettre en cache publiquement des données privées.

Évaluer l'impact des changements sur les Core Web Vitals.

# 9. Responsive et accessibilité

Toute interface doit fonctionner sur ordinateur, tablette et smartphone.

Prendre en compte les appareils peu performants et les connexions Internet lentes.

Respecter :

- Le responsive design.
- La navigation au clavier.
- Les libellés accessibles.
- Les contrastes.
- Les états de focus.
- Les messages d'erreur compréhensibles.
- Les états de chargement.
- Les tailles de zones tactiles adaptées.

Ne pas considérer une interface comme fonctionnelle uniquement parce qu'elle compile.

Tester les comportements interactifs lorsque les outils nécessaires sont disponibles.

# 10. Images et vidéos

Les médias produits sont gérés par le backend et Cloudinary.

Respecter les validations serveur.

Ne pas imposer arbitrairement une résolution vidéo minimale qui exclurait les smartphones anciens.

Conserver les contrôles de taille, durée, format et validité des fichiers prévus par le backend.

Afficher les états de téléversement et les erreurs.

Ne jamais annoncer un upload réussi avant confirmation du serveur.

Ne pas exposer les identifiants Cloudinary.

Ne pas supprimer des médias existants sans autorisation.

# 11. Documentation du code

Le code doit être lisible et compréhensible par un autre développeur.

## 11.1 Commentaires

Ajouter des commentaires lorsqu'ils expliquent :

- Une règle métier complexe.
- Une décision architecturale non évidente.
- Une contrainte de sécurité.
- Un comportement particulier.
- Une limitation technique importante.

Ne pas commenter inutilement chaque ligne.

Éviter les commentaires qui répètent simplement le code.

## 11.2 TypeScript

Utiliser des noms explicites pour les variables, fonctions, composants et types.

Documenter les fonctions complexes avec TSDoc lorsque cela apporte une réelle valeur.

Exemple :

```ts
/**
 * Détermine si l'utilisateur peut accéder à une fonctionnalité
 * dans le contexte de l'entreprise active.
 *
 * Cette vérification côté frontend ne remplace pas
 * l'autorisation effectuée par Django.
 */
```

Éviter `any` lorsque des types précis peuvent être définis.

## 11.3 Documentation fonctionnelle

Lorsqu'une fonctionnalité importante est créée ou substantiellement modifiée, mettre à jour la documentation pertinente si elle existe.

Documenter notamment :

- Le fonctionnement général.
- Les prérequis.
- Les variables d'environnement ajoutées.
- Les contrats API concernés.
- Les contraintes de sécurité.
- Les procédures de test.

Ne pas créer de documentation redondante ou inutile.

Ne pas introduire de secrets dans les fichiers Markdown.

# 12. Gestion des erreurs

Toute opération utilisateur importante doit fournir un retour clair.

Prévoir, selon le cas :

- État initial.
- Chargement.
- Succès.
- Erreur.
- Possibilité de réessayer.

Ne pas masquer silencieusement les erreurs.

Ne pas afficher les détails techniques sensibles aux utilisateurs finaux.

Conserver les informations nécessaires au diagnostic dans les logs serveur, sans divulguer les secrets.

Ne pas confondre une erreur de validation avec une indisponibilité réseau.

# 13. Tests et validation

Toute correction doit être accompagnée de tests adaptés à son périmètre.

Vérifier notamment :

- Le comportement attendu.
- Les cas limites.
- Les erreurs.
- Les permissions.
- Les régressions potentielles.

Utiliser les outils de test déjà présents dans le projet.

Exécuter les commandes pertinentes, notamment :

```bash
npx tsc --noEmit
npm run lint
npm test
npm run build
git diff --check
```

Adapter les commandes aux scripts réellement disponibles.

Si une commande échoue à cause d'un problème préexistant, le signaler distinctement.

Ne pas affirmer qu'un test a réussi s'il n'a pas été exécuté.

Pour les fonctionnalités visuelles ou interactives, privilégier des tests navigateur lorsque l'environnement le permet.

Les tests unitaires ne remplacent pas la validation réelle d'un parcours utilisateur.

# 14. Git et messages de commit

## 14.1 Règle obligatoire

Après chaque intervention comportant des modifications, proposer au moins un message de commit pertinent.

Ne jamais exécuter automatiquement :

- `git commit`
- `git push`
- `git reset --hard`
- `git clean -fd`
- Toute opération Git destructive

Sans autorisation explicite.

Ne pas inclure des modifications sans rapport dans un commit proposé.

## 14.2 Convention Conventional Commits

Utiliser le format :

`type(scope): description`

Types autorisés :

- `feat` : nouvelle fonctionnalité.
- `fix` : correction de bug.
- `refactor` : restructuration sans changement fonctionnel.
- `perf` : amélioration des performances.
- `docs` : documentation.
- `test` : tests.
- `style` : formatage sans changement de comportement.
- `chore` : maintenance.
- `build` : système de compilation.
- `ci` : intégration et déploiement continus.
- `security` : correction de sécurité, si cette convention est adoptée par le dépôt.

Préférer des scopes précis :

- `auth`
- `catalog`
- `products`
- `media`
- `businesses`
- `dashboard`
- `navigation`
- `seo`
- `api`
- `bff`
- `ui`
- `config`

Rédiger les messages de commit en anglais, de façon concise et explicite.

Exemples :

```text
feat(products): add product video gallery
fix(auth): restore local OAuth login
fix(media): allow product videos at any resolution
fix(navigation): keep private header visible on scroll
feat(seo): add dynamic product metadata
perf(catalog): reduce redundant product requests
docs(auth): document OAuth callback flow
test(media): cover video upload validation
```

## 14.3 Plusieurs changements indépendants

Si une intervention contient plusieurs modifications indépendantes, proposer plusieurs commits logiques.

Ne pas regrouper artificiellement des changements sans rapport.

Si le backend et le frontend sont dans des dépôts Git différents, proposer les commits séparément.

# 15. Rapport obligatoire après intervention

Après chaque tâche, fournir un rapport concis et structuré comprenant :

1. **Diagnostic** : problème identifié ou besoin traité.
2. **Modifications** : changements réalisés.
3. **Fichiers** : fichiers créés ou modifiés.
4. **Tests** : commandes exécutées et résultats.
5. **Limites** : éléments non vérifiés ou problèmes restants.
6. **Commit proposé** : message Conventional Commit.

Ne jamais déclarer un problème résolu uniquement parce que le code compile.

Distinguer clairement :

- Ce qui a été observé.
- Ce qui a été corrigé.
- Ce qui a été testé.
- Ce qui reste à vérifier.

# 16. Restrictions opérationnelles

Sauf demande explicite :

- Ne pas modifier Carri Account.
- Ne pas modifier Kisinet.
- Ne pas modifier les fichiers secrets.
- Ne pas changer les mécanismes d'authentification.
- Ne pas supprimer les données existantes.
- Ne pas appliquer de migrations.
- Ne pas exécuter de commandes destructives.
- Ne pas effectuer d'uploads réels vers des services externes.
- Ne pas effectuer de commit ou de push.

Toute intervention doit préserver la compatibilité avec le backend Django existant.

# 17. Priorités de qualité

Lorsqu'il existe plusieurs solutions possibles, privilégier dans cet ordre :

1. Sécurité et intégrité des données.
2. Correction fonctionnelle.
3. Compatibilité avec l'architecture existante.
4. Expérience utilisateur et accessibilité.
5. Performance.
6. Maintenabilité.
7. Simplicité du code.
8. Référencement SEO pour les pages publiques pertinentes.

Le code doit être adapté à une plateforme e-commerce destinée à fonctionner en production, et non uniquement à une démonstration locale.