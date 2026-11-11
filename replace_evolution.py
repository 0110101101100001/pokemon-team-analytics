import sys

path = 'C:/Users/Kaique/Desktop/projetos/pokemon-team-analytics/frontend/src/components/PokemonDrawer.jsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the extractEvolutionChain function
old_fn = '''/**
 * Extrai a árvore evolutiva linearmente com nível/método de cada estágio.
 */
function extractEvolutionChain(chain) {
  const stages = [];
  let current = chain;
  while (current) {
    stages.push({
      name: current.species.name,
      url: current.species.url,
      evolves_to: current.evolves_to || [],
      evolution_details: current.evolution_details || [],
    });
    current = current.evolves_to?.[0] || null;
  }
  return stages;
}'''

new_fn = '''/**
 * Extrai a árvore evolutiva recursivamente, suportando múltiplas ramificações (split evolutions).
 */
function extractEvolutionTree(chain) {
  if (!chain) return null;
  return {
    name: chain.species.name,
    url: chain.species.url,
    evolution_details: chain.evolution_details || [],
    evolves_to: (chain.evolves_to || []).map(child => extractEvolutionTree(child)),
  };
}'''

if old_fn not in content:
    print('ERROR: extractEvolutionChain function not found')
    sys.exit(1)

content = content.replace(old_fn, new_fn)

# Portuguese translation map for evolution items
item_translation_map = {
    'MOON-STONE': 'Pedra Lunar',
    'WATER-STONE': 'Pedra Água',
    'FIRE-STONE': 'Pedra Fogo',
    'THUNDER-STONE': 'Pedra Trovão',
    'LEAF-STONE': 'Pedra Folha',
    'SUN-STONE': 'Pedra Sol',
    'DUSK-STONE': 'Pedra Crepúsculo',
    'DAWN-STONE': 'Pedra Aurora',
    'SHINY-STONE': 'Pedra Brilhante',
    'ICE-STONE': 'Pedra Gelo',
    'OVAL-STONE': 'Pedra Oval',
    'RAZOR-CLAW': 'Ganho Gadanho',
    'RAZOR-FANG': 'Ganho Presa',
    'PRISM-STONE': 'Pedra Prisma',
}

# Build the item translation function code
item_map_js = 'const ITEM_TRANSLATIONS = {\n'
for k, v in item_translation_map.items():
    item_map_js += f'  {k}: "{v}",\n'
item_map_js += '};'

# Insert item translation map after extractEvolutionTree function
insert_after = new_fn + '\n\n'
item_map_code = insert_after + item_map_js + '\n\n'

content = content.replace(new_fn + '\n', item_map_code)

# Now replace the evolution rendering section
old_render = '''        {/* Cadeia Evolutiva */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="section-title">Evolução</span>
            <span className="text-xs text-smeargle-textDim uppercase tracking-wider">Árvore evolutiva</span>
          </div>
          {evolutionChain ? (
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {extractEvolutionChain(evolutionChain).map((stage, i) => {
                const detailStage = stage.evolution_details?.[0] || {};
                const triggerItem = detailStage.item?.name || null;
                const triggerLevel = detailStage.min_level || null;
                const triggerMethod = detailStage.move_learn_method?.name || detailStage.trigger?.name || 'level-up';

                // Traduzir método de evolução para português
                let triggerLabel = '';
                if (triggerItem) {
                  triggerLabel = `Item: ${triggerItem}`;
                } else if (triggerLevel) {
                  triggerLabel = `Nível ${triggerLevel}`;
                } else if (triggerMethod === 'level-up') {
                  triggerLabel = 'Nível';
                } else if (triggerMethod === 'trade') {
                  triggerLabel = 'Troca';
                } else if (triggerMethod === 'use-item') {
                  triggerLabel = 'Item';
                } else if (triggerMethod === 'friendship') {
                  triggerLabel = 'Amizade';
                } else {
                  triggerLabel = capitalize(triggerMethod);
                }

                const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${getPokemonIdFromUrl(stage.url)}.png`;
                return (
                  <div key={stage.name} className="flex flex-col items-center gap-1">
                    <img src={spriteUrl} alt={stage.name} className="w-12 h-12 object-contain drop-shadow-sm" />
                    <div className="text-center">
                      <span className="block text-xs font-bold text-smeargle-text capitalize">{stage.name}</span>
                      {triggerLabel && (
                        <span className="block text-[10px] text-smeargle-textDim/70 uppercase tracking-wider">
                          {triggerLabel}
                        </span>
                      )}
                    </div>
                    {i < extractEvolutionChain(evolutionChain).length - 1 && (
                      <ArrowRight className="w-3 h-3 text-smeargle-textDim mx-1 mt-8" />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-smeargle-textDim">Sem dados evolutivos disponíveis.</p>
          )}
        </div>'''

new_render = '''        {/* Cadeia Evolutiva (suporte a split evolutions) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="section-title">Evolução</span>
            <span className="text-xs text-smeargle-textDim uppercase tracking-wider">Árvore evolutiva</span>
          </div>
          {evolutionChain ? (
            <EvolutionTreeNode
              chain={evolutionChain}
              parentLabel=""
              depth={0}
            />
          ) : (
            <p className="text-xs text-smeargle-textDim">Sem dados evolutivos disponíveis.</p>
          )}
        </div>'''

if old_render not in content:
    print('ERROR: Evolution render block not found')
    sys.exit(1)

content = content.replace(old_render, new_render)

# Now add the EvolutionTreeNode component before the closing of the file (before capitalize function)
component_code = '''

function EvolutionTreeNode({ chain, parentLabel, depth }) {
  if (!chain) return null;

  const detailStage = chain.evolution_details?.[0] || {};
  const triggerItem = detailStage.item?.name || null;
  const triggerLevel = detailStage.min_level || null;
  const triggerMethod = detailStage.move_learn_method?.name || detailStage.trigger?.name || 'level-up';

  // Traduzir método de evolução para português
  let triggerLabel = '';
  if (triggerItem) {
    const itemKey = triggerItem.toUpperCase();
    triggerLabel = ITEM_TRANSLATIONS[itemKey] || `Item: ${triggerItem}`;
  } else if (triggerLevel) {
    triggerLabel = `Nível ${triggerLevel}`;
  } else if (triggerMethod === 'level-up') {
    triggerLabel = 'Nível';
  } else if (triggerMethod === 'trade') {
    triggerLabel = 'Troca';
  } else if (triggerMethod === 'use-item') {
    triggerLabel = 'Item';
  } else if (triggerMethod === 'friendship') {
    triggerLabel = 'Amizade';
  } else {
    triggerLabel = capitalize(triggerMethod);
  }

  const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${getPokemonIdFromUrl(chain.url)}.png`;
  const children = chain.evolves_to || [];
  const hasChildren = children.length > 0;

  return (
    <div key={chain.name} className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-2">
        {depth > 0 && (
          <ArrowRight className="w-3 h-3 text-smeargle-textDim mt-2" />
        )}
        <div className="flex flex-col items-center gap-1">
          <img src={spriteUrl} alt={chain.name} className="w-12 h-12 object-contain drop-shadow-sm" />
          <div className="text-center">
            <span className="block text-xs font-bold text-smeargle-text capitalize">{chain.name}</span>
            {triggerLabel && (
              <span className="block text-[10px] text-smeargle-textDim/70 uppercase tracking-wider">
                {triggerLabel}
              </span>
            )}
          </div>
        </div>
      </div>
      {hasChildren && (
        <div className="flex flex-col items-center gap-2 mt-2">
          {children.map((child, idx) => (
            <EvolutionTreeNode key={child.name} chain={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

'''

# Insert EvolutionTreeNode before capitalize function
capitalize_marker = 'function capitalize(str) {'
if capitalize_marker not in content:
    print('ERROR: capitalize function not found')
    sys.exit(1)

content = content.replace(capitalize_marker, component_code + capitalize_marker)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('SUCCESS: Evolution tree refactored')
