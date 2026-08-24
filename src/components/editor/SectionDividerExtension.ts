import { Node, mergeAttributes } from "@tiptap/core";

export type DividerStyle = "stars" | "ornament" | "line" | "dots";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    sectionDivider: {
      insertSectionDivider: (style?: DividerStyle) => ReturnType;
    };
  }
}

/**
 * Ornamental section divider — a decorative separator between sections.
 * Serialized as <div class="section-divider section-divider-<style>" data-divider-style="<style>"></div>
 */
export const SectionDivider = Node.create({
  name: "sectionDivider",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      style: {
        default: "ornament" as DividerStyle,
        parseHTML: (el) => {
          const ds = el.getAttribute("data-divider-style");
          if (ds) return ds;
          const cls = el.getAttribute("class") || "";
          const m = cls.match(/section-divider-(stars|ornament|line|dots)/);
          return m ? m[1] : "ornament";
        },
        renderHTML: (attrs) => ({ "data-divider-style": attrs.style }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div.section-divider" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const s = (node.attrs.style as string) || "ornament";
    return [
      "div",
      mergeAttributes(HTMLAttributes, { class: `section-divider section-divider-${s}` }),
    ];
  },

  addCommands() {
    return {
      insertSectionDivider:
        (style = "ornament") =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { style } }),
    };
  },
});

export default SectionDivider;
