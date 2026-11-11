const fs = require('fs');
const path = 'C:\\Users\\Kaique\\Desktop\\projetos\\pokemon-team-analytics\\frontend\\src\\components\\PokemonDrawer.jsx';
let content = fs.readFileSync(path, 'utf8');

const oldBlock = `            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-smeargle-border/50">
                  <th className="pb-2 text-xs text-smeargle-textDim uppercase font-semibold w-20">Fraquezas</th>
                  <th className="pb-2 text-xs text-smeargle-textDim uppercase font-semibold w-20">Resistências</th>
                  <th className="pb-2 text-xs text-smeargle-textDim uppercase font-semibold w-18">Imunidades</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-smeargle-border/30">
                  <td className="pt-3 pb-3">
                    {/* Fraquezas: double (2x) e quadruple (4x) */}
                    <div className="flex flex-wrap gap-2">
                      {[...(typeEffectiveness?.quadruple || []).map((t) => ({ name: t, mult: 4 })),
                       ...(typeEffectiveness?.double || []).map((t) => ({ name: t, mult: 2 }))].map(
                         ({ name, mult }) => (
                           <span
                             key=\`\${name}-\${mult}\`}
                             className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#FECACA] border border-[#FECACA]/50"
                           >
                             <PokemonTypeBadge type={name} className="w-16 h-16" />
                             <span className="text-[10px] font-bold text-[#991B1B]">\${mult}×</span>
                           </span>
                         )
                       )}
                      {(typeEffectiveness?.quadruple?.length === 0 && typeEffectiveness?.double?.length === 0) && (
                        <span className="text-[10px] text-smeargle-textDim/50 italic">Nenhuma</span>
                      )}
                    </div>
                  </td>
                  <td className="pt-3 pb-3">
                    {/* Resistências: half (0.5x) e quarter (0.25x) */}
                    <div className="flex flex-wrap gap-2">
                      {[...(typeEffectiveness?.quarter || []).map((t) => ({ name: t, mult: 0.25 })),
                       ...(typeEffectiveness?.half || []).map((t) => ({ name: t, mult: 0.5 }))].map(
                         ({ name, mult }) => (
                           <span
                             key=\`\${name}-\${mult}\`}
                             className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#DCFCE7] border border-[#DCFCE7]/50"
                           >
                             <PokemonTypeBadge type={name} className="w-16 h-16" />
                             <span className="text-[10px] font-bold text-[#166534]">\${mult}×</span>
                           </span>
                         )
                       )}
                      {(typeEffectiveness?.quarter?.length === 0 && typeEffectiveness?.half?.length === 0) && (
                        <span className="text-[10px] text-smeargle-textDim/50 italic">Nenhuma</span>
                      )}
                    </div>
                  </td>
                  <td className="pt-3 pb-3">
                    {/* Imunidades: 0x */}
                    <div className="flex flex-wrap gap-2">
                      {(typeEffectiveness?.immune || []).map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#E5E7EB] border border-[#E5E7EB]/50"
                        >
                          <PokemonTypeBadge type={t} className="w-16 h-16" />
                          <span className="text-[10px] font-bold text-[#4B5563]">0×</span>
                        </span>
                      )}
                      {(typeEffectiveness?.immune?.length === 0) && (
                        <span className="text-[10px] text-smeargle-textDim/50 italic">Nenhuma</span>
                      )}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>`;

const newBlock = `            <div className="grid grid-cols-3 gap-4">
              {/* Fraquezas */}
              <div>
                <div className="flex items-center gap-1 mb-2">
                  <span className="text-[10px] font-bold text-[#991B1B]">⚠</span>
                  <span className="text-xs font-bold text-[#991B1B] uppercase">Fraquezas</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[...(typeEffectiveness?.quadruple || []).map((t) => ({ name: t, mult: 4 })),
                   ...(typeEffectiveness?.double || []).map((t) => ({ name: t, mult: 2 }))].map(
                    ({ name, mult }) => (
                      <span
                        key=\`\${name}-\${mult}\`}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#FECACA] border border-[#FECACA]/50 text-[#991B1B]"
                      >
                        <PokemonTypeBadge type={name} className="text-[10px] px-2 py-0.5" />
                        <span className="text-[10px] font-bold">\${mult}×</span>
                      </span>
                    )
                  )}
                  {(typeEffectiveness?.quadruple?.length === 0 && typeEffectiveness?.double?.length === 0) && (
                    <span className="text-[10px] text-smeargle-textDim/50 italic">Nenhuma</span>
                  )}
                </div>
              </div>

              {/* Resistências */}
              <div>
                <div className="flex items-center gap-1 mb-2">
                  <span className="text-[10px] font-bold text-[#166534]">✓</span>
                  <span className="text-xs font-bold text-[#166534] uppercase">Resistências</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[...(typeEffectiveness?.quarter || []).map((t) => ({ name: t, mult: 0.25 })),
                   ...(typeEffectiveness?.half || []).map((t) => ({ name: t, mult: 0.5 }))].map(
                    ({ name, mult }) => (
                      <span
                        key=\`\${name}-\${mult}\`}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#DCFCE7] border border-[#DCFCE7]/50 text-[#166534]"
                      >
                        <PokemonTypeBadge type={name} className="text-[10px] px-2 py-0.5" />
                        <span className="text-[10px] font-bold">\${mult}×</span>
                      </span>
                    )
                  )}
                  {(typeEffectiveness?.quarter?.length === 0 && typeEffectiveness?.half?.length === 0) && (
                    <span className="text-[10px] text-smeargle-textDim/50 italic">Nenhuma</span>
                  )}
                </div>
              </div>

              {/* Imunidades */}
              <div>
                <div className="flex items-center gap-1 mb-2">
                  <span className="text-[10px] font-bold text-[#4B5563]">🛡</span>
                  <span className="text-xs font-bold text-[#4B5563] uppercase">Imunidades</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(typeEffectiveness?.immune || []).map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#E5E7EB] border border-[#E5E7EB]/50 text-[#4B5563]"
                    >
                      <PokemonTypeBadge type={t} className="text-[10px] px-2 py-0.5" />
                      <span className="text-[10px] font-bold">0×</span>
                    </span>
                  ))}
                  {(typeEffectiveness?.immune?.length === 0) && (
                    <span className="text-[10px] text-smeargle-textDim/50 italic">Nenhuma</span>
                  )}
                </div>
              </div>
            </div>`;

if (content.includes(oldBlock)) {
  content = content.replace(oldBlock, newBlock);
  fs.writeFileSync(path, content);
  console.log('SUCCESS: Replacement done');
} else {
  console.log('FAIL: Old block not found');
  const idx = content.indexOf('<table className');
  console.log('table index:', idx);
  if (idx >= 0) console.log('context:', content.substring(idx, idx+200));
}
