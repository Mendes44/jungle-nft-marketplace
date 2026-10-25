/** Baselines das telas principais, conta, confirmação e estados 404, com dados e fuso estáveis. */
import { test, expect } from '@playwright/test';
import { abrir, adicionar, entrar, revisarCompra, cenario, evento } from './apoio';

test.use({ timezoneId: 'America/Sao_Paulo' });

test('regressão visual dos fluxos principais, conta e páginas 404', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-24T15:00:00Z'));
  await abrir(page);
  await expect(page.locator('.cartao-nft')).toHaveCount(9);
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveScreenshot('inicio.png', { fullPage: true });
  await page.goto('/nft/1');
  await expect(page.getByRole('heading', { name: 'Macaco Esmeralda #042' })).toBeVisible();
  await expect(page).toHaveScreenshot('detalhe.png', { fullPage: true });
  await page.goto('/login');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page).toHaveScreenshot('login.png', { fullPage: true });
  await page.goto('/cadastro');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page).toHaveScreenshot('cadastro.png', { fullPage: true });
  await entrar(page);
  await adicionar(page);
  await expect(page).toHaveScreenshot('carrinho.png', { fullPage: true });
  await revisarCompra(page);
  await expect(page).toHaveScreenshot('pagamento.png', { fullPage: true });
  await cenario(page, 'pedido-lento');
  await page.getByRole('button', { name: 'Confirmar compra', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Pedido pendente');
  await evento(page, 'Concluir pedidos pendentes');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Sua coleção ganhou');
  await expect(page).toHaveScreenshot('confirmacao.png', { fullPage: true });
  await page.goto('/perfil');
  await expect(page.getByLabel('Nome completo')).toHaveValue('Ana Oliveira');
  await expect(page).toHaveScreenshot('perfil.png', { fullPage: true });
  await page.goto('/carteiras');
  await expect(page.getByRole('heading', { name: 'Minha carteira', exact: true })).toBeVisible();
  await expect(page).toHaveScreenshot('carteiras.png', { fullPage: true });
  for (const [caminho, nome, titulo] of [
    ['/rota-ausente', 'pagina-404', 'Esta página não foi encontrada.'],
    ['/nft/ausente', 'nft-404', 'NFT não encontrado.'],
    ['/pedido/ausente', 'pedido-404', 'Pedido não encontrado.'],
  ]) {
    await page.goto(caminho);
    await expect(page.getByRole('heading', { name: titulo, exact: true })).toBeVisible();
    await expect(page).toHaveScreenshot(`${nome}.png`, { fullPage: true });
  }
});
