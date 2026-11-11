import sys

path = 'C:/Users/Kaique/Desktop/projetos/pokemon-team-analytics/frontend/src/components/PokemonDrawer.jsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the section to replace
start_marker = '            <div className="grid grid-cols-3 gap-4">\n              <thead>'
end_marker = '            </div>\n          </div>\n        </div>\n\n        {/* Smogon stats */}'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1:
    print('ERROR: Start marker not found')
    sys.exit(1)

end_idx = content.find(end_marker, start_idx)
if end_idx == -1:
    print('ERROR: End marker not found')
    sys.exit(1)

# Include the end_marker in the replacement end
end_idx += len(end_marker)

new_section = '''            <div className="grid grid-cols-3 gap-4">
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
                        key={`${name}-${mult}`}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#FECACA] border border-[#FECACA]/50 text-[#991B1B]"
                      >
                        <PokemonTypeBadge type={name} className="text-[10px] px-2 py-0.5" />
                        <span className="text-[10px] font-bold">{mult}×</span>
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
                        key={`${name}-${mult}`}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#DCFCE7] border border-[#DCFCE7]/50 text-[#166534]"
                      >
                        <PokemonTypeBadge type={name} className="text-[10px] px-2 py-0.5" />
                        <span className="text-[10px] font-bold">{mult}×</span>
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
            </div>'''

new_content = content[:start_idx] + new_section + content[end_idx:]

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print('SUCCESS: Replacement done')
