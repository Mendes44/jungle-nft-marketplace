/** Baselines locais com dados estáveis para detectar regressões nas quatro telas exigidas. */
import { test, expect } from '@playwright/test';
import { abrir, adicionar, entrar, revisarCompra } from './apoio';
test('regressão visual de início, detalhe, carrinho e pagamento', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-24T15:00:00Z'));
  await abrir(page);
  await expect(page.locator('.cartao-nft')).toHaveCount(9);
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveScreenshot('inicio.png', { fullPage: true });
  await page.goto('/nft/1');
  await expect(page.getByRole('heading', { name: 'Macaco Esmeralda #042' })).toBeVisible();
  await expect(page).toHaveScreenshot('detalhe.png', { fullPage: true });
  await entrar(page);
  await adicionar(page);
  await expect(page).toHaveScreenshot('carrinho.png', { fullPage: true });
  await revisarCompra(page);
  await expect(page).toHaveScreenshot('pagamento.png', { fullPage: true });
});
