/** Confere todas as telas em seis larguras e em uma viewport equivalente a zoom de 200%. */
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { abrir, entrar, adicionar, revisarCompra } from '../tests/apoio.ts';

const origem = process.env.URL_APLICACAO || 'https://kurio-jungle.vercel.app';
const navegador = await chromium.launch();
const contexto = await navegador.newContext({ baseURL: origem, reducedMotion: 'reduce' });
const pagina = await contexto.newPage();
const verificacoes = [];
try {
  await abrir(pagina);
  await entrar(pagina);
  await adicionar(pagina);
  await revisarCompra(pagina);
  await pagina.getByRole('button', { name: 'Confirmar compra', exact: true }).click();
  await expect(pagina.getByRole('heading', { level: 1 })).toContainText('Seus NFTs agora');
  const recibo = new URL(pagina.url()).pathname;
  await adicionar(pagina);
  const caminhos = [
    '/',
    '/nft/1',
    '/carrinho',
    '/pagamento',
    '/login',
    '/cadastro',
    '/perfil',
    '/carteiras',
    '/pedidos',
    recibo,
  ];
  for (const largura of [320, 360, 390, 414, 768, 1440, 720]) {
    await pagina.setViewportSize({ width: largura, height: largura === 720 ? 450 : 1000 });
    for (const caminho of caminhos) {
      await pagina.goto(caminho);
      if (caminho === '/login' || caminho === '/cadastro')
        await pagina.getByRole('dialog').waitFor();
      else await pagina.getByRole('heading', { level: 1 }).waitFor();
      await expect(pagina.locator('.esqueleto')).toHaveCount(0);
      await pagina.evaluate(() => document.fonts.ready);
      if (caminho === '/login' || caminho === '/cadastro') {
        await pagina.mouse.move(largura / 2, Math.min(300, pagina.viewportSize().height / 2));
        await pagina.mouse.wheel(0, 1400);
        await expect(
          pagina.getByRole('button', { name: 'Continuar com Facebook', exact: true }),
        ).toBeInViewport({ ratio: 1 });
      }
      const medidas = await pagina.evaluate(() => ({
        conteudo: document.documentElement.scrollWidth,
        viewport: window.innerWidth,
      }));
      verificacoes.push({
        caminho,
        largura,
        contexto: largura === 720 ? '1440 px a 200%: largura CSS equivalente' : 'viewport padrão',
        ...medidas,
      });
      if (medidas.conteudo > medidas.viewport)
        throw new Error(`Overflow em ${caminho}, largura ${largura}: ${medidas.conteudo}px.`);
    }
  }
} finally {
  await navegador.close();
}
await mkdir('relatorios/publicacao', { recursive: true });
await writeFile(
  'relatorios/publicacao/responsividade.json',
  JSON.stringify(
    {
      origem,
      verificacoes,
      observacao:
        'O caso de zoom verifica a largura CSS resultante de 1440 px a 200%; não automatiza o atalho de zoom do navegador.',
    },
    null,
    2,
  ),
);
process.stdout.write(
  `${verificacoes.length} combinações de tela e largura sem overflow horizontal.\n`,
);
