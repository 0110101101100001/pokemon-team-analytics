// Logos do header por tema: a partir das artes grandes (design/logos/logo-<arquivo>.png, 3120 × 1080, com margem
// transparente) gera public/logo-<arquivo>.png (372 × 96) e @2x (744 × 192), recortadas no mesmo
// retângulo da logo do Smeargle, para todas terem a mesma proporção e caberem na mesma caixa do header.
// O Smeargle não é gerado: public/logo-smeargle*.png são os arquivos que o site já usava.
// Depois gera public/logo-*.webp a partir de todos os PNG de logo (é o formato que o site usa).
// Uso: npm run build:logos (na pasta frontend), ou só alguns temas, pelo nome do arquivo:
//   npm run build:logos -- aggron ninetalesshiny
// (assim um tema novo não regrava as logos que já existem).
import sharp from 'sharp';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
// Toda arte em design/logos, menos a do Smeargle. O nome do arquivo é o que o mapa de themes.js usa
// (o Darkrai Shiny é "darkraishiny").
const ONLY = process.argv.slice(2);
const THEMES = readdirSync(`${ROOT}design/logos`)
  .map((file) => file.match(/^logo-([a-z]+)\.png$/)?.[1])
  .filter((name) => name && name !== 'smeargle' && (!ONLY.length || ONLY.includes(name)))
  .sort();
const missing = ONLY.filter((name) => !THEMES.includes(name));
if (missing.length) throw new Error(`Sem arte em design/logos para: ${missing.join(', ')}`);
// Caixa da arte dentro da tela de 3120 × 1080 (a mesma em todos os temas; medida pelo canal alfa).
const CROP = { left: 22, top: 176, width: 3054, height: 789 };
const SIZES = [
  { suffix: '', width: 372, height: 96 },
  { suffix: '@2x', width: 744, height: 192 },
];

for (const theme of THEMES) {
  const source = `${ROOT}design/logos/logo-${theme}.png`;
  const { width, height, hasAlpha } = await sharp(source).metadata();
  if (width !== 3120 || height !== 1080 || !hasAlpha) {
    throw new Error(`${source}: esperado 3120 × 1080 com canal alfa, veio ${width} × ${height}${hasAlpha ? '' : ' sem alfa'}`);
  }
  for (const size of SIZES) {
    const target = `${ROOT}public/logo-${theme}${size.suffix}.png`;
    // 3054 × 789 → 744 × 192 estica 0,1% na largura: invisível, e a caixa fica igual à do Smeargle.
    const info = await sharp(source)
      .extract(CROP)
      .resize(size.width, size.height, { fit: 'fill', kernel: 'lanczos3' })
      // RGBA de verdade (sem paleta): a borda suave do pincel precisa do alfa inteiro.
      .png({ compressionLevel: 9, adaptiveFiltering: true, palette: false })
      .toFile(target);
    console.log(`${target.slice(ROOT.length)}: ${info.width} × ${info.height}, ${(info.size / 1024).toFixed(1)} KB`);
  }
}

// O site usa as versões WebP (cerca de 1/3 do PNG, com o alfa sem perda): uma para cada PNG de logo em public/,
// incluindo as do Smeargle e as reduzidas, que não saem deste script. Os PNG continuam como fonte.
const WEBP = { quality: 90, alphaQuality: 100, effort: 6 };
// Com nomes na linha de comando, só os PNG desses temas (completa, @2x e reduzida).
const ownsFile = (file) => !ONLY.length || ONLY.some((name) => new RegExp(`^logo-(reduzida-)?${name}(@2x)?\\.png$`).test(file));
for (const file of readdirSync(`${ROOT}public`).filter((name) => /^logo-.+\.png$/.test(name) && ownsFile(name)).sort()) {
  const target = `${ROOT}public/${file.replace(/\.png$/, '.webp')}`;
  const info = await sharp(`${ROOT}public/${file}`).webp(WEBP).toFile(target);
  console.log(`${target.slice(ROOT.length)}: ${(info.size / 1024).toFixed(1)} KB`);
}
