# MealList Planner

Tu crées une application intelligente de courses appelée "MealList".

**FONCTIONNEMENT:**

**Étape 1: Saisie des repas (Page 1)**

- Titre: "Tes repas de la semaine?"

- L'utilisateur rentre des repas qu'il veut manger (exemple: "pâtes carbonara", "poulet rôti", "salade")

- Chaque repas = un input + bouton "Ajouter ce repas"

- Liste des repas rentrés s'affiche

**Étape 2: Génération automatique de la liste (Page 2 - CLIQUE BOUTON)**

- Quand utilisateur clique "Générer ma liste de courses"

- L'IA (utilise un modèle Claude) génère les ingrédients nécessaires

- Exemple: pour "pâtes carbonara" → génère automatiquement:

  * 200g pâtes

  * 100g lard/guanciale

  * 2 œufs

  * 50g parmesan

  * Sel, poivre

**Étape 3: Choix de qualité (Page 3 - TRÈS IMPORTANT)**

- Pour CHAQUE produit généré, l'utilisateur choisit la qualité:

  * "Pâtes": 

    - Option 1: "Pâtes standard" (1€)

    - Option 2: "Pâtes bio" (2.50€)

    - Option 3: "Pâtes fraîches" (4€)

  * "Lard":

    - Option 1: "Lard standard" (2€)

    - Option 2: "Lard fermier" (4€)

    - Option 3: "Guanciale" (6€)

**Étape 4: Choix du magasin (Page 4 - REVENUE)**

- "Où veux-tu faire tes courses?"

- 4 boutons: "Carrefour" | "Leclerc" | "Amazon Fresh" | "Intermarché"

- Chaque bouton ouvre un lien affiliate vers ce magasin

- L'affiliation se fait automatiquement (toi tu touches commission)

**DESIGN:**

- Pages séquentielles (étape par étape, pas tout sur une page)

- Clean, moderne, épuré

- Boutons colorés et clairs

- Compatible mobile

- Progression visible ("Étape 1/4" en haut)

**DONNÉES:**

- Stockage local (localStorage)

- Pas de création de compte

- Pas de serveur nécessaire

**CE QUE JE VEUX:**

- L'IA génère VRAIMENT les ingrédients (utilise Claude API ou un modèle similaire)

- Les choix de qualité sont VISUELS et CLAIRS

- Les boutons affiliation sont ÉVIDENTES

- Pas de friction

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://meallistplanner.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b6bf9dc2-afbc-4ba9-a2d9-c0e40429a20f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
