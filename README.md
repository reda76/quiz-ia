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
npm run serve            # puis ouvrir http://localhost:8090/animateur.html?local=1 (mode local)
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
1. Sur l'ordinateur relié au grand écran : `…/quiz-ia/animateur.html`. C'est **la salle** : un seul
   QR code et un seul code pour toute la séance, et les prénoms qui arrivent.
2. Les étudiants scannent ce QR **une fois** et entrent leur prénom (ou tapent le code de la salle
   sur `…/quiz-ia/jouer.html`).
3. Tu cliques sur un jeu : son écran s'ouvre et **tous les téléphones y basculent tout seuls**,
   sans ressaisir leur prénom. **← Changer de jeu** te ramène à la salle : les téléphones attendent
   le jeu suivant. Un retardataire qui scanne le QR arrive directement dans le jeu en cours.
4. Dans chaque jeu, le QR code et le code affichés sont ceux de la salle (dans un coin, hors de
   l'accueil, pour qui a perdu le fil). Recharger un écran ne perd rien : la partie reprend.
5. **↺ Nouvelle partie** (deux clics) recommence le jeu en cours avec un nouveau code : les téléphones
   suivent seuls. **↺ Nouvelle salle**, sur l'écran de la salle, repart de zéro (nouveau QR).
6. Quiz : **Espace** ou **→** fait avancer ; la révélation arrive à la fin du temps, ou dès que tous
   les téléphones CONNECTÉS ont répondu (un étudiant parti ne bloque plus personne).

Chaque jeu se lance aussi seul, hors salle (`quiz.html`, `machine.html`…) : il a alors son propre
QR code, comme avant.

## Avant la séance (5 minutes, une fois)
1. **Republier les règles** : copier tout `database.rules.json` dans la console Firebase →
   Realtime Database → Règles → Publier. Elles ajoutent la **présence** : un téléphone éteint ou
   parti ne bloque plus le « tout le monde a répondu ». Sans cette étape, tout marche quand même :
   chaque question attend seulement son temps maximum dès qu'un étudiant est parti.
2. **Quota de connexions** : Firebase limite à **100 nouveaux comptes par heure et par adresse IP**.
   Toute la salle sur le Wi-Fi de l'école partage une IP. Une classe de 30 à 40 étudiants passe
   largement (un compte par téléphone, gardé pour les 4 jeux), mais des onglets privés rechargés en
   boucle peuvent l'atteindre. Par sécurité : console Firebase → Authentication → Paramètres →
   limites de création de comptes, **programmer une hausse temporaire** le jour du cours. Si un
   téléphone affiche « Trop de connexions depuis ce réseau », l'étudiant passe en 4G/5G.
3. Ouvrir chaque jeu une fois sur l'ordinateur du vidéoprojecteur pour vérifier l'affichage.

## Changer les questions
- Pour le site : modifier `js/questions.mjs` (2 à 4 choix, `bonne` = indice de la bonne
  réponse à partir de 0, `duree` en secondes, `explication`).
- Pour un quiz dont on ne veut pas publier les réponses : **Charger des questions (.json)** sur
  l'écran d'accueil, avec un fichier `{ "titre": "…", "questions": [ … ] }` gardé sur ton
  ordinateur. Les questions ne sont alors jamais dans le site.

## Le jeu « Battez la machine »
Écran d'animation : `…/quiz-ia/animateur.html` → Battez la machine (ou directement `machine.html`). Les étudiants scannent le QR code et règlent sur
leur téléphone **b** (litres vendus même par 0 °C) et **w** (litres en plus par degré) pour que
leur droite « ventes = w × température + b » passe au plus près des journées d'un glacier. Toutes les droites apparaissent en direct sur le grand
écran, avec un classement à l'écart moyen en litres. À la fin du temps, **Lancer la machine** :
elle part de w = 0 et b = 0 et réduit l'erreur pas à pas (descente de gradient), sous les yeux
de la salle. Puis le classement final (machine comprise) et le vrai rythme de ventes. **Nouvelle manche**
tire d'autres journées.

Les jeux utilisent les parties `jeux`, `mots` et `groupes` des règles de `database.rules.json` : **après une mise à jour du
dépôt, recoller les règles** dans la console Firebase (Realtime Database → Règles → Publier).

## « La salle est un ChatGPT »
Écran : `animateur.html` → La salle est un ChatGPT. Un début de phrase s'affiche ; à chaque tour,
chaque étudiant propose le mot suivant (un seul mot, ou « ⏹ finir la phrase »). Les propositions
deviennent des probabilités en direct ; on tire le mot (modèle **créatif** : au hasard selon les
probabilités, ou **prudent** : le plus probable) et la phrase s'allonge. Morale à la fin : prédire
le mot suivant, sans vérifier, c'est ce que fait ChatGPT (cours 6.4).
Si personne ne propose de mot avant la fin du compte à rebours, rien n'est ajouté : le même mot
est rejoué avec un nouveau compte à rebours (la phrase ne se termine que sur « ⏹ » ou la limite de mots).

## « Qui se ressemble s'assemble »
Écran : `animateur.html` → Qui se ressemble s'assemble. Chaque étudiant se place (anonymement) sur
deux axes depuis son téléphone (sommeil × écran, cafés × trajet, sport × jeux vidéo) ; puis les
k-moyennes forment 2 à 5 groupes étape par étape, sous les yeux de la salle ; la salle nomme les
groupes (cours 3.2 : regrouper sans étiquette).

## Points
Bonne réponse : de 1000 (immédiate) à 500 (au dernier moment), mesuré à l'heure du serveur.
Mauvaise réponse ou pas de réponse : 0.

## Tests
```bash
npm test
```
