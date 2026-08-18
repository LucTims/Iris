import Image from '@tiptap/extension-image';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ResizableImageNodeView } from './ResizableImageNodeView';

export const ResizableImage = Image.extend({
  inline: false,
  group: 'block',
  draggable: true,
  
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return { width: attributes.width };
        },
      },
      height: {
        default: null,
        renderHTML: (attributes) => {
          if (!attributes.height) return {};
          return { height: attributes.height };
        },
      },
      rotation: {
        default: 0,
        renderHTML: (attributes) => {
          if (!attributes.rotation) return {};
          return { 'data-rotation': attributes.rotation };
        },
      },
      align: {
        default: 'center',
        renderHTML: (attributes) => {
          if (!attributes.align) return {};
          return { 'data-align': attributes.align };
        },
      }
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageNodeView);
  },
});
