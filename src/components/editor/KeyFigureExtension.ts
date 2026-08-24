import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    keyFigure: {
      insertKeyFigure: () => ReturnType;
    };
  }
}

/**
 * Key-figure block — a visually prominent box to highlight a number/stat.
 * Serialized as <div class="key-figure"><span class="key-figure-value">…</span><span class="key-figure-label">…</span></div>
 */
export const KeyFigure = Node.create({
  name: "keyFigure",
  group: "block",
  content: "inline*",
  defining: true,

  addAttributes() {
    return {
      value: {
        default: "42",
        parseHTML: (el) => el.getAttribute("data-value") || "42",
        renderHTML: (attrs) => ({ "data-value": attrs.value }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div.key-figure" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { class: "key-figure" }),
      0,
    ];
  },

  addCommands() {
    return {
      insertKeyFigure:
        () =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { value: "42" },
            content: [{ type: "text", text: "42 — Chiffre clé à personnaliser" }],
          }),
    };
  },
});

export default KeyFigure;
