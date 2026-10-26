/** Fixtures usam a interface e os handlers MSW; nenhum estado de negócio é injetado. */
import { expect, type Page } from '@playwright/test';

/** Espera a primeira leitura REST e o handshake Socket.IO interceptado. */
export async function abrir(pagina: Page, caminho = '/') {
  await pagina.goto(caminho);
  await expect(pagina.locator('.barra-conexao')).toContainText('Atualizações em tempo real ativas');
}
/** Revela a busca desktop que fica recolhida no frame original. */
export async function abrirBusca(pagina: Page) {
  await pagina.getByLabel('Buscar NFTs').waitFor({ state: 'attached' });
  if (!(await pagina.getByLabel('Buscar NFTs').isVisible()))
    await pagina.getByRole('button', { name: 'Abrir busca de NFTs', exact: true }).click();
}
/** Fecha a revisão antes de acionar controles externos ao modal, preservando a cotação. */
async function recolherRevisao(pagina: Page) {
  const revisao = pagina.getByRole('dialog', { name: 'Revisar compra', exact: true });
  const aberta = await revisao.isVisible();
  if (aberta) await pagina.keyboard.press('Escape');
  return aberta && new URL(pagina.url()).pathname === '/pagamento';
}
/** Muda o cenário pela API de demonstração e retorna à revisão, quando estava aberta. */
export async function cenario(pagina: Page, nome: string) {
  const revisao = await recolherRevisao(pagina);
  await pagina.getByRole('button', { name: 'Simulação', exact: true }).click();
  await pagina.getByLabel('Cenário da simulação').selectOption(nome);
  await pagina.getByRole('button', { name: 'Fechar diálogo' }).click();
  if (revisao) await pagina.getByRole('button', { name: 'Ver revisão', exact: true }).click();
}
/** Dispara eventos pelo painel REST; a interface recebe a alteração via Socket.IO. */
export async function evento(pagina: Page, nome: string) {
  const revisao = await recolherRevisao(pagina);
  await pagina.getByRole('button', { name: 'Simulação', exact: true }).click();
  await pagina.getByRole('button', { name: nome, exact: true }).click();
  if (nome === 'Expirar sessão') {
    await expect(pagina).toHaveURL(/\/login/);
    await expect(
      pagina.getByRole('heading', { name: 'Cenários da demonstração', includeHidden: true }),
    ).toHaveCount(0);
    await expect(pagina.getByRole('dialog')).toHaveCount(1);
    return;
  }
  await pagina.getByRole('button', { name: 'Fechar diálogo' }).click();
  if (revisao) await pagina.getByRole('button', { name: 'Ver revisão', exact: true }).click();
}
/** Abre o menu móvel quando o comando de sessão não está no cabeçalho visível. */
export async function sair(pagina: Page) {
  const botoes = pagina
    .getByRole('button', { name: 'Sair', exact: true })
    .filter({ visible: true });
  if (!(await botoes.count())) {
    const menu = pagina.getByRole('button', { name: 'Abrir sua conta', exact: true });
    if (await menu.isVisible()) await menu.click();
    else await pagina.goto('/perfil');
  }
  await pagina.getByRole('button', { name: 'Sair', exact: true }).filter({ visible: true }).click();
  await expect(pagina).toHaveURL((url) => url.pathname === '/');
}
/** Usa as credenciais fictícias e aguarda a sessão devolvida pela API. */
export async function entrar(pagina: Page, email = 'ana@exemplo.com', senha = 'Colecao123') {
  await pagina.goto('/login');
  await pagina.getByLabel('E-mail', { exact: true }).fill(email);
  await pagina.getByLabel('Senha', { exact: true }).fill(senha);
  await pagina.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(pagina).not.toHaveURL(/\/login(?:\?|$)/);
  await expect(pagina.locator('.conta-cabecalho')).toHaveCount(1);
}
/** Seleciona a edição padrão no detalhe e aguarda o carrinho persistido. */
export async function adicionar(pagina: Page, nftId = '1') {
  await pagina.goto(`/nft/${nftId}`);
  await pagina.getByRole('button', { name: /^(COMPRAR|Comprar NFT)$/ }).click();
  await expect(pagina).toHaveURL(/carrinho/);
  await expect(pagina.locator('.item-carrinho').first()).toBeVisible();
}
/** Preenche os campos, passa a etapa móvel e conecta uma carteira real da simulação. */
export async function prepararCompra(pagina: Page) {
  await pagina.goto('/pagamento');
  await pagina.getByLabel('Código de indicação', { exact: true }).fill('KURIO');
  await pagina.getByLabel('Nome ENS', { exact: true }).fill('ana.eth');
}
/** Busca uma cotação atual e mantém a revisão aberta antes do POST idempotente. */
export async function revisarCompra(pagina: Page) {
  await prepararCompra(pagina);
  await conectarERevisar(pagina);
}
/** Executa conexão e revisão sem descartar campos já editados no formulário. */
export async function conectarERevisar(pagina: Page) {
  const continuar = pagina.getByRole('button', { name: 'Continuar', exact: true });
  if (await continuar.isVisible()) await continuar.click();
  await pagina.getByRole('radio', { name: 'MetaMask', exact: true }).click();
  await expect(pagina.getByRole('radio', { name: 'MetaMask', exact: true })).toBeChecked();
  await pagina.getByRole('button', { name: 'Confirmar compra', exact: true }).click();
  await expect(pagina.getByRole('dialog', { name: 'Revisar compra', exact: true })).toBeVisible();
  await expect(pagina.getByRole('button', { name: 'Confirmar compra', exact: true })).toBeEnabled();
}
