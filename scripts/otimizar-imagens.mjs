/** Gera arquivos WebP locais dos originais do Figma, preservando composição e proporção. */
import sharp from 'sharp';
import { mkdir, readdir } from 'node:fs/promises';
await mkdir('public/imagens', { recursive: true });
const arquivos = await readdir('assets/originais');
for (const arquivo of arquivos.filter((nome) => nome.endsWith('.png'))) {
  await sharp(`assets/originais/${arquivo}`)
    .resize({ width: 640, withoutEnlargement: true })
    .webp({ quality: 85 })
    .toFile(`public/imagens/${arquivo.replace('.png', '.webp')}`);
}
