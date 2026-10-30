# Audit comparatif HMAC et performances HTTP

Date de l'audit : 30 octobre 2026  
Périmètre : Kisinet (`kisinetback`, `kisinetweb`) et Carri Business E-commerce (`ecommerce/backend`, `ecomfront`)  
Nature des résultats : inspection du code, tests ciblés et microbenchmarks cryptographiques locaux. Aucun benchmark HTTP applicatif n'a pu être exécuté, car les quatre services et PostgreSQL étaient arrêtés.

## 1. Résumé exécutif

HMAC n'est pas une cause démontrée de la lenteur perçue d'E-commerce. Les deux applications utilisent le même principe cryptographique : SHA-256 du corps, requête canonique v1, puis HMAC-SHA256 hexadécimal. Le coût cryptographique pur mesuré localement est de l'ordre de quelques microsecondes par signature ou vérification synthétique ; cela ne permet pas de calculer sa part dans une requête HTTP réelle, mais rend peu crédible une lenteur perceptible due au calcul HMAC seul.

Le code révèle au contraire trois différences majeures :

1. E-commerce signe tous les appels Next.js vers Django, mais Django ne vérifie par défaut HMAC que sur `/api/v1/auth/carri/handoff/consume/`. Les routes publiques, catalogue et métier ordinaires ne font donc aucune validation HMAC. Kisinet protège par défaut tout `/api/` et fait davantage d'opérations HMAC par requête normale.
2. Le catalogue d'accueil E-commerce charge en mémoire **tous** les produits publics éligibles, avec leurs images préchargées, les trie, les répartit en groupes, puis n'en renvoie que 20 sur un maximum de 100. Son coût croît avec tout le catalogue. C'est un goulot confirmé par le code.
3. La marketplace E-commerce charge ses données dans des `useEffect` après l'hydratation. L'utilisateur reçoit d'abord un écran de chargement, puis le navigateur appelle le BFF, qui appelle Django. Les pages publiques comparables de Kisinet chargent les données dans un Server Component et utilisent le cache Next.js avec revalidation. Cet écart explique directement une partie de la différence de vitesse **perçue**.

Deux autres écarts peuvent ajouter de la latence, sans mesure HTTP permettant encore de quantifier leur part :

- E-commerce n'active pas `CONN_MAX_AGE`; Django utilise donc sa valeur par défaut de 0 et ferme la connexion PostgreSQL à la fin de chaque requête. Kisinet configure 60 secondes hors tests.
- Le BFF E-commerce parse le JSON Django puis le sérialise de nouveau dans ses Route Handlers. Le BFF générique Kisinet transmet en flux les réponses réussies.

Conclusion : Kisinet effectue plus de contrôles HMAC sur une requête API ordinaire, mais son chemin public est mieux placé dans le rendu serveur et le cache. La cause la plus solide de l'écart observé se trouve dans le chemin de données, les requêtes catalogue, le rendu client et possiblement les connexions PostgreSQL, pas dans HMAC.

## 2. Méthode et niveau de preuve

Les constats utilisent les catégories suivantes :

- **Confirmé par le code** : comportement directement déterminé par le code et les valeurs par défaut versionnées.
- **Mesuré localement** : résultat effectivement obtenu pendant cet audit.
- **Hypothèse à mesurer** : effet plausible dont l'amplitude dépend de l'environnement, des données ou du réseau.
- **Non mesuré** : aucun chiffre ne doit en être déduit.

Répertoires identifiés :

- backend Kisinet : `/home/mubaraka/Documents/Entreprise/kisinetback`;
- frontend Kisinet : `/home/mubaraka/Documents/Entreprise/kisinetweb`;
- backend E-commerce : `/home/mubaraka/Documents/Entreprise/ecommerce/backend`;
- frontend E-commerce : `/home/mubaraka/Documents/Entreprise/ecomfront`.

## 3. Architecture HMAC de Kisinet

### 3.1 Génération côté Next.js

`kisinetweb/lib/server/hmac.ts` :

- calcule `SHA-256` sur les octets exacts du corps;
- normalise le chemin et trie la query par clé puis valeur;
- construit sept lignes : version, client, timestamp, nonce, méthode, chemin/query canonique et hash du corps;
- calcule HMAC-SHA256 et produit un hexadécimal;
- génère un timestamp Unix en secondes et un nonce UUID;
- lit le secret dans `KISINET_HMAC_SECRET`, exclusivement côté serveur.

`kisinetweb/lib/server/backend-fetch.ts` signe chaque tentative de `fetch` vers Django. Le navigateur ne peut pas fournir ou écraser les six en-têtes HMAC.

En-têtes :

- `X-Kisinet-Client-Id`;
- `X-Kisinet-Timestamp`;
- `X-Kisinet-Nonce`;
- `X-Kisinet-Content-SHA256`;
- `X-Kisinet-Signature-Version`;
- `X-Kisinet-Signature`.

### 3.2 Vérification côté Django

`core/middleware/hmac.py` et `core/security/client_authentication/hmac.py` :

1. vérifient que la route est protégée;
2. chargent `ApiClient` par `client_id` : une requête SQL;
3. contrôlent la méthode d'authentification et l'activation;
4. valident la version et une fenêtre temporelle de 300 secondes par défaut;
5. lisent `request.body` et recalculent SHA-256;
6. reconstruisent la chaîne canonique;
7. comparent la signature en temps constant avec le secret courant, puis éventuellement le précédent;
8. enregistrent le nonce au moyen de `cache.add`, TTL 600 secondes par défaut;
9. mettent éventuellement à jour `last_seen_at`, au plus une fois toutes les cinq minutes.

Les secrets sont chargés depuis les variables d'environnement dans les settings. Aucun appel réseau ni gestionnaire de secrets distant n'est effectué pendant la vérification.

Par défaut, si HMAC est activé, `KISINET_HMAC_PROTECTED_PREFIXES` couvre `/api/`. Des chemins publics JWT/OAuth et `OPTIONS` peuvent être exemptés. Le mode `ENFORCE` détermine si une absence de signature bloque ou est seulement observée.

### 3.3 Nombre d'opérations

- succès normal : une signature Next.js et une vérification Django;
- réponse 401 sans rafraîchissement possible : une signature et une vérification;
- réponse 401 avec rafraîchissement puis nouvelle tentative : jusqu'à trois signatures et trois vérifications, sur trois appels HTTP distincts;
- corps : hashé une fois par tentative côté Next.js et une fois par tentative côté Django;
- secret précédent : une seconde opération HMAC est possible pendant une rotation;
- anti-rejeu : opération atomique sur le cache configuré, dont le coût dépend du backend de cache réel.

### 3.4 Erreurs

Django renvoie des réponses JSON 401 avec des codes distincts : signature requise, client inconnu ou inactif, version non supportée, timestamp expiré, hash invalide, signature invalide ou rejeu. Les logs n'incluent ni secret ni signature.

## 4. Architecture HMAC d'E-commerce

### 4.1 Génération côté Next.js

`src/lib/hmac/signing.ts` et `src/lib/api/backend-client.ts` reproduisent le même contrat v1 avec HMAC-SHA256. Le secret est lu depuis `ECOMMERCE_HMAC_SECRET` par `getServerConfig()` et reste côté serveur.

En-têtes :

- `X-Ecommerce-Client-Id`;
- `X-Ecommerce-Timestamp`;
- `X-Ecommerce-Nonce`;
- `X-Ecommerce-Content-SHA256`;
- `X-Ecommerce-Signature-Version`;
- `X-Ecommerce-Signature`.

Chaque appel du `backendClient` est signé, y compris les appels publics qui ne sont pas protégés côté Django.

### 4.2 Vérification côté Django

`apps/api_clients/middleware.py` :

1. teste le mode `DISABLED`, `OBSERVATION` ou `ENFORCE`;
2. vérifie si le chemin appartient à l'allowlist HMAC;
3. lit les six en-têtes;
4. charge et normalise la configuration de secrets en mémoire depuis les settings;
5. charge `ApiClient` par SQL;
6. valide version, timestamp (120 secondes), taille maximale du corps et hash;
7. reconstruit et vérifie HMAC avec le secret courant et éventuellement le précédent non expiré;
8. vérifie l'activation du client;
9. en mode `ENFORCE`, insère un `ClientNonce` dans PostgreSQL avec une contrainte unique;
10. met éventuellement à jour `last_seen_at`.

Le corps est conservé dans `_cached_hmac_body`, ce qui évite une seconde lecture du flux au sein du middleware. Il n'y a ni appel réseau ni chargement distant de secret.

### 4.3 Périmètre réellement protégé

La configuration versionnée n'autorise que le préfixe :

`/api/v1/auth/carri/handoff/consume/`

Les settings refusent même tout autre préfixe dans `ECOMMERCE_HMAC_PROTECTED_PREFIXES`. Par conséquent :

- catalogue public : signature Next.js, zéro vérification HMAC Django;
- routes métier privées : signature Next.js, zéro vérification HMAC Django;
- health check : signature possible selon l'appelant, zéro vérification HMAC Django;
- consommation du handoff Web lié à un client : une signature et une vérification;
- ancien handoff non lié : exemption décidée après lecture et recherche du handoff.

Le nonce E-commerce est plus coûteux que celui de Kisinet lorsqu'une route est réellement protégée : il provoque un `INSERT` PostgreSQL par requête signée en mode `ENFORCE`. Cette différence ne s'applique toutefois pas aux routes publiques et métier ordinaires.

### 4.4 Session, JWT et CSRF

Pour une route privée E-commerce :

- Next.js extrait le cookie, déchiffre AES-256-GCM et parse la session;
- les mutations valident `Origin`, `Sec-Fetch-Site` et `x-csrf-protection`;
- Next.js ajoute le JWT et la signature applicative;
- Django vérifie le JWT;
- `EcommerceJWTAuthentication.get_user()` charge `CarriIdentity` par UUID et compare `session_version`;
- les permissions métier chargent ensuite l'entreprise, le membre et/ou ses permissions selon la vue.

En cas de 401, le BFF appelle le refresh puis rejoue la requête. Cela peut produire trois appels Django, comme dans Kisinet. Aucune vérification distante Carri Account n'est effectuée sur chaque requête métier normale.

## 5. Flux HTTP comparés

### 5.1 Kisinet public mis en cache

Navigateur → Server Component Next.js → `signedBackendFetch` → Django HMAC → vue/SQL/sérialisation → Next.js met en cache/revalide → HTML initial.

Pour les pages publiques inspectées, l'utilisateur reçoit déjà les données dans le rendu initial. `getPublicPharmaciesPageServer` utilise `cache()` et `fetch` avec `force-cache` et une revalidation.

### 5.2 E-commerce public actuel

Navigateur → HTML sans produits → téléchargement/exécution React → `useEffect` → Route Handler `/api/public/catalog/...` → signature HMAC → Django, qui ignore HMAC sur cette route → requêtes catalogue → sérialisation JSON → parsing JSON dans le BFF → nouvelle sérialisation `NextResponse.json` → navigateur → rendu React.

Ce chemin impose un aller-retour après hydratation et un double traitement JSON. Le header de réponse du Route Handler autorise un cache public court, mais le `fetch` interne vers Django est explicitement `no-store` et le premier rendu ne bénéficie pas d'un Server Component préchargé.

### 5.3 E-commerce privé

Navigateur → Route Handler dédié → validation CSRF si mutation → déchiffrement du cookie → signature HMAC → Django (HMAC bypass pour la plupart des routes) → JWT + requête `CarriIdentity` → permissions multi-entreprises → vue/SQL → JSON → parsing BFF → nouvelle sérialisation → navigateur.

Sur plusieurs écrans, le navigateur lance plusieurs Route Handlers en parallèle. Chaque appel redéchiffre la session et répète JWT, lecture d'identité et contrôles métier. La parallélisation réduit le temps mural mais ne réduit ni le nombre de requêtes ni la pression PostgreSQL.

## 6. Tableau comparatif

| Élément | Kisinet | E-commerce | Impact potentiel |
|---|---|---|---|
| Algorithme HMAC | HMAC-SHA256, hex, v1 | HMAC-SHA256, hex, v1 | Équivalent |
| Signature sur un appel BFF normal | 1 | 1 | Coût cryptographique faible |
| Validation Django normale | 1 sur `/api/` si activé | 0 hors handoff protégé | Kisinet fait davantage de HMAC |
| Taille signée | Hash SHA-256 du corps + petite chaîne canonique | Identique | Linéaire avec le corps |
| Secret | Mapping settings issu de l'environnement | Mapping settings issu de l'environnement | Aucun accès distant |
| Timestamp | ±300 s par défaut | ±120 s par défaut | Comparaison entière négligeable |
| Anti-rejeu | `cache.add`, TTL 600 s | `INSERT` PostgreSQL, rétention 900 s configurée | E-commerce plus coûteux seulement sur handoff protégé |
| Rotation | Secret courant + précédent | Courant + précédent avec expiration explicite | Jusqu'à 2 HMAC de vérification |
| Middleware Django | 11 entrées versionnées | 9 entrées versionnées | Nombre seul non concluant |
| Connexion PostgreSQL | `CONN_MAX_AGE=60` hors tests | valeur Django par défaut 0 | Reconnexion possible à chaque requête E-commerce |
| Session BFF | JWT dans cookies HttpOnly séparés | session JWT chiffrée AES-GCM | E-commerce ajoute un déchiffrement local |
| JWT privé | utilisateur Django chargé | `CarriIdentity` chargée + `session_version` | Une lecture SQL au minimum dans les deux cas |
| CSRF BFF | mutations : origin + token double soumission | mutations : origin/site + header sentinelle | Non comparable sans mesure |
| Réponse BFF réussie | flux upstream transmis | JSON parsé puis resérialisé | Travail/mémoire supplémentaires E-commerce |
| Données publiques | Server Component + cache/revalidation sur les pages inspectées | `useEffect` après hydratation + BFF `no-store` | E-commerce plus lent perceptuellement |
| Accueil catalogue | endpoint Kisinet différent, comparaison fonctionnelle non valide | matérialise tout le catalogue puis retient 100 | Coût E-commerce croissant avec le volume |
| Recherche | endpoints fonctionnellement différents | plusieurs `icontains` avec `%terme%` | Scans possibles sans index trigramme |
| Mesure BFF/Django/total | non disponible | non disponible | Services arrêtés |

## 7. Mesures réellement exécutées

### 7.1 Disponibilité

Les vérifications suivantes ont échoué immédiatement avec `connection refused` :

- `http://127.0.0.1:3000/`;
- `http://127.0.0.1:8000/api/v1/health/`;
- `http://127.0.0.1:8002/api/`.

Aucun conteneur Kisinet ou E-commerce n'était actif. PostgreSQL local n'était pas joignable. Aucun benchmark HTTP de 30 requêtes n'a donc été inventé.

### 7.2 Microbenchmark cryptographique synthétique

Environnement : Node.js v22.23.4 et Python 3, machine locale de l'audit. Corps JSON de 18 octets, chemin/query fixe, 10 000 échauffements puis 30 lots de 10 000 opérations. Chaque opération calcule SHA-256 du corps, construit la chaîne canonique et calcule HMAC-SHA256.

| Runtime | Minimum | Médiane | p95 | Maximum |
|---|---:|---:|---:|---:|
| Node.js | 0,00488 ms | 0,00557 ms | 0,00803 ms | 0,00910 ms |
| Python | 0,00454 ms | 0,00500 ms | 0,00672 ms | 0,00702 ms |

Ces valeurs mesurent le primitive cryptographique synthétique, pas `fetch`, Django, le cache anti-rejeu ou PostgreSQL. Elles ne permettent donc aucun pourcentage end-to-end.

## 8. Causes confirmées et hypothèses

### 8.1 Confirmé par le code

1. **HMAC E-commerce n'est pas vérifié sur les routes lentes ordinaires.** Il ne peut donc pas expliquer côté Django la lenteur du catalogue, des paniers, des entreprises ou de la plupart des routes privées.
2. **L'accueil catalogue effectue un travail non borné par la page retournée.** `list(queryset)` charge tous les produits et toutes leurs images publiques avant la sélection.
3. **Le chargement public est retardé jusqu'après hydratation.** Accueil, recherche et détail produit utilisent `useEffect`.
4. **Le BFF E-commerce parse et resérialise le JSON.** Ce coût est répété sur chaque route.
5. **Les appels internes E-commerce utilisent `cache: "no-store"`.** Le cache public annoncé au navigateur/CDN ne réduit pas le travail du premier appel amont.
6. **E-commerce ne configure pas les connexions Django persistantes.** Kisinet les garde 60 secondes hors tests.
7. **Les routes publiques E-commerce désactivent explicitement l'authentification DRF.** Elles ne font pas inutilement une validation JWT ou Carri Account. Elles traversent les middlewares Django généraux, mais `SessionMiddleware` et `AuthenticationMiddleware` sont paresseux tant qu'une vue ne demande pas ces objets.
8. **E-commerce ajoute des validations privées légitimes.** Déchiffrement local de session, contrôle de version de session en base et permissions multi-entreprises. Elles ne doivent pas être supprimées.

### 8.2 Hypothèses à mesurer

- coût réel d'une nouvelle connexion PostgreSQL dans l'environnement déployé;
- temps des requêtes `icontains`, des comptes de pagination et des permissions avec le volume réel;
- coût du double JSON pour les plus gros payloads;
- latence réseau, DNS, TCP/TLS et reverse proxy entre Next.js et Django;
- effet des appels parallèles multiples sur le pool PostgreSQL;
- coût réel du stockage de nonce Kisinet selon son backend de cache;
- coût du `ClientNonce` E-commerce pendant le seul flux handoff protégé.

## 9. Réponses explicites

### Kisinet et E-commerce utilisent-ils le même mécanisme HMAC ?

Ils utilisent le même algorithme et pratiquement le même format canonique, mais pas la même politique d'application ni le même anti-rejeu. Kisinet couvre normalement tout `/api/` et stocke les nonces dans le cache. E-commerce ne couvre par défaut que le handoff Web et stocke ses nonces dans PostgreSQL.

### Lequel effectue le plus d'opérations par requête ?

Sur une requête API ordinaire, **Kisinet** : signature, lookup client, vérification, cache anti-rejeu, puis JWT éventuel. E-commerce signe côté Next.js mais Django court-circuite HMAC hors handoff. Sur le handoff E-commerce protégé, E-commerce ajoute un `INSERT` SQL de nonce et peut donc faire plus d'I/O HMAC que Kisinet.

### E-commerce effectue-t-il des validations supplémentaires ?

Oui sur les routes privées : AES-GCM du cookie côté Next.js, version de session liée à `CarriIdentity`, puis permissions multi-entreprises. Sur une mutation, il ajoute les contrôles CSRF du BFF. Ces contrôles ont une justification de sécurité et d'isolation.

### Les requêtes publiques E-commerce traversent-elles inutilement une authentification ?

Non pour DRF/JWT : les vues publiques définissent `authentication_classes = []` et `AllowAny`. Elles traversent le middleware HMAC mais celui-ci sort après la comparaison de chemin. La signature calculée par Next.js est en revanche inutile pour ces routes avec la politique Django actuelle.

### Quel pourcentage du temps est consommé par HMAC, le réseau, Django et PostgreSQL ?

Non mesuré. Les services et PostgreSQL étaient arrêtés. Aucun pourcentage fiable ne peut être donné.

### Pourquoi Kisinet semble-t-il plus rapide ?

La raison confirmée côté expérience utilisateur est son chargement public côté serveur avec cache/revalidation, alors qu'E-commerce attend l'hydratation puis un second aller-retour. E-commerce ajoute en plus un endpoint d'accueil non borné, une double sérialisation JSON et potentiellement une reconnexion PostgreSQL par requête. La part respective de ces facteurs reste à mesurer.

### Quelles corrections précises amélioreraient E-commerce ?

Voir le plan suivant. Les deux premières corrections visent les goulots confirmés et ne touchent aucune protection de sécurité.

## 10. Recommandations classées

| Priorité | Correction | Impact attendu | Complexité | Risque sécurité |
|---|---|---|---|---|
| P0 | Remplacer `list(self.queryset())` de l'accueil par une sélection SQL bornée et testée | Très élevé avec catalogue croissant | Moyenne | Faible |
| P0 | Charger accueil et détail produit dans des Server Components et fournir les données initiales aux composants clients | Élevé sur vitesse perçue/SEO | Moyenne | Faible |
| P1 | Ajouter une instrumentation corrélée BFF/Django avant toute autre optimisation | Rend les causes quantifiables | Moyenne | Faible si logs bornés |
| P1 | Évaluer `CONN_MAX_AGE` ou un pool PostgreSQL après mesure | Élevé si connexions coûteuses | Faible à moyenne | Faible, attention capacité DB |
| P1 | Streamer/pass-through les réponses BFF quand aucune adaptation de contrat n'est nécessaire | Moyen sur gros payloads | Moyenne | Moyen : conserver allowlist d'en-têtes/erreurs |
| P1 | Ajouter des index adaptés après `EXPLAIN (ANALYZE, BUFFERS)` sur recherches réelles | Élevé à grand volume | Moyenne | Faible, migration nécessaire ultérieurement |
| P2 | Regrouper les données initiales d'écrans privés dans des endpoints de synthèse ciblés | Moyen à élevé | Élevée | Moyen : préserver permissions/tenant |
| P2 | Ne plus signer les routes que Django déclare explicitement non protégées, ou aligner la politique | Très faible en performance | Moyenne | Élevé : décision d'architecture sécurité |
| P3 | Mettre en cache uniquement les référentiels publics stables | Moyen | Faible | Faible |

Ne pas prioriser une suppression du HMAC : le gain attendu est minuscule et non démontré. L'incohérence actuelle « signé partout, vérifié presque nulle part » doit être résolue comme décision de sécurité, pas comme raccourci de performance.

## 11. Instrumentation recommandée avant correction

L'instrumentation doit être activée uniquement avec une variable explicite telle que `HTTP_PERF_DIAGNOSTICS=true`, refusée en production sauf autorisation distincte.

### 11.1 Corrélation

- accepter `X-Request-ID` seulement s'il respecte un format UUID/ASCII borné, sinon générer un UUID;
- le BFF envoie cet identifiant à Django;
- Django le renvoie au BFF;
- les logs ne contiennent que l'identifiant, la méthode, un patron de route, le statut, les durées et le nombre de requêtes SQL;
- ne jamais inclure query sensible, cookies, corps, JWT, signature, nonce complet ou données personnelles.

### 11.2 BFF Next.js

Avec `performance.now()`, mesurer sans chevauchement :

- `session_ms` : extraction, déchiffrement et validation temporelle;
- `csrf_ms` : uniquement sur mutations;
- `serialize_ms` : `JSON.stringify` ou lecture du corps;
- `hmac_ms` : hash + canonicalisation + HMAC;
- `django_fetch_ms` : attente complète du `fetch`;
- `response_parse_ms` : lecture/parsing amont;
- `response_serialize_ms` : création de la réponse BFF;
- `bff_total_ms`.

Les sous-étapes ne doivent pas être additionnées si elles sont incluses dans `django_fetch_ms`. Publier éventuellement un `Server-Timing` seulement en diagnostic local.

### 11.3 Django

Avec `time.perf_counter()`, mesurer :

- `hmac_route_policy_ms` et `hmac_verify_ms` dans le middleware HMAC;
- `auth_ms`, `permissions_ms`, `view_ms` et `render_ms` via une sous-classe commune `APIView` ou des hooks DRF diagnostiques;
- `sql_ms` et `sql_count` au moyen de `connection.execute_wrapper`, sans SQL ni paramètres dans les logs;
- `django_total_ms` dans un middleware extérieur.

L'insertion du nonce est comprise dans `hmac_verify_ms` et dans `sql_ms`; elle ne doit pas être additionnée deux fois au total.

### 11.4 Scénarios à lancer lorsque les services existent

Pour chaque système et chaque scénario comparable : 5 échauffements, puis au moins 30 GET, d'abord avec connexion froide contrôlée, puis avec client réutilisé.

1. health public;
2. liste publique paginée de complexité comparable;
3. détail public par identifiant indexé;
4. session privée simple;
5. liste privée avec PostgreSQL;
6. appel BFF signé et réellement vérifié HMAC.

Rapporter minimum, médiane, p95, maximum, statuts et taille de réponse. Les endpoints différents ne doivent servir qu'à caractériser leur propre chemin, jamais à conclure qu'un framework est plus rapide.

## 12. Plan de correction

1. Activer l'instrumentation en développement sur les quatre processus.
2. Capturer les six scénarios ci-dessus avec les mêmes hôtes et la même topologie réseau.
3. Corriger l'accueil catalogue afin que le nombre de lignes lues soit borné en SQL; ajouter un test qui échoue si le nombre de requêtes ou d'objets matérialisés croît avec le catalogue.
4. Migrer la donnée initiale des pages publiques vers les Server Components avec une stratégie de cache publique explicite.
5. Mesurer de nouveau.
6. Si le temps de connexion PostgreSQL est visible, tester une valeur faible de `CONN_MAX_AGE` ou le pool adapté à la capacité réelle.
7. Exécuter `EXPLAIN (ANALYZE, BUFFERS)` sur les recherches lentes, puis seulement créer les index justifiés.
8. Réévaluer le double parsing JSON et les agrégations d'appels privés.
9. Décider séparément si le périmètre HMAC E-commerce doit être élargi ou si les signatures inutilisées doivent être retirées. Faire une revue de menace avant tout changement.

## 13. Risques de sécurité

- Ne pas mettre en cache publiquement une réponse privée, même si elle est identique pour un test.
- Ne pas inclure le JWT, le cookie chiffré, les signatures, les nonces ou les corps dans les traces.
- Ne pas remplacer l'anti-rejeu PostgreSQL par un cache local par processus.
- Une connexion persistante ou un pool doit être borné pour ne pas épuiser PostgreSQL.
- Un endpoint agrégé privé doit répéter toutes les permissions par entreprise et ne jamais accepter l'identifiant navigateur comme autorisation.
- Un pass-through BFF doit conserver l'allowlist d'en-têtes et la normalisation d'erreurs actuelle.
- Le cache du catalogue ne doit contenir que les champs explicitement publics.

## 14. Tests réalisés

### Frontend E-commerce

Commande :

```text
npx vitest run tests/hmac-signing.test.ts tests/backend-client.test.ts tests/django-hmac.integration.test.ts
```

Résultat : 2 fichiers réussis, 1 fichier d'intégration ignoré; 11 tests réussis, 2 ignorés. Les tests d'intégration exigent un Django accessible.

### Frontend Kisinet

Commande :

```text
node --conditions react-server --import tsx --test lib/server/hmac.test.ts lib/server/backend-fetch.test.ts lib/server/bff-route.test.ts
```

Résultat : 3 fichiers réussis.

### Backend E-commerce

Les helpers HMAC sans base ont réussi (18 tests). Les 41 tests middleware dépendants de PostgreSQL n'ont pas pu démarrer, car PostgreSQL local était indisponible. Ce résultat est une limitation d'environnement, pas une régression fonctionnelle observée.

### Vérifications d'environnement

- inspection non destructive des conteneurs;
- requêtes `curl` de disponibilité sur les ports locaux configurés;
- aucun service démarré, arrêté ou modifié;
- aucune migration, écriture métier, charge, commit ou push.

## 15. Limites de l'audit

- Aucun service applicatif ni PostgreSQL n'était disponible.
- Aucun accès aux métriques du reverse proxy, du fournisseur cloud ou de production.
- Aucun échantillon de volume réel, plan `EXPLAIN`, taille de payload ou trace réseau.
- Les paramètres d'environnement actifs en production peuvent différer des valeurs par défaut versionnées.
- Les endpoints publics Kisinet et E-commerce ne sont pas fonctionnellement identiques; l'audit ne transforme pas leur temps théorique en comparaison définitive.
- Aucun pourcentage HMAC/réseau/Django/PostgreSQL n'est présenté faute de mesures corrélées.
- L'instrumentation décrite n'a pas été injectée dans les trois autres dépôts : cela aurait constitué une modification multi-dépôts avant validation du design et sans processus actif permettant de la vérifier. Elle constitue la première étape du plan de correction.

## 16. Suivi d'optimisation du 30 octobre 2026

Une correction distincte a borné la sélection de l'accueil public E-commerce à 100 produits avant matérialisation, rendu les pages publiques initialement côté serveur et activé des connexions persistantes seulement en développement. Le détail des changements et validations est dans `ecommerce-performance-optimization.md`. Aucun chiffre HTTP après correction n'est ajouté : les services HTTP nécessaires restaient indisponibles.
