// Les questions du quiz — cours « ECE · 1er cours IA, machine learning, deep learning ».
// Pour un autre cours : remplacer ce tableau (2 à 4 choix, `bonne` = indice du bon choix,
// `duree` en secondes, `explication` affichée à l'écran avec la bonne réponse).
//
// ⚠ Ce fichier est servi avec le site : un étudiant curieux pourrait le lire. Pour un quiz
// noté, l'écran d'animation permet aussi de charger les questions depuis un fichier local.

export const TITRE = "IA, machine learning, deep learning : le quiz";

export const QUESTIONS = [
  {
    texte: "Laquelle de ces situations n'utilise PAS d'IA ?",
    choix: ["Le filtre anti-spam de votre messagerie", "Le compteur d'un taxi", "Les séries « qui pourraient vous plaire »", "Le GPS qui contourne un bouchon"],
    bonne: 1,
    explication: "Le compteur applique une règle écrite à la main : tant pour monter, tant par kilomètre. Aucun apprentissage.",
  },
  {
    texte: "Quel problème est « inexact » : pas de recette parfaite, on accepte de se tromper ?",
    choix: ["Trier une liste de notes", "Additionner deux prix", "Reconnaître un chat sur une photo", "Calculer une moyenne"],
    bonne: 2,
    explication: "Oreilles pointues ? Un renard aussi. Personne ne sait écrire la règle : c'est là que l'apprentissage brille.",
  },
  {
    texte: "IA, machine learning, deep learning : quelle phrase est juste ?",
    choix: ["Tout machine learning est du deep learning", "Tout deep learning est du machine learning", "L'IA est une partie du machine learning", "Ce sont trois domaines séparés"],
    bonne: 1,
    explication: "Trois cercles emboîtés : l'IA contient le machine learning, qui contient le deep learning. Tout taxi est une voiture, pas l'inverse.",
  },
  {
    texte: "Prix de la course = w × distance + b. Que représente b ?",
    choix: ["Le prix au kilomètre", "La prise en charge", "La distance", "Le pourboire"],
    bonne: 1,
    explication: "b, c'est ce que vous payez avant même de rouler. w, le prix au kilomètre, donne la pente de la droite.",
  },
  {
    texte: "Avec w = 2 €/km et b = 3 €, combien coûte une course de 10 km ?",
    choix: ["20 €", "23 €", "50 €", "32 €"],
    bonne: 1,
    explication: "2 × 10 + 3 = 23 €. Vous venez d'utiliser un modèle.",
    duree: 25,
  },
  {
    texte: "Pour une machine, « apprendre », c'est…",
    choix: ["Mémoriser tous les exemples", "Ajuster ses réglages pour réduire l'erreur", "Recevoir les règles d'un humain", "Devenir consciente"],
    bonne: 1,
    explication: "Annoncé 22 €, payé 25 € : 3 € d'erreur. L'appli tourne un peu w et b dans le bon sens, des milliers de fois.",
  },
  {
    texte: "On donne à la machine des milliers d'e-mails étiquetés « spam » ou « normal ». C'est de l'apprentissage…",
    choix: ["Supervisé", "Non supervisé", "Par renforcement", "Ce n'est pas de l'apprentissage"],
    bonne: 0,
    explication: "Les étiquettes sont le corrigé : c'est du supervisé.",
  },
  {
    texte: "Un taxi autonome gagne un point quand il trouve vite un client et en perd quand il tourne à vide. C'est…",
    choix: ["Du supervisé", "Du non supervisé", "Du renforcement", "Une règle écrite à la main"],
    bonne: 2,
    explication: "Ni corrigé, ni groupes : des récompenses et des pénalités. C'est l'apprentissage par renforcement.",
  },
  {
    texte: "Votre IA « chat ou chien » n'a vu que des chats blancs sur fond blanc. Que va-t-il se passer ?",
    choix: ["Elle reconnaîtra tous les chats", "Elle risque de rater un chat noir ou un autre fond", "Elle deviendra plus rapide", "Rien, la quantité suffit"],
    bonne: 1,
    explication: "Données pas représentatives : l'IA apprend le fond et la couleur, pas le chat. Un modèle ne vaut pas mieux que ses données.",
  },
  {
    texte: "Les ventes de glaces et les noyades augmentent ensemble. Que faut-il en conclure ?",
    choix: ["Les glaces provoquent des noyades", "Il faut interdire les glaces", "Une cause cachée, l'été, fait monter les deux", "Les noyades font vendre des glaces"],
    bonne: 2,
    explication: "Corrélation n'est pas causalité. Le machine learning repère des corrélations, pas des causes.",
  },
  {
    texte: "Un filtre laisse TOUT passer. Un e-mail sur cent est un spam. Son taux de réussite ?",
    choix: ["0 %", "50 %", "99 %", "100 %"],
    bonne: 2,
    explication: "99 % de réussite… et pas un seul spam attrapé : son rappel est de zéro. Le taux de réussite peut cacher un modèle inutile.",
    duree: 25,
  },
  {
    texte: "Un modèle est excellent sur ses données d'entraînement mais mauvais sur les données de test. C'est…",
    choix: ["Du sous-apprentissage", "Du surapprentissage", "Un bon modèle", "Un biais de données"],
    bonne: 1,
    explication: "Il a appris par cœur, hasards compris : le tailleur trop zélé. Seule la note sur des données jamais vues est honnête.",
  },
  {
    texte: "« Deep » dans deep learning veut dire…",
    choix: ["Que le modèle est intelligent", "Que le modèle est mystérieux", "Qu'il y a beaucoup de couches de neurones", "Qu'il comprend en profondeur"],
    bonne: 2,
    explication: "Profond = beaucoup de couches empilées. Ni intelligent, ni mystérieux.",
  },
  {
    texte: "ChatGPT, au fond, est entraîné à…",
    choix: ["Chercher la réponse sur Internet", "Deviner le mot suivant", "Comprendre comme un humain", "Recopier des livres"],
    bonne: 1,
    explication: "Un immense réseau entraîné à prédire le mot suivant. Il peut donc se tromper avec aplomb : vérifiez toujours.",
  },
];
