path = r'C:/Users/Kaique/Desktop/projetos/pokemon-team-analytics/frontend/src/components/PokemonDrawer.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('              ))}', '              )}')
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done')