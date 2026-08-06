# Original User Request

## 2026-08-06T15:56:34Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Teamwork agent is executing the task.

Implémentation d'une fonctionnalité d'importation de manuscrits permettant de charger des fichiers `.docx` et `.epub` directement dans l'éditeur TipTap de l'application Iris, en conservant la structure d'origine et en offrant le choix de diviser le texte en sous-chapitres.

Working directory: c:/Users/helpdesk/Desktop/Iris/livre-genie
Integrity mode: benchmark

## Requirements

### R1. Interface d'Importation
Ajouter un bouton "Importer" dans la barre d'outils de l'éditeur sur la page `/redaction` (à côté des autres outils). Ce bouton doit ouvrir un sélecteur de fichiers n'acceptant que les formats `.docx` et `.epub`.

### R2. Choix de Structuration
Dès qu'un fichier est sélectionné, ouvrir une modale qui demande à l'utilisateur : "Voulez-vous diviser par chapitre (via les grands titres) ou tout garder en un seul bloc ?". 
- Si l'option "Diviser" est choisie, le fichier doit être découpé en utilisant les balises de titre (H1/H2).
- Si l'option "Tout garder" est choisie, le contenu entier est inséré tel quel dans le chapitre courant.

### R3. Préservation de la Mise en Forme
Le parseur (côté serveur ou client) doit extraire le texte tout en conservant le formatage sémantique de base compatible avec TipTap : Titres (headings), paragraphes, gras, italique, etc. 

### R4. Extraction Sécurisée
L'extraction et le parsing des fichiers `.docx` et `.epub` doivent être gérés de manière performante (par exemple via une route API Next.js ou des librairies spécialisées comme mammoth) sans bloquer l'interface utilisateur.

## Acceptance Criteria

### UI et Expérience Utilisateur
- [ ] Le bouton "Importer" est bien visible et cliquable dans la barre d'outils de `/redaction`.
- [ ] La sélection d'un fichier déclenche bien l'apparition de la modale de choix de structure.

### Parsing Fonctionnel
- [ ] L'importation d'un fichier `.docx` de test contenant des titres et du texte gras insère correctement ces éléments dans le composant TipTap de la page (le gras reste gras, les titres restent des titres).
- [ ] Si l'utilisateur choisit de "tout garder", le texte complet s'affiche dans l'éditeur.
