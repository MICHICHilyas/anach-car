# Vos photos de véhicules

Déposez ici les photos de vos voitures, puis lancez :

```bash
npm run hero:photos
```

Le script les recadre, les étalonne aux couleurs du site et les installe
dans le Hero. Une photo prise en plein soleil et une autre prise à l'ombre
appartiendront ainsi à la même série.

## Nommage

Le nom du fichier détermine le visuel remplacé :

| Fichier à déposer | Remplace |
| --- | --- |
| `economique.jpg` | Le visuel des citadines |
| `compacte.jpg` | Le visuel des compactes |
| `berline.jpg` | Le visuel des berlines |
| `suv.jpg` | Le visuel des SUV |

## Comment photographier

- **Format paysage**, appareil tenu horizontalement
- **Voiture décalée à droite** du cadre — la moitié gauche accueille le texte
- **Vue trois-quarts avant**, appareil à hauteur de phare
- Fond simple et dégagé : un mur, un parking vide, la mer
- Lumière douce : tôt le matin ou en fin d'après-midi, jamais en plein midi
- Voiture propre, roues droites, vitres fermées

## Réglages

```bash
npm run hero:photos -- --intensity=0.35   # étalonnage plus discret
npm run hero:photos -- --flip             # miroir si la voiture regarde à droite
```

> Le miroir inverse aussi le côté du volant : à n'utiliser que si ce détail
> n'est pas visible sur la photo.

## Encore mieux : une photo par véhicule

Téléversez la photo depuis `/admin/vehicules/[id]`. Le Hero **et** les cartes
du catalogue l'utilisent alors, et le nom exact du modèle s'affiche —
« Renault Clio 5 » au lieu de « Compacte ».
