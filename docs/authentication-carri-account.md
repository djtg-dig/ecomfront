# Audit de l'authentification Carri Account

## Contrat réellement disponible

Audit en lecture seule du backend E-commerce et de Carri Account, le
2026-10-10. E-commerce est le client OAuth confidentiel et reste responsable
du flux Authorization Code avec PKCE S256 : il génère et stocke le `state`
haché, le `nonce` et le `code_verifier` dans `OAuthLoginAttempt`.

| Étape | Endpoint | Réponse |
| --- | --- | --- |
| Démarrage Web | `GET /api/auth/carri/login` (Next) puis Django `GET /api/v1/auth/carri/login/?delivery=nextjs&delivery_binding=…` | Cookie de transaction HttpOnly puis redirection vers Carri Account |
| Retour OIDC | Django `GET /api/v1/auth/carri/callback/` | Page `no-store` qui POSTe le handoff et le binding vers Next |
| Réception BFF | `POST /api/auth/carri/handoff` | Vérifie l’origine et le binding, consomme par HMAC, pose la session chiffrée HttpOnly et redirige vers `/` |
| Consommation | Next serveur `POST /api/v1/auth/carri/handoff/consume/` | HMAC `ecommerce-web`; la paire de JWT reste côté serveur |
| Renouvellement | `POST /api/auth/refresh` | Rotation côté serveur, réponse `204`; JWT uniquement dans le cookie chiffré |
| Déconnexion | `POST /api/auth/logout` | Efface localement les cookies; aucune révocation Django n'est disponible |
| Utilisateur courant | `GET /api/v1/auth/me/` | JWT E-commerce requis, `200 {"id":"…","carri_subject":"…"}` |
| Renouvellement | `POST /api/v1/auth/token/refresh/` | `200 {"access":"…","refresh":"…"}`; rotation SimpleJWT activée |

Le backend valide aussi `iss`, `aud`, la signature RS256, `exp`, `iat`,
`nonce`, `at_hash` quand applicable, puis `userinfo` et l'adresse Carri
vérifiée. Carri Account expose les métadonnées OIDC, la révocation OAuth et un
endpoint de logout; E-commerce ne conserve cependant pas les tokens Carri et
n'expose pas de route de révocation/logout de ses propres JWT.

## Livraison et CSRF

Django reste propriétaire du code OAuth, PKCE, `state`, `nonce` et de la
validation OIDC. Le bouton Next navigue vers le Route Handler de démarrage, qui
crée 256 bits aléatoires, les conserve dans un cookie HttpOnly et ne transmet
que `delivery=nextjs` et `delivery_binding` à Django. Aucune URL de retour
fournie par le navigateur n'est acceptée.

Le récepteur Next exige `Origin` égal à l'origine Django configurée,
`Sec-Fetch-Site` présent, un formulaire avec exactement `handoff` et
`delivery_binding`, et la comparaison en temps constant du binding au cookie
transactionnel. Les JWT ne sont ni rendus dans le HTML, ni placés dans une URL,
ni journalisés. La valeur transactionnelle est supprimée après succès.

Certains navigateurs de test sérialisent `Origin` comme `null` pour une
navigation formulaire opaque. Seul le développement HTTP où les deux origines
sont le même hôte loopback peut alors continuer, avec `Sec-Fetch-Site:
same-site` et le binding HttpOnly correspondant. Une origine opaque cross-site,
ou toute origine opaque en production, est refusée.

Les deux ports `localhost` sont same-site dans le navigateur : le développement
local utilise un cookie transactionnel `SameSite=Lax`. En production, l'origine
Django et Next doivent être HTTPS et le cookie devient `SameSite=None; Secure`.
Toute combinaison HTTP distante ou de schéma différent est refusée, sans
désactiver les attributs de sécurité.

Pour un refus du callback, le contrat frontend accepte un formulaire POST vers
le même endpoint avec exactement `error` et `delivery_binding`. Django doit
d'abord valider le `state` et la transaction OAuth; Next vérifie ensuite l'origine
Django et le binding HttpOnly, traduit `access_denied` en
`oauth_authorization_denied`, efface le cookie transactionnel et redirige vers
`/connexion`. Cette branche n'émet aucun handoff et ne crée aucune session. Un
refus `email_verified=false` utilise le code non sensible
`oauth_email_not_verified`.

## Session et refresh

La paire Django est enfermée dans un cookie AES-256-GCM HttpOnly, `SameSite=Lax`
et Secure en production. `SESSION_ENCRYPTION_KEY` est une clé serveur hex de 32
octets. Le navigateur ne reçoit jamais les JWT en JSON. Le Route Handler de
refresh ne renvoie que `204` et pose un cookie chiffré rotaté.

Les refresh simultanés dans un même processus Node sont sérialisés par hash du
refresh token, et le résultat est conservé brièvement pour les requêtes retardées
avec l'ancien cookie. Ce verrou est en mémoire : un déploiement multi-processus
ou multi-réplicas doit fournir une coordination partagée avant d'activer ce flux
à cette échelle. La déconnexion est locale; Django ne fournit pas de révocation
ou de logout E-commerce et le frontend ne déconnecte pas Carri Account.

Les POST de refresh/logout exigent une origine frontend exacte, `Sec-Fetch-Site:
same-origin` et l'en-tête `X-CSRF-Protection: 1`. Le handoff cross-origin utilise
sa protection distincte par origine Django et cookie de transaction. Le layout
privé vérifie la session et retarde son contenu jusqu'au contrôle/refresh. Les
pages privées et `/connexion` restent `noindex`; les pages publiques gardent
leurs métadonnées et leur indexation SEO.

## Configuration

Variables frontend dans `.env.local` (ne pas committer le secret HMAC ni la clé
de session) : `NEXT_PUBLIC_FRONTEND_URL`, `DJANGO_BACKEND_URL`,
`ECOMMERCE_HMAC_CLIENT_ID`, `ECOMMERCE_HMAC_SECRET` et
`SESSION_ENCRYPTION_KEY`. Générer la dernière avec `openssl rand -hex 32`.
Configurer côté backend, dans son environnement privé,
`CARRI_ACCOUNT_WEB_HANDOFF_DELIVERY_URL` vers
`<NEXT_PUBLIC_FRONTEND_URL>/api/auth/carri/handoff` sans slash final. Le mode
HMAC backend doit être `ENFORCE` et le client `ecommerce-web` actif.

L'environnement inspecté pour cette intégration n'a pas de `.env.local`, Django
ne répond pas sur `localhost:8000`, et aucune configuration OAuth/HMAC backend
n'est présente ici. Le parcours sera donc vérifié dans un navigateur contre un
serveur Django simulant ce contrat; le consentement Carri réel exige une
configuration backend et des identifiants de test fournis hors du dépôt.
