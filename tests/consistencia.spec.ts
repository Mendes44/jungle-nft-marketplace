/** Cenários de continuidade de sessão e consistência entre pedidos, carrinho e contas. */
import { test, expect } from '@playwright/test';
import { abrir, adicionar, cenario, entrar, evento, revisarCompra } from './apoio';

test('preserva o rascunho quando a sessão expira durante o checkout', async ({ page }) => {
  await abrir(page);
  await entrar(page);
  await adicionar(page);
  await revisarCompra(page);
  await page.getByLabel('Observação do colecionador (opcional)').fill('Minha primeira coleção.');
  await evento(page, 'Expirar sessão');
  await expect(page).toHaveURL(/login/);
  await page.getByLabel('E-mail', { exact: true }).fill('ana@exemplo.com');
  await page.getByLabel('Senha', { exact: true }).fill('Colecao123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/pagamento/);
  await expect(page.getByLabel('Código de indicação', { exact: true })).toHaveValue('KURIO');
  await expect(page.getByLabel('Observação do colecionador (opcional)')).toHaveValue(
    'Minha primeira coleção.',
  );
  await expect(page.getByText('Carteira desconectada.', { exact: true })).toBeVisible();
});

test('preserva adições ao carrinho durante pedido pendente e protege o recibo de outra conta', async ({
  page,
}) => {
  await abrir(page);
  await entrar(page);
  await adicionar(page);
  await cenario(page, 'pedido-lento');
  await revisarCompra(page);
  await page.getByRole('button', { name: 'Confirmar compra', exact: true }).click();
  await expect(page).toHaveURL(/pedido\/KUR-00001/);
  await adicionar(page);
  await evento(page, 'Concluir pedidos pendentes');
  await expect(page.getByLabel('Quantidade de Macaco Esmeralda #042')).toHaveValue('1');
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await entrar(page, 'bruno@exemplo.com');
  await page.goto('/pedido/KUR-00001');
  await expect(page.getByRole('alert')).toContainText('pertence a outra conta');
});

test('edita a carteira e recupera erros HTTP sem ocultar a indisponibilidade', async ({ page }) => {
  await abrir(page);
  await entrar(page);
  await page.goto('/carteiras');
  await page.getByRole('button', { name: 'Editar Minha carteira', exact: true }).click();
  await page.getByLabel('Nome da carteira').fill('Carteira principal revisada');
  await page.getByLabel('Tipo de carteira', { exact: true }).selectOption('WalletConnect');
  await page.getByRole('button', { name: 'Salvar carteira', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Carteira principal revisada' })).toBeVisible();
  await page.reload();
  await expect(page.getByText('WalletConnect · Ethereum')).toBeVisible();
  await page.goto('/');
  await cenario(page, 'erro-500');
  await expect(page.getByRole('alert')).toContainText('temporariamente indisponível');
  await cenario(page, 'erro-403');
  await expect(page.getByRole('alert')).toContainText('não tem permissão');
  await cenario(page, 'padrao');
  await expect(page.locator('.cartao-nft')).toHaveCount(9);
});
