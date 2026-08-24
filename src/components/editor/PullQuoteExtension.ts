import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pullQuote: {
      insertPullQuote: () => ReturnType;
    };
  }
}

/**
 * Pull-quote — a stylised citation block, distinct from <blockquote>.
 * Serialized as <div class="pull-quote">…</div>
 */
export const PullQuote = Node.create({
  name: "pullQuote",
  group: "block",
  content: "inline*",
  defining: true,

  parseHTML() {
    return [{ tag: "div.pull-quote" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { class: "pull-quote" }),
      0,
    ];
  },

  addCommands() {
    return {
      insertPullQuote:
        () =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            content: [{ type: "text", text: "Votre citation ici" }],
          }),
    };
  },
});

export default PullQuote;
