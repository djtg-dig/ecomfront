# Design System Carri Business

## Source et périmètre

Ce socle a été audité dans Djana Academy, sans modification du projet source :
`~/Documents/Entreprise/djana-academy-frontweb-next`.

Les couleurs suivantes sont historiques, car elles apparaissent dans
`public/brand/logo-djana.svg` et/ou les styles de l'interface :

| Rôle historique | Valeur | Source observée |
| --- | --- | --- |
| Bleu Djana | `#1D71B8` | Logo, gradients et interface |
| Orange Djana | `#F39200` | Logo |
| Bleu nuit | `#023967` | Gradients et surfaces d'accent |
| Bleu ciel | `#62B3E5` | Gradient de la page d'accueil |
| Encre | `#04111F` | Interface |
| Fond bleuté | `#F4F8FC` | Catalogue |

Djana Academy emploie `Outfit` pour l'interface et une police décorative dans
le SVG du logo. E-commerce conserve temporairement Geist, déjà chargé par
Next.js, afin de ne pas copier une ressource de police sans licence partagée
déclarée. Une adoption inter-produits d'Outfit doit être décidée avec son
fichier de licence.

## Observations de l'audit

Sans modifier Djana Academy, trois écarts ont été relevés :

- Ses tokens CSS sont principalement exprimés en `oklch`, alors que le logo et
  plusieurs gradients utilisent des HEX; ils sont proches visuellement mais ne
  constituent pas une source unique de vérité.
- `#FFA800` apparaît ponctuellement à côté de l'orange historique `#F39200`.
  Le socle Carri Business retient uniquement l'orange du logo.
- Les cartes Djana Academy emploient souvent des rayons très larges. Les
  surfaces de l'application E-commerce restent à 8 px maximum, conformément à
  sa convention d'outil de gestion.

## Tokens proposés

Les tokens ci-dessous sont partagés par intention, et non par écran. Ils sont
déclarés dans `src/app/globals.css` puis utilisables dans Tailwind avec
`bg-brand`, `text-brand-secondary`, `border-line`, etc.

| Token | Valeur | Usage |
| --- | --- | --- |
| `brand` | `#1D71B8` | Action principale, lien, information |
| `brand-secondary` | `#023967` | Titres, navigation et action secondaire sombre |
| `accent` | `#F39200` | Repère visuel, jamais texte blanc |
| `surface` | `#F4F8FC` | Fond applicatif |
| `surface-raised` | `#FFFFFF` | Surface élevée |
| `ink` | `#04111F` | Texte principal |
| `muted` | `#4B5D70` | Texte secondaire |
| `line` | `#C8D7E6` | Bordure et séparation |
| `success` | `#087F5B` | État de succès proposé |
| `error` | `#B42318` | État d'erreur proposé |
| `warning` | `#9A6700` | État d'avertissement proposé |
| `info` | `#1D71B8` | État d'information |

Les quatre couleurs fonctionnelles sont des choix de système proposés, pas des
couleurs historiques de Djana Academy. Les états interactifs reposent sur
`brand-hover` (`#155B96`), un contour de focus bleu de 3 px et un état désactivé
à fond `#DBE5EE`. Les boutons et panneaux publics restent à un rayon maximal de
8 px pour les usages applicatifs.

## Accessibilité

Les contrôles de contraste WCAG AA sont automatisés dans
`tests/design-system.test.ts`. Paires prévues pour le texte normal :

- Blanc sur bleu : 5,11:1.
- Blanc sur bleu hover : 7,07:1.
- Blanc sur bleu nuit : 11,77:1.
- Encre sur orange : 8,07:1.
- Texte secondaire sur fond : 6,35:1.
- Encre sur état désactivé : 14,89:1.
- Blanc sur succès : 5,00:1.
- Blanc sur erreur : 6,57:1.
- Blanc sur avertissement : 4,87:1.

Le blanc sur l'orange historique ne fait que 2,35:1. Il est donc interdit pour
le texte ou les boutons. `robots.txt`, le sitemap, les metadata SEO et les
modules BFF/HMAC ne font pas partie de ce design system et restent inchangés.

## Réutilisation

Carri Account, Kisinet et Flutter pourront reprendre les rôles de tokens et
leurs valeurs, en les traduisant dans leur technologie cible. Avant toute
adoption, conserver la distinction entre les couleurs historiques ci-dessus et
les couleurs fonctionnelles proposées, puis valider les composants et états
avec les équipes produit et accessibilité.
