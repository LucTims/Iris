import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    storyPage: {
      /** Insère une page de conte (illustration + texte court). */
      insertStoryPage: (src?: string) => ReturnType;
      /** Retire la page de conte en conservant son contenu. */
      unsetStoryPage: () => ReturnType;
    };
  }
}

/**
 * Page de STORYBOOK — une illustration suivie de quelques phrases.
 *
 * Sérialisée en `<div class="story-page">…</div>`, exactement la structure
 * demandée au modèle dans `workTypeWritingRules("storybook")`. Sans ce nœud,
 * Tiptap « déballerait » le div à l'ouverture du manuscrit (un conteneur
 * inconnu du schéma est supprimé, son contenu remontant d'un niveau) : la
 * page perdrait son groupement image+texte dès le premier enregistrement, et
 * l'export ne saurait plus quelle image va avec quel texte.
 *
 * Nœud de contenu simple (sans NodeView React) : l'image et le paragraphe
 * restent nativement éditables, redimensionnables et supprimables.
 */
export const StoryPage = Node.create({
  name: "storyPage",
  group: "block",
  // Une image puis du texte — mais on reste permissif (`block+`) pour ne pas
  // rejeter une page que le modèle aurait construite dans un autre ordre.
  content: "block+",
  defining: true,

  parseHTML() {
    return [{ tag: "div.story-page" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { class: "story-page" }), 0];
  },

  addCommands() {
    return {
      insertStoryPage:
        (src?: string) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            content: [
              // `ResizableImage` étend @tiptap/extension-image sans renommer le
              // nœud : il s'appelle donc toujours « image » dans le schéma.
              ...(src ? [{ type: "image", attrs: { src, align: "center" } }] : []),
              { type: "paragraph" },
            ],
          }),
      unsetStoryPage:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
    };
  },
});

export default StoryPage;
