/** Fixtures de interface: autenticação e controles passam pelos mesmos handlers MSW do produto. */
import { expect, type Page } from '@playwright/test';

/** Aguarda a primeira leitura REST e o handshake real do socket interceptado. */
export async function abrir(pagina: Page, caminho = '/') {
  await pagina.goto(caminho);
  await expect(pagina.locator('.barra-conexao')).toContainText('Atualizações em tempo real ativas');
}
/** Seleciona um cenário determinístico sem alterar o estado interno da interface. */
export async function cenario(pagina: Page, nome: string) {
  await pagina.getByRole('button', { name: 'Simulação', exact: true }).click();
  await pagina.getByLabel('Cenário da simulação').selectOption(nome);
  await pagina.getByRole('button', { name: 'Fechar diálogo' }).click();
}
/** Dispara mudanças através do painel REST; o cliente só recebe a atualização pelo Socket.IO. */
export async function evento(pagina: Page, nome: string) {
  await pagina.getByRole('button', { name: 'Simulação', exact: true }).click();
  await pagina.getByRole('button', { name: nome, exact: true }).click();
  await pagina.getByRole('button', { name: 'Fechar diálogo' }).click();
}
/** Usa credenciais fictícias e a sessão retornada pela simulação. */
export async function entrar(pagina: Page, email = 'ana@exemplo.com', senha = 'Colecao123') {
  await pagina.goto('/login');
  await pagina.getByLabel('E-mail', { exact: true }).fill(email);
  await pagina.getByLabel('Senha', { exact: true }).fill(senha);
  await pagina.getByRole('button', { name: 'Entrar', exact: true }).click();
  // O botão Sair pode pertencer à sessão anterior: aguarda a navegação da nova autenticação.
  await expect(pagina).not.toHaveURL(/\/login(?:\?|$)/);
  await expect(pagina.getByRole('button', { name: 'Sair', exact: true })).toBeVisible();
}
/** Adiciona a edição padrão a partir do detalhe acessado diretamente. */
export async function adicionar(pagina: Page, nftId = '1') {
  await pagina.goto(`/nft/${nftId}`);
  await pagina.getByRole('button', { name: 'COMPRAR', exact: true }).click();
  await expect(pagina).toHaveURL(/carrinho/);
  await expect(pagina.getByRole('heading', { name: 'Resumo da carteira' })).toBeVisible();
}
/** Preenche os campos obrigatórios presentes no frame do pagamento e conecta a carteira na API. */
export async function revisarCompra(pagina: Page) {
  await pagina.goto('/pagamento');
  await pagina.getByLabel('Código de indicação', { exact: true }).fill('KURIO');
  await pagina.getByLabel('Nome ENS (.eth)', { exact: true }).fill('ana.eth');
  await pagina.getByRole('button', { name: 'Conectar carteira', exact: true }).click();
  await expect(pagina.getByText('Carteira conectada na simulação.', { exact: true })).toBeVisible();
  await pagina.getByRole('button', { name: 'Revisar compra', exact: true }).click();
  await expect(pagina.getByRole('button', { name: 'Confirmar compra', exact: true })).toBeEnabled();
}
