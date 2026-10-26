import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/** Avisos informativos podem ser dispensados sem esconder erros de formulário. */
export function AvisoTempoReal({
  aviso,
  fechar,
}: {
  aviso: { mensagem: string; id: number } | null;
  fechar: () => void;
}) {
  const inicio = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (!aviso) return;
    const timer = window.setTimeout(fechar, 3000);
    return () => window.clearTimeout(timer);
  }, [aviso, fechar]);
  return (
    <div className="aviso-tempo-real" aria-live="polite" aria-atomic="true">
      {aviso && (
        <div
          className="conteudo-aviso"
          onTouchStart={(evento) => {
            const toque = evento.touches[0];
            inicio.current = { x: toque.clientX, y: toque.clientY };
          }}
          onTouchEnd={(evento) => {
            const toque = evento.changedTouches[0];
            const origem = inicio.current;
            inicio.current = null;
            if (
              origem &&
              Math.abs(toque.clientX - origem.x) > 50 &&
              Math.abs(toque.clientX - origem.x) > Math.abs(toque.clientY - origem.y)
            )
              fechar();
          }}
        >
          <span>{aviso.mensagem}</span>
          <button type="button" aria-label="Fechar aviso" onClick={fechar}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
