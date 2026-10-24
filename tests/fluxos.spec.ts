/** E2E dos requisitos funcionais, falhas, isolamento e reconciliação no transporte real da demonstração. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { abrir, adicionar, cenario, entrar, evento, revisarCompra } from './apoio';
import { deWei, paraWei } from '../src/dominio/valores';

test('mantém precisão de 18 casas em ETH e desconto inteiro', () => {
  expect(deWei(paraWei('0.100000000000000001') * 3n)).toBe('0.300000000000000003');
  expect(deWei(paraWei('1.19') - paraWei('1.19') / 10n + paraWei('0.005'))).toBe('1.076');
});

test('combina filtros, ordena, pagina e restaura busca pelo histórico', async ({ page }) => {
  await abrir(page);
  await page.getByLabel('Buscar NFTs').fill('Nomade');
  await expect(page.locator('.cartao-nft')).toHaveCount(2);
  const alternarFiltros = page.getByRole('button', { name: 'Filtrar coleções' });
  if (await alternarFiltros.isVisible()) await alternarFiltros.click();
  await page.getByRole('button', { name: 'Arte digital', exact: false }).click();
  await page.getByLabel('Rede', { exact: true }).selectOption('Polygon');
  await page.getByLabel('Ordenar por').selectOption('menor');
  await expect(page).toHaveURL(/categoria=Arte/);
  await expect(page.getByRole('heading', { name: 'Nenhuma obra encontrada' })).toBeVisible();
  await page.getByRole('button', { name: 'Limpar filtros' }).click();
  await expect(page.locator('.cartao-nft')).toHaveCount(9);
  await page.getByRole('button', { name: 'Próxima página' }).click();
  await expect(page.getByText('Página 2 de 2')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Página 2 de 2')).toBeVisible();
  await page.goBack();
  await expect(page.getByText('Página 1 de 2')).toBeVisible();
});

test('trata detalhe direto, edição esgotada, quantidade e rota inexistente', async ({ page }) => {
  await abrir(page, '/nft/1');
  await expect(page.getByRole('heading', { name: 'Macaco Esmeralda #042' })).toBeVisible();
  await page.getByRole('radio', { name: '1/1 · Esgotada' }).check();
  await expect(page.getByRole('button', { name: 'COMPRAR', exact: true })).toBeDisabled();
  await page.goto('/nft/ausente');
  await expect(page.getByRole('alert')).toContainText('NFT não encontrado');
  await page.goto('/pagina-ausente');
  await expect(
    page.getByRole('heading', { name: 'Esta página não foi encontrada.' }),
  ).toBeVisible();
});

test('cadastra, valida conflito, expira sessão e isola outra conta', async ({ page }) => {
  await abrir(page, '/cadastro');
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await expect(page.getByText('Informe seu nome completo.')).toBeVisible();
  await page.getByLabel('Nome completo').fill('Ana Teste');
  await page.getByLabel('E-mail', { exact: true }).fill('ana@exemplo.com');
  await page.getByLabel('Senha', { exact: true }).fill('Colecao123');
  await page.getByLabel('Confirmar senha', { exact: true }).fill('Colecao123');
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('já possui uma conta');
  await page.getByLabel('E-mail', { exact: true }).fill('nova@exemplo.com');
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sair', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await entrar(page);
  await adicionar(page);
  await page.goto('/perfil');
  await evento(page, 'Expirar sessão');
  await expect(page).toHaveURL(/login/);
  await expect(page.getByLabel('E-mail', { exact: true })).toBeVisible();
  await page.getByLabel('E-mail', { exact: true }).fill('bruno@exemplo.com');
  await page.getByLabel('Senha', { exact: true }).fill('Colecao123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByLabel('Nome completo')).toHaveValue('Bruno Santos');
  await page.goto('/carrinho');
  await expect(page.getByText('Seu carrinho ainda está vazio.')).toBeVisible();
});

test('favorito otimista reverte falha e persiste após recuperação', async ({ page }) => {
  await abrir(page);
  await entrar(page);
  await page.goto('/nft/1');
  await cenario(page, 'favorito-falha');
  await page.getByRole('button', { name: 'Favoritar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('estado anterior foi restaurado');
  await expect(page.getByRole('button', { name: 'Favoritar', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await cenario(page, 'padrao');
  await page.getByRole('button', { name: 'Favoritar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Favoritado', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('button', { name: 'Favoritado', exact: true })).toBeEnabled();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Favoritado', exact: true })).toBeVisible();
});

test('preserva carrinho visitante ao entrar, quantidades, cupom e remoção', async ({ page }) => {
  await abrir(page);
  await adicionar(page);
  await page.getByLabel('Quantidade de Macaco Esmeralda #042').fill('2');
  await expect(page.getByLabel('Quantidade de Macaco Esmeralda #042')).toHaveValue('2');
  await page.reload();
  await expect(page.getByLabel('Quantidade de Macaco Esmeralda #042')).toHaveValue('2');
  await entrar(page);
  await page.goto('/carrinho');
  await expect(page.getByLabel('Quantidade de Macaco Esmeralda #042')).toHaveValue('2');
  await page.getByLabel('Código promocional').fill('EXPIRADO');
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('expirou');
  await page.getByLabel('Código promocional').fill('KURIO10');
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click();
  await expect(page.getByText('KURIO10 aplicado')).toBeVisible();
  await expect(page.getByText('2,147 ETH', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Remover cupom' }).click();
  await page.getByRole('button', { name: 'Remover Macaco Esmeralda #042', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Remover do carrinho' }).click();
  await expect(page.getByText('Seu carrinho ainda está vazio.')).toBeVisible();
});

test('compra do catálogo ao recibo e mantém snapshot após mudança posterior', async ({ page }) => {
  await abrir(page);
  await entrar(page);
  await adicionar(page);
  await revisarCompra(page);
  await page.getByRole('button', { name: 'Confirmar compra', exact: true }).dblclick();
  await expect(page).toHaveURL(/pedido\/KUR-00001/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Sua coleção ganhou');
  await expect(page.getByText('1,195 ETH', { exact: true })).toBeVisible();
  await evento(page, 'Alterar preço do NFT 1');
  await page.reload();
  await expect(page.getByText('1,195 ETH', { exact: true })).toBeVisible();
  await page.goto('/pedidos');
  await expect(page.locator('.grade-carteiras>a')).toHaveCount(1);
  await page.goto('/carrinho');
  await expect(page.getByText('Seu carrinho ainda está vazio.')).toBeVisible();
});

test('recusa pagamento e preserva itens sem exibir confirmação', async ({ page }) => {
  await abrir(page);
  await entrar(page);
  await adicionar(page);
  await cenario(page, 'pagamento-recusado');
  await revisarCompra(page);
  await page.getByRole('button', { name: 'Confirmar compra', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Pagamento recusado');
  await page.goto('/carrinho');
  await expect(page.getByLabel('Quantidade de Macaco Esmeralda #042')).toHaveValue('1');
});

test('recupera o mesmo pedido após timeout e refresh', async ({ page }) => {
  await abrir(page);
  await entrar(page);
  await adicionar(page);
  await cenario(page, 'timeout-pedido');
  await revisarCompra(page);
  await page.getByRole('button', { name: 'Confirmar compra', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'resposta demorou' })).toContainText(
    'resposta demorou',
  );
  await page.reload();
  await page.getByRole('button', { name: 'Recuperar pedido', exact: true }).click();
  await expect(page).toHaveURL(/pedido\/KUR-00001/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Sua coleção ganhou');
  await page.goto('/pedidos');
  await expect(page.locator('.grade-carteiras>a')).toHaveCount(1);
});

test('edita perfil, avatar, senha e carteiras com validações e persistência', async ({ page }) => {
  await abrir(page);
  await entrar(page);
  await page.goto('/perfil');
  await page.getByLabel('Nome completo').fill('Ana Colecionadora');
  await page.getByLabel('Biografia').fill('Arte e tecnologia.');
  await page.getByLabel('Alterar avatar').setInputFiles({
    name: 'avatar.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aJ1EAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await page.getByRole('button', { name: 'Salvar perfil', exact: true }).click();
  await expect(page.getByText('Perfil atualizado.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Nome completo')).toHaveValue('Ana Colecionadora');
  await expect(page.getByAltText('Seu avatar')).toHaveAttribute('src', /^data:image\/png/);
  await page.getByLabel('Senha atual', { exact: true }).fill('errada');
  await page.getByLabel('Nova senha', { exact: true }).fill('NovaSenha123');
  await page.getByLabel('Confirmar nova senha').fill('NovaSenha123');
  await page.getByRole('button', { name: 'Atualizar senha', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('senha atual');
  await page.getByLabel('Senha atual', { exact: true }).fill('Colecao123');
  await page.getByLabel('Nova senha', { exact: true }).fill('NovaSenha123');
  await page.getByLabel('Confirmar nova senha').fill('NovaSenha123');
  await page.getByRole('button', { name: 'Atualizar senha', exact: true }).click();
  await expect(page.getByText('Senha atualizada.')).toBeVisible();
  await page.goto('/carteiras');
  await page.getByRole('button', { name: 'Adicionar carteira' }).click();
  await page.getByLabel('Nome da carteira').fill('Secundária');
  await page.getByLabel('Endereço da carteira').fill('invalido');
  await page.getByRole('button', { name: 'Salvar carteira', exact: true }).click();
  await expect(
    page.getByText('Informe um endereço 0x com 40 caracteres hexadecimais.'),
  ).toBeVisible();
  await page.getByLabel('Endereço da carteira').fill(`0x${'c'.repeat(40)}`);
  await page.getByLabel('Rede da carteira').selectOption('Polygon');
  await page.getByRole('button', { name: 'Salvar carteira', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Secundária', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Secundária', exact: true })).toBeVisible();
});

test('reconcilia preço por Socket.IO e exige nova revisão da cotação', async ({ page }) => {
  await abrir(page);
  await entrar(page);
  await adicionar(page);
  await revisarCompra(page);
  await evento(page, 'Alterar preço do NFT 1');
  await expect(
    page.getByText('A cotação mudou. Revise os valores e confirme novamente.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirmar compra', exact: true })).toBeDisabled();
  await evento(page, 'Reemitir evento duplicado');
  await evento(page, 'Emitir evento antigo');
  await page.getByRole('button', { name: 'Revisar compra', exact: true }).click();
  await expect(page.getByText('1,395 ETH', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirmar compra', exact: true })).toBeEnabled();
  await evento(page, 'Esgotar edição do NFT 1');
  await expect(page.getByRole('button', { name: 'Confirmar compra', exact: true })).toBeDisabled();
});

test('retoma pedido pendente após desconexão e reload sem nova compra', async ({ page }) => {
  await abrir(page);
  await entrar(page);
  await adicionar(page);
  await cenario(page, 'pedido-lento');
  await revisarCompra(page);
  await page.getByRole('button', { name: 'Confirmar compra', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Pedido pendente');
  await evento(page, 'Interromper Socket.IO');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Pedido pendente');
  await evento(page, 'Concluir pedidos pendentes');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Sua coleção ganhou');
  await page.goto('/pedidos');
  await expect(page.locator('.grade-carteiras>a')).toHaveCount(1);
});

test('valida teclado, foco de diálogo, acessibilidade e larguras 390/768/1440', async ({
  page,
}) => {
  await abrir(page);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused();
  const botao = page.getByRole('button', { name: 'Simulação', exact: true });
  await botao.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(botao).toBeFocused();
  const resultado = await new AxeBuilder({ page }).analyze();
  expect(resultado.violations).toEqual([]);
  for (const largura of [390, 768, 1440]) {
    await page.setViewportSize({ width: largura, height: 1000 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
});

test('exibe skeletons, erro de rede e recuperação, descartando respostas obsoletas', async ({
  page,
}) => {
  await abrir(page);
  await cenario(page, 'lento');
  await page.goto('/nft/1');
  await expect(page.getByLabel('Carregando conteúdo')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Macaco Esmeralda #042' })).toBeVisible();
  await cenario(page, 'sem-conexao');
  await page.goto('/nft/2');
  await expect(page.getByRole('alert')).toContainText('Não foi possível conectar');
  await cenario(page, 'padrao');
  await expect(page.getByRole('heading', { name: 'Nômade Sábio #055' })).toBeVisible();
  await cenario(page, 'variavel');
  await page.goto('/');
  await page.getByLabel('Buscar NFTs').fill('E');
  await page.getByLabel('Buscar NFTs').fill('Dourado');
  await expect(page.locator('.cartao-nft')).toHaveCount(2);
  await expect(page.locator('.cartao-nft').first()).toContainText('Dourado');
});
