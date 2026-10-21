import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { 
  Move, Copy, Trash2, MoreHorizontal, Check, 
  ZoomIn, ZoomOut, RotateCcw, RotateCw, Scissors, Link2, CopyPlus,
  AlignLeft, AlignCenter, AlignRight, Crop
} from 'lucide-react';

const MIN_WIDTH = 100;
const DEFAULT_WIDTH = 640;
// Hauteur utile d'une page A4 si l'extension Pages n'a pas encore publié
// `--page-max-height` (premier rendu).
const FALLBACK_PAGE_MAX_HEIGHT = 860;
// Marge sous la hauteur utile de page : bordure de sélection, marges du bloc.
const PAGE_SAFETY_MARGIN = 32;

/**
 * Hauteur maximale qu'une image peut occuper sans dépasser une page.
 *
 * C'est LA cause des pages blanches à l'insertion : une photo portrait de
 * 640 px de large mesure ~850 à 1100 px de haut, soit plus que la zone de
 * texte d'une page A4. L'extension Pages ne pouvant pas couper une image en
 * deux, elle ajoutait des pages en boucle pour essayer de la caser (dizaines
 * de pages vides, onglet figé, éditeur inutilisable).
 */
function pageMaxHeight(editorDom: HTMLElement): number {
  const raw = getComputedStyle(editorDom).getPropertyValue('--page-max-height');
  const parsed = parseFloat(raw);
  const pageHeight = Number.isFinite(parsed) && parsed > 0 ? parsed : FALLBACK_PAGE_MAX_HEIGHT;
  return Math.max(MIN_WIDTH, pageHeight - PAGE_SAFETY_MARGIN);
}

/** Largeur de la zone de texte de la page (hors marges gauche/droite). */
function pageContentWidth(editorDom: HTMLElement): number {
  const cs = getComputedStyle(editorDom);
  return editorDom.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
}

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

  const [isApplying, setIsApplying] = useState(false);
  const [cropError, setCropError] = useState<string | null>(null);

  // Le résultat est envoyé au stockage comme une image insérée normalement.
  // Avant, il était réinjecté en data URL PNG dans le HTML du chapitre : une
  // image rognée pesait plusieurs Mo de base64 dans `chapters.content`, ce qui
  // ralentissait chaque frappe (getHTML), chaque sauvegarde et l'IA.
  // L'image source est lue via `fetch` (et non un <img crossOrigin>) : le
  // navigateur réutilisait sinon la réponse en cache sans en-têtes CORS de
  // l'aperçu, le canvas était « contaminé » et le rognage échouait en silence.
  const applyCrop = async () => {
    if (!imgNaturalSize.w || !imgDisplaySize.w) return;
    setIsApplying(true);
    setCropError(null);
    try {
      const res = await fetch(imgSrc);
      if (!res.ok) throw new Error('source');
      const sourceBlob = await res.blob();
      const bitmap = await createImageBitmap(sourceBlob);

      const scaleX = bitmap.width / imgDisplaySize.w;
      const scaleY = bitmap.height / imgDisplaySize.h;
      const sw = Math.max(1, Math.round(crop.w * scaleX));
      const sh = Math.max(1, Math.round(crop.h * scaleY));

      const canvas = document.createElement('canvas');
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas');
      ctx.drawImage(bitmap, crop.x * scaleX, crop.y * scaleY, sw, sh, 0, 0, sw, sh);

      const outType = sourceBlob.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, outType, 0.9));
      if (!blob) throw new Error('encode');

      const form = new FormData();
      form.append('file', blob, outType === 'image/png' ? 'image.png' : 'image.jpg');
      const upload = await fetch('/api/upload-image', { method: 'POST', body: form });
      const data = await upload.json().catch(() => ({}));
      if (!upload.ok || !data.url) throw new Error(data.error || 'upload');
      onApply(data.url);
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      setCropError(
        message && !['source', 'canvas', 'encode', 'upload'].includes(message)
          ? message
          : "Impossible de rogner cette image (elle est peut-être hébergée sur un autre site)."
      );
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60" onClick={onCancel}>
      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl p-6 max-w-[90vw] max-h-[90vh] flex flex-col gap-4" onClick={e => e.stopPropagation()}>
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
                    className="absolute w-3 h-3 bg-white dark:bg-neutral-900 border-2 border-blue-500 rounded-full z-10"
                    style={{ left: pos.left, top: pos.top, cursor: pos.cursor }}
                    onMouseDown={e => startDrag(e, corner)}
                  />
                );
              })}
            </>
          )}
        </div>

        {cropError && <p className="text-sm text-red-600">{cropError}</p>}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-5 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-neutral-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Annuler
          </button>
          <button onClick={applyCrop} disabled={isApplying} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-wait">
            {isApplying ? 'Envoi…' : 'Appliquer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main NodeView ──────────────────────────────────────────────
export function ResizableImageNodeView(props: NodeViewProps) {
  const { node, updateAttributes, selected, deleteNode, editor, getPos } = props;
  const { src, alt, width, height, rotation = 0, align = 'center' } = node.attrs;

  const imageRef = useRef<HTMLImageElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeWidth, setResizeWidth] = useState<number | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [prevSelected, setPrevSelected] = useState(selected);
  if (!selected && prevSelected) {
    setPrevSelected(false);
    setShowMoreMenu(false);
  } else if (selected && !prevSelected) {
    setPrevSelected(true);
  }

  /**
   * Borne une largeur souhaitée pour que l'image tienne dans UNE page :
   * pas plus large que la zone de texte, pas plus haute que la page.
   */
  const fitWidth = useCallback(
    (desired: number): number => {
      const dom = editor.view.dom as HTMLElement;
      const img = imageRef.current;
      let w = desired;
      const contentWidth = pageContentWidth(dom);
      if (contentWidth > 0) w = Math.min(w, contentWidth);
      if (img && img.naturalWidth && img.naturalHeight) {
        w = Math.min(w, (pageMaxHeight(dom) * img.naturalWidth) / img.naturalHeight);
      }
      return Math.max(MIN_WIDTH, Math.round(w));
    },
    [editor]
  );

  /** Hauteur correspondant à une largeur, selon le ratio réel de l'image. */
  const heightFor = useCallback((w: number): number | null => {
    const img = imageRef.current;
    if (!img || !img.naturalWidth || !img.naturalHeight) return null;
    return Math.round((w * img.naturalHeight) / img.naturalWidth);
  }, []);

  /**
   * Met à jour les attributs SANS créer d'étape d'annulation. Utilisé pour le
   * dimensionnement automatique au chargement : sinon le premier Ctrl+Z après
   * l'insertion ne faisait que « dé-redimensionner » l'image, et chaque
   * réaffichage du chapitre ajoutait une transaction dans l'historique.
   */
  const setAttrsSilently = useCallback(
    (attrs: Record<string, unknown>) => {
      if (typeof getPos !== 'function') return;
      const pos = getPos();
      if (typeof pos !== 'number') return;
      const current = editor.state.doc.nodeAt(pos);
      if (!current || current.type !== node.type) return;
      editor.view.dispatch(
        editor.state.tr
          .setNodeMarkup(pos, undefined, { ...current.attrs, ...attrs })
          .setMeta('addToHistory', false)
      );
    },
    [editor, getPos, node.type]
  );

  // Handle resizing logic. Les 4 coins appellent cette même fonction : seul
  // le signe du delta change selon que le coin tiré est à gauche (tl/bl —
  // s'écarter vers la gauche doit AGRANDIR, pas rétrécir) ou à droite
  // (tr/br). Avant, seule la poignée bas-droite avait un handler : les 3
  // autres étaient de simples carrés décoratifs, sans effet au clic.
  const startResize = useCallback(
    (event: React.MouseEvent<HTMLDivElement>, corner: 'tl' | 'tr' | 'bl' | 'br') => {
      event.preventDefault();
      event.stopPropagation();
      setIsResizing(true);

      const startX = event.clientX;
      const startWidth = imageRef.current?.offsetWidth || 0;
      const sign = corner === 'tl' || corner === 'bl' ? -1 : 1;

      const onMouseMove = (e: MouseEvent) => {
        const deltaX = (e.clientX - startX) * sign;
        const newWidth = fitWidth(startWidth + deltaX * (align === 'center' ? 2 : 1));
        setResizeWidth(newWidth);
      };

      const onMouseUp = () => {
        setIsResizing(false);
        setResizeWidth(null);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        if (imageRef.current) {
          const finalWidth = fitWidth(imageRef.current.offsetWidth);
          updateAttributes({ width: finalWidth, height: heightFor(finalWidth) });
        }
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [updateAttributes, align, fitWidth, heightFor]
  );

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

  // La largeur courante vient de l'attribut du nœud (`width`), pas d'un état
  // local : l'état `currentWidth`/`setCurrentWidth` a été supprimé lors d'un
  // correctif antérieur, mais ces deux fonctions y faisaient toujours
  // référence — cliquer sur « agrandir » ou « réduire » levait donc un
  // ReferenceError et bloquait le redimensionnement d'image dans l'éditeur.
  const resizeBy = (factor: number) => {
    const base = Number(width) || imageRef.current?.offsetWidth || 200;
    const newW = fitWidth(base * factor);
    updateAttributes({ width: newW, height: heightFor(newW) });
  };

  const increaseSize = () => resizeBy(1.1);
  const decreaseSize = () => resizeBy(0.9);

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
    // Nouveau ratio : largeur/hauteur recalculées au chargement (onLoad).
    updateAttributes({ src: croppedSrc, width: null, height: null });
    setShowCropModal(false);
  };

  // Alignment classes mapping
  const alignClasses = {
    'left': 'float-left mr-4',
    'center': 'block mx-auto',
    'right': 'float-right ml-4',
  };

  return (
    <NodeViewWrapper 
      className={`relative max-w-full clear-none ${alignClasses[align as keyof typeof alignClasses] || 'block mx-auto'} ${selected ? 'ring-1 ring-blue-500 border border-blue-500' : 'border border-transparent'}`}
      style={{ 
        width: isResizing && resizeWidth ? `${resizeWidth}px` : (width ? `${width}px` : 'auto'),
      }}
    >
      <img
        ref={imageRef}
        src={src}
        alt={alt || ''}
        draggable={false}
        className="w-full h-auto block select-none"
        style={{
          transform: rotation ? `rotate(${rotation}deg)` : undefined,
          // Dimensions connues (largeur + hauteur enregistrées) : la place est
          // réservée AVANT le chargement, la pagination ne saute plus quand
          // l'image arrive.
          aspectRatio: width && height ? `${width} / ${height}` : undefined,
          // Garde-fou CSS : même une image ancienne, jamais redimensionnée,
          // ne peut plus dépasser la hauteur d'une page.
          maxHeight: `calc(var(--page-max-height, ${FALLBACK_PAGE_MAX_HEIGHT}px) - ${PAGE_SAFETY_MARGIN}px)`,
          objectFit: 'contain',
        }}
        onLoad={() => {
          const img = imageRef.current;
          if (!img) return;
          // Première insertion (pas de largeur enregistrée) ou image trop
          // grande pour la page : on la borne d'emblée à une taille qui tient
          // dans UNE page, en largeur comme en hauteur.
          const desired = Number(width) || Math.min(img.naturalWidth || DEFAULT_WIDTH, DEFAULT_WIDTH);
          const target = fitWidth(desired);
          const targetHeight = heightFor(target);
          if (target !== Number(width) || targetHeight !== Number(height)) {
            setAttrsSilently({ width: target, height: targetHeight });
          } else if (editor.view) {
            // Taille inchangée : on signale tout de même à la pagination que
            // le contenu a désormais sa hauteur réelle.
            editor.view.dispatch(editor.state.tr);
          }
        }}
      />

      {/* Resize Handles */}
      {selected && (
        <>
          <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white dark:bg-neutral-900 border border-blue-500 rounded-sm cursor-se-resize z-10" onMouseDown={(e) => startResize(e, 'br')} />
          <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white dark:bg-neutral-900 border border-blue-500 rounded-sm cursor-sw-resize z-10" onMouseDown={(e) => startResize(e, 'bl')} />
          <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white dark:bg-neutral-900 border border-blue-500 rounded-sm cursor-ne-resize z-10" onMouseDown={(e) => startResize(e, 'tr')} />
          <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white dark:bg-neutral-900 border border-blue-500 rounded-sm cursor-nw-resize z-10" onMouseDown={(e) => startResize(e, 'tl')} />
        </>
      )}

      {/* Main Floating Toolbar */}
      {selected && (
        <div 
          className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white dark:bg-neutral-900 border border-gray-200 shadow-md rounded-md p-1 z-20"
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
          className="absolute -top-12 left-full ml-2 w-48 flex flex-col bg-white dark:bg-neutral-900 border border-gray-200 shadow-lg rounded-lg py-2 z-30 text-sm"
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
