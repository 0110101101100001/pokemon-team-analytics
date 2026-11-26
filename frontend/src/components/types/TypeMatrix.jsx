import { memo, useCallback, useRef, useState } from 'react';
import { TYPE_ABBREVIATIONS, TYPE_CHART, TYPE_NAMES } from '../../data/typeChart';
import { capitalize } from '../../utils/typeColors';

const SIZE = TYPE_NAMES.length;

// Símbolo e texto de cada multiplicador: a célula nunca depende só da cor (2, ½, 0; o neutro fica vazio).
const VALUE_INFO = {
  2: { symbol: '2', short: '2×', words: '2 vezes', meaning: 'super efetivo' },
  1: { symbol: '', short: '1×', words: '1 vez', meaning: 'normal' },
  0.5: { symbol: '½', short: '½×', words: 'meia vez', meaning: 'pouco efetivo' },
  0: { symbol: '0', short: '0×', words: 'nenhum dano', meaning: 'sem efeito' },
};

/** "Fire → Grass: 2× (super efetivo)", o texto do destaque e do tooltip de uma célula. */
export function cellSummary(attack, defense) {
  const info = VALUE_INFO[TYPE_CHART[attack][defense]];
  return `${capitalize(attack)} → ${capitalize(defense)}: ${info.short} (${info.meaning})`;
}

const cellLabel = (attack, defense) => {
  const info = VALUE_INFO[TYPE_CHART[attack][defense]];
  return `${capitalize(attack)} contra ${capitalize(defense)}: ${info.words}, ${info.meaning}`;
};

// Até onde o cabeçalho mostra a abreviação: as linhas trocam pelo nome a partir do sm; as colunas, só no 2xl.
const LABEL_BREAKPOINTS = {
  row: { short: 'sm:hidden', full: 'hidden sm:inline' },
  col: { short: '2xl:hidden', full: 'hidden 2xl:inline' },
};

/** Botão de tipo dos cabeçalhos: o chip do tipo, abreviado onde a tela é estreita, e o nome inteiro no tooltip. */
function HeaderChip({ type, axis, selected, highlighted, onSelect }) {
  const name = capitalize(type);
  const labels = LABEL_BREAKPOINTS[axis];
  return (
    <button
      type="button"
      onClick={() => onSelect(type)}
      title={`${name}: ver o resumo do tipo`}
      aria-label={`${name}: ver o resumo do tipo`}
      aria-pressed={selected}
      data-type={type}
      className={`type-chip !px-1.5 !text-[10px] cursor-pointer transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-paint-cobalt focus-visible:ring-offset-1 motion-reduce:transition-none ${
        selected ? 'ring-2 ring-ink ring-offset-1' : ''
      } ${highlighted ? 'scale-110 motion-reduce:scale-100' : ''}`}
    >
      <span className={labels.short}>{TYPE_ABBREVIATIONS[type]}</span>
      <span className={labels.full}>{name}</span>
    </button>
  );
}

/**
 * Matriz 18 × 18 da tabela de tipos: linhas = atacante, colunas = defensor. <table> com caption e <th scope>;
 * as células são navegáveis por setas (um tabindex só, "roving"), Enter escolhe o tipo da linha e Shift+Enter o da
 * coluna. Mouse ou foco numa célula destacam a linha e a coluna e escrevem o resumo acima da tabela.
 * Clicar num cabeçalho escolhe o tipo (`onSelectType`).
 */
function TypeMatrix({ selected, onSelectType }) {
  const [cursor, setCursor] = useState({ row: 0, col: 0 });
  const [spot, setSpot] = useState(null);
  const cells = useRef([]);

  const focusCell = useCallback((row, col) => {
    const next = { row: Math.max(0, Math.min(SIZE - 1, row)), col: Math.max(0, Math.min(SIZE - 1, col)) };
    setCursor(next);
    cells.current[next.row * SIZE + next.col]?.focus();
  }, []);

  const handleKey = (event, row, col) => {
    const moves = {
      ArrowRight: [row, col + 1],
      ArrowLeft: [row, col - 1],
      ArrowDown: [row + 1, col],
      ArrowUp: [row - 1, col],
      Home: event.ctrlKey ? [0, 0] : [row, 0],
      End: event.ctrlKey ? [SIZE - 1, SIZE - 1] : [row, SIZE - 1],
      PageUp: [0, col],
      PageDown: [SIZE - 1, col],
    };
    if (moves[event.key]) {
      event.preventDefault();
      focusCell(...moves[event.key]);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelectType(TYPE_NAMES[event.shiftKey ? col : row]);
    }
  };

  const leaveTable = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setSpot(null);
  };

  const readout = spot ? cellSummary(TYPE_NAMES[spot.row], TYPE_NAMES[spot.col]) : null;

  return (
    <div>
      <p aria-hidden="true" className="mb-2 min-h-5 font-reading text-sm text-ink">
        {readout ?? <span className="italic text-ink-soft">Passe o mouse ou use as setas numa célula para ler o confronto.</span>}
      </p>
      {/* A rolagem fica na caixa da matriz: os cabeçalhos grudam nela, e a página não rola para os lados. */}
      <div className="max-h-[min(78vh,44rem)] w-fit max-w-full overflow-auto rounded-[4px] border border-line bg-surface [scrollbar-width:thin]">
        <table className="border-separate border-spacing-0 font-mono text-sm" onMouseLeave={() => setSpot(null)} onBlur={leaveTable}>
          <caption className="sr-only">
            Tabela de tipos: as linhas são o tipo do ataque e as colunas o tipo do defensor. Use as setas para andar
            entre as células, Enter para ver o resumo do tipo atacante e Shift+Enter para o do defensor.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 top-0 z-30 border-b border-r border-line bg-surface px-2 py-1.5 text-left align-bottom font-reading text-[10px] font-semibold uppercase leading-tight tracking-[0.06em] text-muted">
                <span className="block whitespace-nowrap"><span className="sm:hidden">Atq.</span><span className="hidden sm:inline">Ataque</span> ↓</span>
                <span className="block whitespace-nowrap"><span className="sm:hidden">Def.</span><span className="hidden sm:inline">Defesa</span> →</span>
              </th>
              {TYPE_NAMES.map((type, col) => (
                <th
                  key={type}
                  scope="col"
                  className="type-cell sticky top-0 z-20 border-b border-line px-0.5 py-1.5 text-center"
                  data-hl={spot?.col === col}
                >
                  <HeaderChip type={type} axis="col" selected={selected === type} highlighted={spot?.col === col} onSelect={onSelectType} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TYPE_NAMES.map((attack, row) => (
              <tr key={attack}>
                <th scope="row" className="type-cell sticky left-0 z-10 border-r border-line px-1.5 py-0.5 text-left" data-hl={spot?.row === row}>
                  <HeaderChip type={attack} axis="row" selected={selected === attack} highlighted={spot?.row === row} onSelect={onSelectType} />
                </th>
                {TYPE_NAMES.map((defense, col) => {
                  const value = TYPE_CHART[attack][defense];
                  const isCursor = cursor.row === row && cursor.col === col;
                  return (
                    <td
                      key={defense}
                      ref={(node) => { cells.current[row * SIZE + col] = node; }}
                      tabIndex={isCursor ? 0 : -1}
                      aria-label={cellLabel(attack, defense)}
                      title={cellSummary(attack, defense)}
                      data-value={value}
                      data-hl={spot != null && (spot.row === row || spot.col === col)}
                      onMouseEnter={() => setSpot({ row, col })}
                      onFocus={() => { setSpot({ row, col }); setCursor({ row, col }); }}
                      onKeyDown={(event) => handleKey(event, row, col)}
                      className="type-cell h-8 w-9 min-w-9 border-b border-r border-line/50 text-center font-bold focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-paint-cobalt sm:h-9 sm:w-10 lg:w-12"
                    >
                      <span aria-hidden="true">{VALUE_INFO[value].symbol}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default memo(TypeMatrix);
