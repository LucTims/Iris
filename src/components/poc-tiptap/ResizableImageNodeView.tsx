import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { 
  Move, Edit2, Copy, Trash2, MoreHorizontal, Check, 
  ZoomIn, ZoomOut, RotateCcw, RotateCw, Scissors, Link2, CopyPlus,
  AlignLeft, AlignCenter, AlignRight, Crop
} from 'lucide-react';

// ─── Crop Modal ──────────────────────────────────────────────────
function CropModal({ 
  imgSrc, 
  onApply, 
  onCancel 
}: { 
  imgSrc: string; 
  onApply: (croppedSrc: string) => void; 
  onCancel: () => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgReady, setImgReady] = useState(false);
  const [imgDisplaySize, setImgDisplaySize] = useState({ w: 0, h: 0 });
  const [imgNaturalSize, setImgNaturalSize] = useState({ w: 0, h: 0 });
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [dragging, setDragging] = useState<'move' | 'tl' | 'tr' | 'bl' | 'br' | null>(null);
  const [dragOrigin, setDragOrigin] = useState({ mx: 0, my: 0, cx: 0, cy: 0, cw: 0, ch: 0 });

  const onImgLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    const dw = img.clientWidth;
    const dh = img.clientHeight;
    setImgDisplaySize({ w: dw, h: dh });
    setImgNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    // Default crop = 80% centered
    const mx = dw * 0.1, my = dh * 0.1;
    setCrop({ x: mx, y: my, w: dw - 2 * mx, h: dh - 2 * my });
    setImgReady(true);
  };

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  const startDrag = (e: React.MouseEvent, type: 'move' | 'tl' | 'tr' | 'bl' | 'br') => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(type);
    setDragOrigin({ mx: e.clientX, my: e.clientY, cx: crop.x, cy: crop.y, cw: crop.w, ch: crop.h });
  };

  useEffect(() => {
    if (!dragging) return;
    const MIN = 30;

    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - dragOrigin.mx;
      const dy = e.clientY - dragOrigin.my;
      const { cx, cy, cw, ch } = dragOrigin;

      if (dragging === 'move') {
        setCrop({
          x: clamp(cx + dx, 0, imgDisplaySize.w - cw),
          y: clamp(cy + dy, 0, imgDisplaySize.h - ch),
          w: cw, h: ch,
        });
      } else if (dragging === 'br') {
        setCrop({ x: cx, y: cy, w: clamp(cw + dx, MIN, imgDisplaySize.w - cx), h: clamp(ch + dy, MIN, imgDisplaySize.h - cy) });
      } else if (dragging === 'bl') {
        const nw = clamp(cw - dx, MIN, cx + cw);
        setCrop({ x: cx + cw - nw, y: cy, w: nw, h: clamp(ch + dy, MIN, imgDisplaySize.h - cy) });
      } else if (dragging === 'tr') {
        const nh = clamp(ch - dy, MIN, cy + ch);
        setCrop({ x: cx, y: cy + ch - nh, w: clamp(cw + dx, MIN, imgDisplaySize.w - cx), h: nh });
      } else if (dragging === 'tl') {
        const nw = clamp(cw - dx, MIN, cx + cw);
        const nh = clamp(ch - dy, MIN, cy + ch);
        setCrop({ x: cx + cw - nw, y: cy + ch - nh, w: nw, h: nh });
      }
    };

    const onUp = () => setDragging(null);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, [dragging, dragOrigin, imgDisplaySize]);

  const applyCrop = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx || !imgNaturalSize.w) return;

    const scaleX = imgNaturalSize.w / imgDisplaySize.w;
    const scaleY = imgNaturalSize.h / imgDisplaySize.h;
    const sw = crop.w * scaleX, sh = crop.h * scaleY;

    canvas.width = sw;
    canvas.height = sh;

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.drawImage(img, crop.x * scaleX, crop.y * scaleY, sw, sh, 0, 0, sw, sh);
      onApply(canvas.toDataURL('image/png'));
    };
    img.src = imgSrc;
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-[90vw] max-h-[90vh] flex flex-col gap-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-800">Rogner l&apos;image</h3>

        {/* Image + crop area */}
        <div className="relative inline-block select-none overflow-hidden border border-gray-200 rounded-lg" style={{ maxWidth: '70vw', maxHeight: '65vh' }}>
          {/* Base image (dimmed) */}
          <img ref={imgRef} src={imgSrc} alt="" className="block max-w-full max-h-[65vh] opacity-40" onLoad={onImgLoad} draggable={false} />

          {/* Bright crop window */}
          {imgReady && (
            <>
              <div
                className="absolute border-2 border-blue-500 overflow-hidden cursor-move"
                style={{ left: crop.x, top: crop.y, width: crop.w, height: crop.h }}
                onMouseDown={e => startDrag(e, 'move')}
              >
                <img
                  src={imgSrc}
                  alt=""
                  className="block max-w-none pointer-events-none"
                  style={{ width: imgDisplaySize.w, height: imgDisplaySize.h, marginLeft: -crop.x, marginTop: -crop.y }}
                  draggable={false}
                />
              </div>

              {/* Corner handles */}
              {(['tl', 'tr', 'bl', 'br'] as const).map(corner => {
                const pos = {
                  tl: { left: crop.x - 5, top: crop.y - 5, cursor: 'nw-resize' },
                  tr: { left: crop.x + crop.w - 5, top: crop.y - 5, cursor: 'ne-resize' },
                  bl: { left: crop.x - 5, top: crop.y + crop.h - 5, cursor: 'sw-resize' },
                  br: { left: crop.x + crop.w - 5, top: crop.y + crop.h - 5, cursor: 'se-resize' },
                }[corner];
                return (
                  <div
                    key={corner}
                    className="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-full z-10"
                    style={{ left: pos.left, top: pos.top, cursor: pos.cursor }}
                    onMouseDown={e => startDrag(e, corner)}
                  />
                );
              })}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Annuler
          </button>
          <button onClick={applyCrop} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
            Appliquer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main NodeView ──────────────────────────────────────────────
export function ResizableImageNodeView(props: NodeViewProps) {
  const { node, updateAttributes, selected, deleteNode, editor, getPos } = props;
  const { src, alt, width, rotation = 0, align = 'center' } = node.attrs;

  const imageRef = useRef<HTMLImageElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [currentWidth, setCurrentWidth] = useState<number | null>(width || null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);

  // Handle resizing logic
  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsResizing(true);
      
      const startX = event.clientX;
      const startWidth = imageRef.current?.offsetWidth || 0;

      const onMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - startX;
        const newWidth = Math.max(100, startWidth + deltaX * (align === 'center' ? 2 : 1));
        setCurrentWidth(newWidth);
      };

      const onMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        
        if (imageRef.current) {
          updateAttributes({ width: imageRef.current.offsetWidth });
        }
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [updateAttributes, align]
  );

  useEffect(() => {
    if (!isResizing) {
      setCurrentWidth(width);
    }
  }, [width, isResizing]);

  useEffect(() => {
    if (!selected) {
      setShowMoreMenu(false);
    }
  }, [selected]);

  // Actions
  const handleCopy = () => {
    navigator.clipboard.writeText(src);
  };

  const handleDuplicate = () => {
    if (typeof getPos === 'function') {
      const pos = getPos();
      if (typeof pos === 'number') {
        editor.commands.insertContentAt(pos + node.nodeSize, {
          type: node.type.name,
          attrs: node.attrs,
        });
      }
    }
  };

  const handleCut = () => {
    handleCopy();
    deleteNode();
  };

  const increaseSize = () => {
    const newW = (currentWidth || imageRef.current?.offsetWidth || 200) * 1.1;
    setCurrentWidth(newW);
    updateAttributes({ width: newW });
  };

  const decreaseSize = () => {
    const newW = Math.max(100, (currentWidth || imageRef.current?.offsetWidth || 200) * 0.9);
    setCurrentWidth(newW);
    updateAttributes({ width: newW });
  };

  const rotateLeft = () => updateAttributes({ rotation: (rotation - 90) % 360 });
  const rotateRight = () => updateAttributes({ rotation: (rotation + 90) % 360 });

  const addHyperlink = () => {
    const url = window.prompt("URL du lien ?");
    if (url && typeof getPos === 'function') {
      const pos = getPos();
      if (typeof pos === 'number') {
        editor.chain().focus().setNodeSelection(pos).setLink({ href: url }).run();
      }
    }
  };

  const validate = () => {
    editor.commands.blur();
  };

  const handleCropApply = (croppedSrc: string) => {
    updateAttributes({ src: croppedSrc, width: null });
    setShowCropModal(false);
    // Force Tiptap to recalculate
    setTimeout(() => {
      if (editor.view) editor.view.dispatch(editor.state.tr);
    }, 100);
  };

  // Alignment classes mapping
  const alignClasses = {
    'left': 'float-left mr-4',
    'center': 'block mx-auto',
    'right': 'float-right ml-4',
  };

  return (
    <NodeViewWrapper 
      className={`relative max-w-full transition-all duration-200 clear-none ${alignClasses[align as keyof typeof alignClasses]} ${selected ? 'ring-1 ring-blue-500 border border-blue-500' : 'border border-transparent'}`}
      style={{ 
        width: currentWidth ? `${currentWidth}px` : 'auto',
      }}
    >
      <img
        ref={imageRef}
        src={src}
        alt={alt || ''}
        className="w-full h-auto block select-none transition-transform duration-300"
        style={{ transform: `rotate(${rotation}deg)` }}
        onLoad={() => {
          if (editor.view) {
            editor.view.dispatch(editor.state.tr);
          }
        }}
      />

      {/* Resize Handles */}
      {selected && (
        <>
          <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-blue-500 rounded-sm cursor-se-resize z-10" onMouseDown={handleMouseDown} />
          <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-blue-500 rounded-sm cursor-sw-resize z-10" />
          <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-blue-500 rounded-sm cursor-ne-resize z-10" />
          <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-blue-500 rounded-sm cursor-nw-resize z-10" />
        </>
      )}

      {/* Main Floating Toolbar */}
      {selected && (
        <div 
          className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white border border-gray-200 shadow-md rounded-md p-1 z-20"
          contentEditable={false}
        >
          <button onClick={validate} className="p-1.5 hover:bg-blue-50 text-blue-500 rounded bg-blue-50" title="Valider">
            <Check size={16} />
          </button>
          
          <div className="w-px h-4 bg-gray-200 mx-1" />

          {/* Alignment Controls */}
          <button onClick={() => updateAttributes({ align: 'left' })} className={`p-1.5 rounded ${align === 'left' ? 'bg-gray-100 text-blue-600' : 'hover:bg-gray-100 text-gray-700'}`} title="Aligner à gauche (habillage texte)">
            <AlignLeft size={16} />
          </button>
          <button onClick={() => updateAttributes({ align: 'center' })} className={`p-1.5 rounded ${align === 'center' ? 'bg-gray-100 text-blue-600' : 'hover:bg-gray-100 text-gray-700'}`} title="Centrer">
            <AlignCenter size={16} />
          </button>
          <button onClick={() => updateAttributes({ align: 'right' })} className={`p-1.5 rounded ${align === 'right' ? 'bg-gray-100 text-blue-600' : 'hover:bg-gray-100 text-gray-700'}`} title="Aligner à droite (habillage texte)">
            <AlignRight size={16} />
          </button>

          <div className="w-px h-4 bg-gray-200 mx-1" />

          <div className="p-1.5 hover:bg-gray-100 text-gray-700 rounded cursor-move flex items-center justify-center" title="Déplacer (Maintenez pour glisser)" data-drag-handle>
            <Move size={16} />
          </div>
          
          {/* Crop */}
          <button onClick={() => setShowCropModal(true)} className="p-1.5 hover:bg-gray-100 text-gray-700 rounded" title="Rogner l'image">
            <Crop size={16} />
          </button>

          <button onClick={handleDuplicate} className="p-1.5 hover:bg-gray-100 text-gray-700 rounded" title="Dupliquer">
            <CopyPlus size={16} />
          </button>
          <button onClick={deleteNode} className="p-1.5 hover:bg-red-50 text-red-500 rounded" title="Supprimer">
            <Trash2 size={16} />
          </button>
          
          <div className="w-px h-4 bg-gray-200 mx-1" />

          <button 
            onClick={() => setShowMoreMenu(!showMoreMenu)} 
            className={`p-1.5 rounded transition-colors ${showMoreMenu ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-blue-500'}`} 
            title="Plus d'options"
          >
            <MoreHorizontal size={16} />
          </button>
        </div>
      )}

      {/* More Options Popout Menu */}
      {selected && showMoreMenu && (
        <div 
          className="absolute -top-12 left-full ml-2 w-48 flex flex-col bg-white border border-gray-200 shadow-lg rounded-lg py-2 z-30 text-sm"
          contentEditable={false}
        >
          <button onClick={increaseSize} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-gray-700 w-full text-left">
            <ZoomIn size={16} className="text-gray-500" /> Agrandir
          </button>
          <button onClick={decreaseSize} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-gray-700 w-full text-left">
            <ZoomOut size={16} className="text-gray-500" /> Réduire
          </button>
          <div className="h-px bg-gray-100 my-1 mx-2" />
          <button onClick={rotateLeft} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-gray-700 w-full text-left">
            <RotateCcw size={16} className="text-gray-500" /> Pivoter à gauche
          </button>
          <button onClick={rotateRight} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-gray-700 w-full text-left">
            <RotateCw size={16} className="text-gray-500" /> Pivoter à droite
          </button>
          <div className="h-px bg-gray-100 my-1 mx-2" />
          <button onClick={handleCopy} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-gray-700 w-full text-left">
            <Copy size={16} className="text-gray-500" /> Copier
          </button>
          <button onClick={handleCut} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-gray-700 w-full text-left">
            <Scissors size={16} className="text-gray-500" /> Couper
          </button>
          <button onClick={addHyperlink} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-gray-700 w-full text-left">
            <Link2 size={16} className="text-gray-500" /> Ajouter un lien
          </button>
        </div>
      )}

      {/* Crop Modal */}
      {showCropModal && (
        <CropModal 
          imgSrc={src} 
          onApply={handleCropApply} 
          onCancel={() => setShowCropModal(false)} 
        />
      )}
    </NodeViewWrapper>
  );
}
