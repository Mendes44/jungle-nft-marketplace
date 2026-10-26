import { test, expect, type Page } from '@playwright/test';
import { abrir, adicionar, entrar, revisarCompra, evento, cenario } from './apoio';

async function deslizar(page: Page, seletor: string) {
  const caixa = await page.locator(seletor).boundingBox();
  if (!caixa) throw new Error('Área de gesto ausente.');
  const sessao = await page.context().newCDPSession(page);
  const x = caixa.x + caixa.width * 0.8;
  const y = caixa.y + caixa.height / 2;
  await sessao.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let passo = 1; passo <= 5; passo++)
    await sessao.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x - passo * caixa.width * 0.12, y }],
    });
  await sessao.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sessao.detach();
}

async function semRecorte(page: Page, seletor: string) {
  const elementos = await page.locator(seletor).evaluateAll((itens) =>
    itens.map((item) => ({
      texto: item.textContent,
      largura: item.clientWidth,
      conteudo: item.scrollWidth,
      esquerda: item.getBoundingClientRect().left,
      direita: item.getBoundingClientRect().right,
      viewport: window.innerWidth,
    })),
  );
  for (const item of elementos) {
    expect(item.conteudo, item.texto ?? '').toBeLessThanOrEqual(item.largura + 1);
    expect(item.esquerda).toBeGreaterThanOrEqual(0);
    expect(item.direita).toBeLessThanOrEqual(item.viewport + 1);
  }
}

test('carrossel navega por controles, teclado, gesto e abre a obra selecionada', async ({
  page,
  isMobile,
}) => {
  await abrir(page);
  const imagem = page.locator('.hero-arte > img').first();
  await expect(imagem).toHaveAttribute('alt', 'Emerald Ape #042');
  await page
    .getByRole('button', {
      name: isMobile ? 'Mostrar destaque 2' : 'Próximo destaque',
      exact: true,
    })
    .click();
  await expect(imagem).toHaveAttribute('alt', 'Sage Nomad #009');
  await page.getByRole('button', { name: 'Mostrar destaque 3' }).click();
  await expect(page.getByRole('button', { name: 'Mostrar destaque 3' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.keyboard.press('ArrowRight');
  await expect(imagem).toHaveAttribute('alt', 'Emerald Ape #042');
  if (isMobile) {
    await deslizar(page, '.hero');
    await expect(imagem).toHaveAttribute('alt', 'Sage Nomad #009');
  } else await page.getByRole('button', { name: 'Mostrar destaque 2' }).click();
  await page.locator('.hero-arte').click();
  await expect(page).toHaveURL(/\/nft\/2$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sage Nomad #009');
});

test('destaque reserva espaço para texto e imagem entre 320 e 1440 pixels', async ({ page }) => {
  await abrir(page);
  for (const largura of [320, 360, 390, 414, 600, 768, 1440]) {
    await page.setViewportSize({ width: largura, height: 1000 });
    await page.evaluate(() => document.fonts.ready);
    await semRecorte(page, '.hero h1, .hero .descricao, .hero .botao-explorar');
    const texto = await page.locator('.hero > div').boundingBox();
    const imagem = await page.locator('.hero-arte').boundingBox();
    expect(texto && imagem && texto.x + texto.width <= imagem.x).toBeTruthy();
  }
});

test('cupons inválidos, inexistentes e expirados preservam o desconto aplicado', async ({
  page,
}) => {
  await abrir(page);
  await adicionar(page);
  const codigo = page.getByLabel('Código promocional');
  async function aplicar(valor: string) {
    await codigo.fill(valor);
    await page.getByRole('button', { name: 'Aplicar', exact: true }).click();
  }
  await aplicar(' kurio10 ');
  await expect(page.getByText('KURIO10 aplicado')).toBeVisible();
  for (const [valor, erro] of [
    ['KURIO!', 'Cupom inválido.'],
    ['NAOEXISTE', 'Cupom não existe.'],
    ['EXPIRADO', 'Este cupom expirou.'],
  ]) {
    await aplicar(valor);
    await expect(page.getByRole('alert')).toContainText(erro);
    await expect(page.getByText('KURIO10 aplicado')).toBeVisible();
    await expect(page.getByText('1.076 ETH', { exact: true })).toBeVisible();
  }
  for (const [nome, erro] of [
    ['cupom-invalido', 'Cupom inválido.'],
    ['cupom-inexistente', 'Cupom não existe.'],
  ]) {
    await cenario(page, nome);
    await aplicar('KURIO10');
    await expect(page.getByRole('alert')).toContainText(erro);
    await expect(page.getByText('KURIO10 aplicado')).toBeVisible();
  }
  await page.getByRole('button', { name: 'Remover cupom' }).click();
  await expect(page.getByText('KURIO10 aplicado')).toHaveCount(0);
  await expect(page.getByText('1.195 ETH', { exact: true })).toBeVisible();
});

test('cupom aplicado e revisão permanecem legíveis nas larguras menores', async ({ page }) => {
  await abrir(page);
  await entrar(page);
  await adicionar(page, '12');
  await page.getByLabel('Código promocional').fill('KURIO10');
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click();
  await expect(page.getByText('KURIO10 aplicado')).toBeVisible();
  for (const largura of [320, 360, 390, 414, 768, 1440]) {
    await page.setViewportSize({ width: largura, height: 1000 });
    await semRecorte(
      page,
      '.resumo-valores dt, .resumo-valores dd, .cupom-aplicado button, .entrada-cupom button, .item-carrinho .total-item',
    );
  }
  await page.setViewportSize({ width: 360, height: 800 });
  await revisarCompra(page);
  await semRecorte(
    page,
    '.dialogo-conteudo .resumo-valores dt, .dialogo-conteudo .resumo-valores dd, .acoes-revisao button',
  );
  const acoes = page.locator('.acoes-revisao');
  const caixa = await acoes.boundingBox();
  for (const botao of await acoes.getByRole('button').all()) {
    const posicao = await botao.boundingBox();
    expect(Math.abs(posicao!.x + posicao!.width / 2 - (caixa!.x + caixa!.width / 2))).toBeLessThan(
      2,
    );
  }
});

test('aviso fecha em três segundos e permite fechar por botão ou gesto', async ({
  page,
  isMobile,
}) => {
  await abrir(page);
  await evento(page, 'Alterar preço do NFT 1');
  await expect(page.locator('.conteudo-aviso')).toBeVisible();
  await expect(page.locator('.conteudo-aviso')).toHaveCount(0, { timeout: 4500 });
  await evento(page, 'Alterar preço do NFT 1');
  await page.getByRole('button', { name: 'Fechar aviso' }).click();
  await expect(page.locator('.conteudo-aviso')).toHaveCount(0);
  if (isMobile) {
    await evento(page, 'Alterar preço do NFT 1');
    await deslizar(page, '.conteudo-aviso');
    await expect(page.locator('.conteudo-aviso')).toHaveCount(0);
  }
});
