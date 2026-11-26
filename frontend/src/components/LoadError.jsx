import { TriangleAlert } from 'lucide-react';

/**
 * Falha ao carregar uma lista inteira da página: o recado e, se houver `onRetry`, o botão "Tentar de novo".
 * O mesmo bloco em todas as abas (Itens, Liga...), no lugar do conteúdo que não chegou.
 */
export default function LoadError({ message, onRetry, className = 'py-16' }) {
  return (
    <div role="alert" className={`flex flex-col items-center gap-3 text-center ${className}`}>
      <p className="flex items-center gap-2 font-reading text-sm text-vermilion-deep">
        <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
        {message}
      </p>
      {onRetry && <button type="button" onClick={onRetry} className="btn-outline">Tentar de novo</button>}
    </div>
  );
}
