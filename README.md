# Quiz IA — quiz en direct pour la salle

Le grand écran affiche un QR code. Les étudiants le scannent, entrent leur prénom, et répondent
depuis leur téléphone. À chaque question, l'écran montre le compte à rebours, le nombre de
réponses reçues, puis la répartition des réponses, la bonne réponse avec une explication, et le
classement. Podium à la fin. Rien à installer pour les étudiants.

- **Pages** : statiques, hébergées gratuitement sur GitHub Pages.
- **Temps réel** : Firebase Realtime Database, offre gratuite (100 connexions simultanées).
- **Sans Firebase**, le quiz tourne en **mode local** : plusieurs onglets d'un même navigateur
  (pratique pour essayer, pas pour une salle).

## Essayer tout de suite (mode local)

```bash
npm run serve            # puis ouvrir http://localhost:8090/animateur.html
```

Ouvre ensuite l'adresse affichée sous le QR code (`jouer.html?p=…&local=1`) dans d'autres onglets
du même navigateur : chaque onglet est un joueur.

## Mise en ligne (une seule fois, ~15 minutes)

### 1. Créer le projet Firebase
1. Sur <https://console.firebase.google.com>, **Ajouter un projet** (Google Analytics : inutile).
2. **Build → Realtime Database → Créer une base de données**, emplacement *europe-west1*,
   démarrer en **mode verrouillé**.
3. **Build → Authentication → Commencer → Méthode de connexion → Anonyme → Activer**.
   (Les étudiants n'ont pas de compte : chaque téléphone reçoit un identifiant anonyme.)
4. Onglet **Realtime Database → Règles** : coller le contenu de `database.rules.json`, **Publier**.
   Ces règles font que seul l'écran d'animation pilote la partie, qu'un joueur ne répond
   qu'une fois, seulement pendant la question, et que personne ne lit les réponses avant la
   révélation.

### 2. Brancher le quiz sur ce projet
1. **Paramètres du projet (⚙) → Vos applications → Web (`</>`)**, nom au choix, sans hébergement.
2. Copier les valeurs `apiKey`, `authDomain`, `databaseURL`, `projectId`, `appId` dans
   `js/config.mjs`. Elles ne sont pas secrètes : la sécurité vient des règles.
3. **Authentication → Paramètres → Domaines autorisés** : ajouter `<ton-pseudo>.github.io`.

### 3. Publier sur GitHub Pages
1. Créer un dépôt GitHub (par exemple `quiz-ia`) et y pousser ce dossier.
2. **Settings → Pages → Source : Deploy from a branch → `main` / racine**.
3. Le quiz est en ligne à `https://<ton-pseudo>.github.io/quiz-ia/`.

## Le jour du cours
1. Sur l'ordinateur relié au grand écran : `…/quiz-ia/animateur.html`.
2. Les étudiants scannent le QR code (ou tapent le code à 6 chiffres sur `…/quiz-ia/jouer.html`).
3. **Lancer le quiz** quand les prénoms sont là. Ensuite, **Espace** ou **→** fait avancer :
   question → révélation → classement → question suivante → podium.
   La révélation arrive seule à la fin du temps, ou dès que tout le monde a répondu.
4. Recharger l'écran d'animation par erreur ne perd rien : la partie reprend.

## Changer les questions
- Pour le site : modifier `js/questions.mjs` (2 à 4 choix, `bonne` = indice de la bonne
  réponse à partir de 0, `duree` en secondes, `explication`).
- Pour un quiz dont on ne veut pas publier les réponses : **Charger des questions (.json)** sur
  l'écran d'accueil, avec un fichier `{ "titre": "…", "questions": [ … ] }` gardé sur ton
  ordinateur. Les questions ne sont alors jamais dans le site.

## Points
Bonne réponse : de 1000 (immédiate) à 500 (au dernier moment), mesuré à l'heure du serveur.
Mauvaise réponse ou pas de réponse : 0.

## Tests
```bash
npm test
```
