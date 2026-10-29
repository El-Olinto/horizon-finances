'use client';

import { useState, useRef, useEffect } from 'react';

interface AvatarCropModalProps {
  imageSrc: string | null;
  isOpen: boolean;
  onClose: () => void;
  onCropComplete: (croppedBlob: Blob) => void;
}

export default function AvatarCropModal({
  imageSrc,
  isOpen,
  onClose,
  onCropComplete,
}: AvatarCropModalProps) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, imageSrc]);

  if (!isOpen || !imageSrc) return null;

  // Eventos de arrastar (Mouse)
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Eventos de arrastar (Touch / Mobile)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPosition({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => setIsDragging(false);

  // Processa o recorte circular em Canvas (300x300)
  const handleSaveCrop = () => {
    if (!imageRef.current) return;

    const canvas = document.createElement('canvas');
    const size = 300;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Máscara circular perfeita
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    const img = imageRef.current;
    const previewSize = 250; // tamanho do círculo da UI
    const scaleRatio = size / previewSize;

    // Dimensões naturais e ajustadas
    const aspect = img.naturalWidth / img.naturalHeight;
    let baseWidth = previewSize;
    let baseHeight = previewSize;

    if (aspect > 1) {
      baseWidth = previewSize * aspect;
    } else {
      baseHeight = previewSize / aspect;
    }

    const renderWidth = baseWidth * zoom * scaleRatio;
    const renderHeight = baseHeight * zoom * scaleRatio;
    const renderX = (size - renderWidth) / 2 + position.x * scaleRatio;
    const renderY = (size - renderHeight) / 2 + position.y * scaleRatio;

    ctx.drawImage(img, renderX, renderY, renderWidth, renderHeight);

    canvas.toBlob((blob) => {
      if (blob) onCropComplete(blob);
    }, 'image/jpeg', 0.92);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-sm p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xl space-y-5 select-none">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--text-main)]">Ajustar Foto de Perfil</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--accent-light)] transition-colors text-xs font-bold"
          >
            ✕
          </button>
        </div>

        {/* Viewport de Crop */}
        <div className="relative flex justify-center">
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="w-[250px] h-[250px] rounded-full overflow-hidden border-2 border-[var(--accent)] cursor-grab active:cursor-grabbing relative bg-black/40 shadow-inner flex items-center justify-center"
          >
            {/* Imagem arrastável e com zoom */}
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Pré-visualização"
              draggable={false}
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                transition: isDragging ? 'none' : 'transform 0.05s ease-out',
                maxWidth: 'none',
                minWidth: '100%',
                minHeight: '100%',
                objectFit: 'contain',
              }}
            />
          </div>
        </div>

        <p className="text-[11px] text-center text-[var(--text-muted)]">
          Arraste com o cursor para posicionar e use o slider para dar zoom.
        </p>

        {/* Slider de Zoom */}
        <div className="space-y-1.5 px-2">
          <div className="flex justify-between text-[11px] font-bold text-[var(--text-muted)]">
            <span>Zoom</span>
            <span>{Math.round(zoom * 100)}%</span>
          </div>
          <input
            type="range"
            min="1"
            max="3"
            step="0.05"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-full accent-[var(--accent)] cursor-pointer"
          />
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-main)] hover:bg-[var(--accent-light)] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSaveCrop}
            className="flex-1 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-xs font-bold text-white transition-all shadow-md active:scale-95"
          >
            Aplicar Foto
          </button>
        </div>
      </div>
    </div>
  );
}