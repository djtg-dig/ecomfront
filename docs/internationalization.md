# Internationalisation

L’interface publiée prend en charge `fr` et `en`; la locale de secours est `fr`.
Les routes ne comportent pas de préfixe linguistique afin de préserver les URLs
publiques, les callbacks OAuth et les routes BFF existantes.

`ecommerce_locale` est un cookie non sensible, accessible au rendu serveur,
avec `Path=/`, `SameSite=Lax`, `Secure` en HTTPS et une durée d’un an. Le
`proxy.ts` l’initialise depuis `Accept-Language` pour un nouveau visiteur. La
frontière `LocaleBoundary` le relit côté serveur, sous le `Suspense` du
RootLayout. Cette séparation est requise par Cache Components de Next.js 16.4 :
le RootLayout garde ses balises `html` et `body` statiques, et le provider
synchronise ensuite l’attribut `html[lang]` pendant l’hydratation.

Après connexion, le BFF consulte `GET /api/v1/auth/me/preferences/`. Une
préférence de profil `fr` ou `en` l’emporte sur le cookie. Quand elle est vide,
la locale visiteur est enregistrée une seule fois avec `PATCH` puis synchronisée
dans le cookie. La déconnexion ne supprime jamais `ecommerce_locale`.

Les composants utilisent les dictionnaires centralisés de `src/lib/i18n`.
La localisation par cookie n’offre pas de pages linguistiques distinctes : il
ne faut donc pas ajouter de `hreflang` pour les mêmes URLs. Les titres SEO
spécifiques aux pages restent à localiser lors de l’internationalisation de ces
pages.
