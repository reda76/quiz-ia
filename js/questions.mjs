// Les questions du quiz — cours « ECE · 1er cours IA, machine learning, deep learning ».
// Pour un autre cours : remplacer ce tableau (2 à 4 choix, `bonne` = indice du bon choix à
// partir de 0, `duree` en secondes, `explication` affichée avec la bonne réponse, `code`
// facultatif : un extrait affiché en police à chasse fixe sous la question).
//
// Toutes les réponses du cours sont DANS le PowerPoint (règle du formateur) ; celles des
// questions Python ont été vérifiées en exécutant le code.

export const TITRE = "IA, machine learning, deep learning : le quiz";

export const QUESTIONS = [
  // ─── Le cours (15) ─────────────────────────────────────────────────────────
  {
    texte: "Selon la définition de Tom Mitchell, un programme « apprend » si…",
    choix: ["Il atteint 100 % de bonnes réponses", "Sa performance à une tâche s'améliore avec l'expérience", "Il imite le fonctionnement du cerveau", "Il réécrit lui-même son code"],
    bonne: 1,
    explication: "Une tâche, une mesure de performance, une expérience : si la mesure s'améliore avec l'expérience, il apprend.",
  },
  {
    texte: "Le premier filtre anti-spam suit des règles écrites à la main (« si l'objet contient GRATUIT, c'est un spam »). Dans les trois cercles, il fait partie…",
    choix: ["De l'IA, mais pas du machine learning", "Du machine learning", "Du deep learning", "D'aucun des trois cercles"],
    bonne: 0,
    explication: "Le grand cercle de l'IA contient aussi les programmes à règles écrites à la main, comme ce premier filtre. Le machine learning, lui, apprend ses règles à partir d'exemples.",
  },
  {
    texte: "Ventes = w × température + b. Sur le graphique (température à l'horizontale, litres vendus à la verticale), b correspond à…",
    choix: ["La pente de la droite", "La hauteur où la droite démarre, à 0 °C", "La température maximale", "L'erreur moyenne"],
    bonne: 1,
    explication: "b, les ventes de base, c'est la hauteur où la droite démarre. w, les litres vendus en plus à chaque degré, c'est la pente.",
  },
  {
    texte: "En été, le glacier vend deux fois plus de litres à chaque degré, mais ses ventes de base ne changent pas. Sur le graphique, la droite…",
    choix: ["Glisse vers le haut, avec la même pente", "Devient deux fois plus pentue, avec le même point de départ", "Ne change pas", "Devient horizontale"],
    bonne: 1,
    explication: "w est la pente : on la double. b est la hauteur de départ : elle ne bouge pas.",
  },
  {
    texte: "Le modèle avait prévu 54 litres, le glacier en a vendu 60. Que fait l'apprentissage de cet écart de 6 litres ?",
    choix: ["Il l'ignore : l'erreur est normale", "Il tourne un peu w et b dans le sens qui réduit l'erreur", "Il modifie la température du jour", "Il recommence l'apprentissage depuis zéro"],
    bonne: 1,
    explication: "L'écart, c'est l'erreur. On tourne un peu les boutons w ou b dans le sens qui la réduit, puis on recommence avec une autre journée, des centaines de fois.",
  },
  {
    texte: "Prédire si le glacier sera en rupture de stock demain (oui ou non), c'est une tâche de…",
    choix: ["Régression", "Classification", "Clustering", "Renforcement"],
    bonne: 1,
    explication: "La réponse est une case (oui / non) : classification. Prédire combien de litres il vendra, un nombre, ce serait une régression.",
  },
  {
    texte: "Le glacier n'a noté que des journées d'août. Le principal défaut de ses données ?",
    choix: ["Pas assez de données", "Des données pas représentatives", "Des étiquettes fausses", "Trop de variables"],
    bonne: 1,
    explication: "Un jour de pluie en avril, son modèle n'aura jamais rien vu de pareil : les exemples doivent couvrir toutes les situations.",
  },
  {
    texte: "Pourquoi l'outil de tri de CV d'Amazon pénalisait-il les candidatures de femmes ?",
    choix: ["Les ingénieurs l'avaient programmé ainsi", "Il avait appris sur dix ans de candidatures surtout masculines", "Il manquait de puissance de calcul", "Il lisait mal les CV en PDF"],
    bonne: 1,
    explication: "Le modèle a reproduit fidèlement le passé. Si le passé est biaisé, l'apprentissage l'est aussi.",
  },
  {
    texte: "Sur une année, les ventes de glaces et le nombre de noyades montent et descendent ensemble. Pourquoi ?",
    choix: ["Les glaces font couler les nageurs", "Une cause commune : la chaleur", "Les nageurs mangent trop de glaces", "C'est forcément une coïncidence"],
    bonne: 1,
    explication: "Quand il fait chaud, on vend plus de glaces et plus de gens se baignent. Corrélation n'est pas causalité : le modèle repère la corrélation, à vous de chercher la cause.",
  },
  {
    texte: "Un spam sur cent. Le filtre « paresseux » laisse TOUT passer. Quel est son rappel ?",
    choix: ["99 %", "100 %", "0", "50 %"],
    bonne: 2,
    explication: "Il a raison 99 fois sur 100… mais n'attrape aucun spam : son rappel est de zéro. Le taux de réussite cache un modèle inutile.",
    duree: 30,
  },
  {
    texte: "« Parmi les e-mails envoyés dans les spams, combien en étaient vraiment ? » Cette question mesure…",
    choix: ["Le rappel", "La précision", "Le taux de réussite", "L'erreur moyenne"],
    bonne: 1,
    explication: "La précision. Le rappel pose l'autre question : parmi tous les vrais spams, combien le filtre en a-t-il attrapé ?",
    duree: 30,
  },
  {
    texte: "Erreur sur les données d'entraînement : 1 %. Erreur sur les données de test : 30 %. Diagnostic ?",
    choix: ["Sous-apprentissage", "Surapprentissage", "Un bon modèle", "Les données de test sont trop faciles"],
    bonne: 1,
    explication: "Excellent sur ce qu'il a vu, mauvais sur le reste : il a appris par cœur, hasards compris. Le tailleur trop zélé.",
  },
  {
    texte: "Avant sa fonction d'activation, un neurone artificiel calcule…",
    choix: ["La moyenne de ses entrées", "Une somme pondérée de ses entrées, plus un biais", "Le maximum de ses entrées", "Une règle « si… alors… »"],
    bonne: 1,
    explication: "Chaque entrée × son poids w, on additionne, on ajoute b. Exactement la formule du glacier, avec plusieurs entrées.",
  },
  {
    texte: "Lequel de ces éléments N'EXPLIQUE PAS l'essor du deep learning depuis 2012 ?",
    choix: ["Beaucoup plus de données disponibles", "Les cartes graphiques", "De meilleurs algorithmes d'entraînement", "L'invention du neurone artificiel en 2012"],
    bonne: 3,
    explication: "Le perceptron date de 1958. Ce qui a changé : les données, les cartes graphiques et les algorithmes, réunis ensemble.",
  },
  {
    texte: "ChatGPT, au fond, c'est un immense réseau entraîné à…",
    choix: ["Chercher la réponse sur Internet", "Deviner le mot suivant", "Comprendre les phrases comme un humain", "Recopier des textes mot pour mot"],
    bonne: 1,
    explication: "Entraîné sur d'énormes quantités de textes à deviner le mot suivant : prédire, comparer, corriger. Au lieu d'un nombre de litres, il prédit un mot.",
  },

  // ─── Python (5) : qui sait coder ? ─────────────────────────────────────────
  {
    texte: "Python : qu'affiche ce code ?",
    code: "x = [1, 2, 3]\ny = x\ny.append(4)\nprint(len(x))",
    choix: ["3", "4", "Une erreur", "None"],
    bonne: 1,
    explication: "y = x ne copie pas la liste : x et y désignent la même liste. Ajouter à y, c'est ajouter à x.",
    duree: 30,
  },
  {
    texte: "Python : qu'affiche ce code ?",
    code: "print(7 // 2, 7 % 2)",
    choix: ["3.5 1", "3 1", "3 0.5", "4 1"],
    bonne: 1,
    explication: "// est la division entière (3), % le reste (1).",
    duree: 25,
  },
  {
    texte: "Python : qu'affiche ce code ?",
    code: "def f(a, b=2):\n    return a * b\n\nprint(f(3), f(3, 3))",
    choix: ["6 9", "5 6", "6 6", "Une erreur"],
    bonne: 0,
    explication: "b vaut 2 par défaut : f(3) = 6. Si on le donne, il remplace la valeur par défaut : f(3, 3) = 9.",
    duree: 30,
  },
  {
    texte: "Python : qu'affiche ce code ?",
    code: "print([n * n for n in range(4) if n % 2 == 0])",
    choix: ["[0, 1, 4, 9]", "[4, 16]", "[0, 4]", "[1, 9]"],
    bonne: 2,
    explication: "range(4) donne 0, 1, 2, 3 ; on garde les pairs (0 et 2) et on les met au carré : [0, 4].",
    duree: 35,
  },
  {
    texte: "Python : qu'affiche ce code ?",
    code: "notes = {\"Léa\": 15, \"Tom\": 12}\nnotes[\"Inès\"] = 17\nprint(max(notes, key=notes.get))",
    choix: ["17", "Inès", "Tom", "Léa"],
    bonne: 1,
    explication: "max parcourt les CLÉS du dictionnaire et les compare selon notes.get, donc selon leur note : Inès (17).",
    duree: 35,
  },
];
