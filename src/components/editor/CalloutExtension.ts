import { Node, mergeAttributes } from "@tiptap/core";

export type CalloutType = "info" | "warning" | "tip" | "example";

export const CALLOUT_TYPES: CalloutType[] = ["info", "warning", "tip", "example"];

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      /** Wrap the current block(s) in a callout of the given type. */
      setCallout: (type?: CalloutType) => ReturnType;
      /** Insert a fresh empty callout of the given type. */
      insertCallout: (type?: CalloutType) => ReturnType;
      /** Remove the surrounding callout, keeping its content. */
      unsetCallout: () => ReturnType;
    };
  }
}

/**
 * Callout / encadré — a block container with 4 visual variants
 * (info, warning, tip, example). Serialized as
 *   <div class="callout callout-<type>" data-callout-type="<type>">…</div>
 * so it round-trips through save/load and is styleable in the editor, the
 * PDF export (buildPrintHtml) and the DOCX export (generateDocx).
 *
 * Implemented as a plain content node (no React NodeView) for robustness:
 * its inner blocks stay natively editable.
 */
export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      type: {
        default: "info" as CalloutType,
        parseHTML: (element) => {
          const dataType = element.getAttribute("data-callout-type");
          if (dataType) return dataType;
          // Fallback: read the variant from the class (e.g. AI output
          // "callout callout-warning" without a data attribute).
          const cls = element.getAttribute("class") || "";
          const m = cls.match(/callout-(info|warning|tip|example)/);
          return m ? m[1] : "info";
        },
        renderHTML: (attributes) => ({
          "data-callout-type": attributes.type,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div.callout" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const type = (node.attrs.type as string) || "info";
    return [
      "div",
      mergeAttributes(HTMLAttributes, { class: `callout callout-${type}` }),
      0,
    ];
  },

  addCommands() {
    return {
      setCallout:
        (type = "info") =>
        ({ commands }) =>
          commands.wrapIn(this.name, { type }),
      insertCallout:
        (type = "info") =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { type },
            content: [{ type: "paragraph" }],
          }),
      unsetCallout:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
    };
  },
});

export default Callout;
