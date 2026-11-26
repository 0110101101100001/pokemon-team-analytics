// Logos do header por tema: a partir das artes grandes (design/logos/logo-<arquivo>.png, 3120 × 1080, com margem
// transparente) gera public/logo-<arquivo>.png (372 × 96) e @2x (744 × 192), recortadas no mesmo
// retângulo da logo do Smeargle, para todas terem a mesma proporção e caberem na mesma caixa do header.
// O Smeargle não é gerado: public/logo-smeargle*.png são os arquivos que o site já usava.
// Uso: npm run build:logos (na pasta frontend).
import sharp from 'sharp';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
// Toda arte em design/logos, menos a do Smeargle. O nome do arquivo é o que o mapa de themes.js usa
// (o Darkrai Shiny é "darkraishiny").
const THEMES = readdirSync(`${ROOT}design/logos`)
  .map((file) => file.match(/^logo-([a-z]+)\.png$/)?.[1])
  .filter((name) => name && name !== 'smeargle')
  .sort();
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
