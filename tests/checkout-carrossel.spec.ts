import { test, expect } from '@playwright/test';
import { abrir, entrar, adicionar, sair } from './apoio';

test('carrossel avança sozinho, permite pausar e retomar', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install();
  await abrir(page);
  const imagem = page.locator('.hero-arte > img').first();
  await expect(imagem).toHaveAttribute('alt', 'Emerald Ape #042');
  await page.clock.runFor(8000);
  await expect(imagem).toHaveAttribute('alt', 'Sage Nomad #009');
  await page.getByRole('button', { name: 'Pausar carrossel' }).click();
  await page.clock.runFor(10000);
  await expect(imagem).toHaveAttribute('alt', 'Sage Nomad #009');
  await page.getByRole('button', { name: 'Reproduzir carrossel' }).click();
  await page.clock.runFor(8000);
  await expect(imagem).toHaveAttribute('alt', 'Ivory Baron #088');
});

test('abrir filtros no celular leva a tela até o painel e mantém o foco', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await abrir(page);
  await page.getByRole('button', { name: 'Filtrar coleções' }).click();
  await expect(page.locator('#filtros-catalogo')).toBeFocused();
  await expect(page.locator('#filtros-catalogo')).toBeInViewport();
  const topo = await page
    .locator('#filtros-catalogo')
    .evaluate((el) => el.getBoundingClientRect().top);
  expect(topo).toBeGreaterThanOrEqual(0);
  expect(topo).toBeLessThanOrEqual(80);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
});

test('checkout restaura os campos em nova aba e mantém dados separados por usuário', async ({
  page,
  context,
}) => {
  await abrir(page);
  await entrar(page);
  await adicionar(page);
  await page.goto('/pagamento');
  await expect(page.getByLabel('Código de indicação', { exact: true })).toHaveValue('KURIO');
  await expect(page.getByLabel('Nome ENS', { exact: true })).toHaveValue('ana');
  await page.getByLabel('Código de indicação', { exact: true }).fill('SALVO123');
  await page.getByLabel('Nome ENS', { exact: true }).fill('meucolecionador');
  await page.goto('/perfil');
  await page.goto('/pagamento');
  await expect(page.getByLabel('Código de indicação', { exact: true })).toHaveValue('SALVO123');
  const nova = await context.newPage();
  await nova.goto('/pagamento');
  await expect(nova.getByLabel('Nome ENS', { exact: true })).toHaveValue('meucolecionador');
  await expect(nova.getByLabel('Código de indicação', { exact: true })).toHaveValue('SALVO123');
  await nova.close();
  await sair(page);
  await entrar(page, 'bruno@exemplo.com');
  await adicionar(page);
  await page.goto('/pagamento');
  await expect(page.getByLabel('Nome ENS', { exact: true })).toHaveValue('bruno');
  await expect(page.getByLabel('Código de indicação', { exact: true })).toHaveValue('KURIO');
  await sair(page);
  await entrar(page);
  await page.goto('/pagamento');
  await expect(page.getByLabel('Código de indicação', { exact: true })).toHaveValue('SALVO123');
});

test('troca provedor e rede, exige reconexão e grava a escolha no recibo', async ({
  page,
  isMobile,
}) => {
  await abrir(page);
  await entrar(page);
  await adicionar(page);
  await page.goto('/pagamento');
  await page.getByLabel('Código de indicação', { exact: true }).fill('INDICACAOSALVA');
  await page.getByLabel('Nome ENS', { exact: true }).fill('enssalvo');
  if (isMobile) await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  const redes = page.getByLabel(isMobile ? 'Rede da conexão' : 'Rede', { exact: true });
  await redes.selectOption('Polygon');
  for (const nome of ['WalletConnect', 'MetaMask', 'Coinbase Wallet']) {
    await page.getByRole('radio', { name: nome, exact: true }).click();
    await expect(page.getByRole('radio', { name: nome, exact: true })).toBeChecked();
    await expect(page.getByRole('button', { name: 'Confirmar compra', exact: true })).toBeEnabled();
  }
  await redes.selectOption('Ethereum');
  await expect(page.getByRole('button', { name: 'Confirmar compra', exact: true })).toBeDisabled();
  await redes.selectOption('Polygon');
  await page.reload();
  await expect(redes).toHaveValue('Polygon');
  await expect(page.getByRole('button', { name: 'Confirmar compra', exact: true })).toBeDisabled();
  await page.getByRole('radio', { name: 'Coinbase Wallet', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar compra', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Revisar compra', exact: true })).toContainText(
    'Polygon · Coinbase Wallet',
  );
  const requisicao = page.waitForRequest(
    (r) => new URL(r.url()).pathname === '/api/pedidos' && r.method() === 'POST',
  );
  await page.getByRole('button', { name: 'Confirmar compra', exact: true }).click();
  const dados = (await requisicao).postDataJSON();
  expect(dados.rede).toBe('Polygon');
  expect(dados.provedor).toBe('Coinbase Wallet');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Seus NFTs agora');
  await expect(page.locator('.recibo')).toContainText('Polygon');
  await adicionar(page);
  await page.goto('/pagamento');
  await expect(page.getByLabel('Código de indicação', { exact: true })).toHaveValue(
    'INDICACAOSALVA',
  );
  await expect(page.getByLabel('Nome ENS', { exact: true })).toHaveValue('enssalvo');
});
