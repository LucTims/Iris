import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    dropCap: {
      insertDropCap: () => ReturnType;
    };
  }
}

/**
 * Drop-cap paragraph — the first letter is displayed large and floated.
 * Serialized as <p class="drop-cap">…</p>
 */
export const DropCap = Node.create({
  name: "dropCap",
  group: "block",
  content: "inline*",
  defining: true,

  parseHTML() {
    return [{ tag: "p.drop-cap" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "p",
      mergeAttributes(HTMLAttributes, { class: "drop-cap" }),
      0,
    ];
  },

  addCommands() {
    return {
      insertDropCap:
        () =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            content: [{ type: "text", text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Modifiez ce texte avec votre contenu." }],
          }),
    };
  },
});

export default DropCap;
