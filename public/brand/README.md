# Logo Anach Car

Les fichiers de ce dossier sont **générés** — ne les modifiez pas à la main.

## Changer le logo

1. Remplacez le fichier source : `brand-assets/logo-anach-car-source.png`
   (idéalement un PNG haute définition, logo sombre sur fond blanc uni).
2. Lancez :

   ```bash
   npm run brand
   ```

Le script détoure le fond, retire les marges, éclaircit la version destinée
aux fonds sombres et exporte toutes les déclinaisons.

## Fichiers produits

| Fichier | Usage | Où il apparaît |
| --- | --- | --- |
| `anach-car-logo.png` | Logo complet, fond clair | Page de connexion, contrat de location |
| `anach-car-logo-white.png` | Logo complet, fond sombre | Pied de page |
| `anach-car-logo-compact.png` | Sans baseline, fond clair | — |
| `anach-car-logo-compact-white.png` | Sans baseline, fond sombre | Barre latérale de l'espace agence |
| `anach-car-mark.png` | Pictogramme seul | Réseaux sociaux, partages |
| `../favicon.png` | Onglet du navigateur | Tout le site |

La version compacte existe parce qu'à 44 px de haut — la taille d'un en-tête —
la baseline « LOCATION DE VOITURES » ne mesurerait que 5 px : illisible, et
visuellement bruyante. Le nom y gagne 40 % de taille.

## Revenir à la version typographique

Passez `AGENCY.logo.useImage` à `false` dans `src/config/agency.ts`.
Le site affiche alors le nom composé en typographie, sans image.
