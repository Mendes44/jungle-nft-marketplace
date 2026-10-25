/** Regressão do catálogo após suspensão do worker pelo navegador. */
import { test, expect } from '@playwright/test';
import { envioPedidoSchema, pedidoSchema } from '../src/dominio/contratos';
import { abrir, entrar, adicionar, cenario, evento, revisarCompra } from './apoio';

test('recupera a consulta quando o navegador encerra o service worker inativo', async ({
  page,
  context,
}) => {
  await abrir(page);
  await expect(page.locator('.cartao-nft')).toHaveCount(9);
  const depurador = await context.newCDPSession(page);
  await depurador.send('ServiceWorker.enable');
  await depurador.send('ServiceWorker.stopAllWorkers');
  await page.getByLabel('Buscar NFTs').fill('Nomade');
  await expect(page.locator('.cartao-nft')).toHaveCount(2);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await depurador.detach();
});

// A parada forçada ocorre no Chromium isolado e não altera o banco nem o estado do pedido.
test('preserva o pedido pendente ao retomar o worker e conclui a mesma transação', async ({
  page,
  context,
}) => {
  await abrir(page);
  await entrar(page);
  await adicionar(page);
  await cenario(page, 'pedido-lento');
  await revisarCompra(page);
  await page.getByLabel('Nome ENS (.eth)', { exact: true }).fill('Teste.ETH');
  await page.getByRole('button', { name: 'Revisar compra', exact: true }).click();
  const respostaPedido = page.waitForResponse(
    (resposta) =>
      new URL(resposta.url()).pathname === '/api/pedidos' && resposta.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Confirmar compra', exact: true }).click();
  const pedidoCriado = pedidoSchema.parse(await (await respostaPedido).json());
  expect(pedidoCriado.colecionador.ens).toBe('teste.eth');
  await expect(page).toHaveURL(/pedido\/KUR-00001/);
  const depurador = await context.newCDPSession(page);
  await depurador.send('ServiceWorker.enable');
  await depurador.send('ServiceWorker.stopAllWorkers');
  await evento(page, 'Concluir pedidos pendentes');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Sua coleção ganhou');
  await page.goto('/pedidos');
  await expect(page.locator('.grade-carteiras>a')).toHaveCount(1);
  await depurador.detach();
});

// O relógio avança uma hora; o contexto e o rascunho devem sobreviver à autenticação seguinte.
test('expira uma sessão por tempo e retoma o checkout com orientação explícita', async ({
  page,
}) => {
  await page.clock.install();
  await abrir(page);
  await entrar(page);
  await adicionar(page);
  await revisarCompra(page);
  await page.clock.fastForward(3601000);
  await page.getByRole('button', { name: 'Revisar compra', exact: true }).click();
  await expect(page).toHaveURL(/login/);
  await expect(
    page.getByText('Sua sessão expirou. Entre novamente para continuar de onde parou.'),
  ).toBeVisible();
  await page.getByLabel('E-mail', { exact: true }).fill('ana@exemplo.com');
  await page.getByLabel('Senha', { exact: true }).fill('Colecao123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/pagamento/);
  await expect(page.getByLabel('Código de indicação', { exact: true })).toHaveValue('KURIO');
});

// 404 de recurso tem uma página de retorno; indisponibilidade continua como erro recuperável.
test('oferece retorno nas páginas 404 sem confundir indisponibilidade com recurso ausente', async ({
  page,
}) => {
  await abrir(page, '/rota-ausente');
  await page.getByRole('link', { name: 'Voltar ao início', exact: true }).click();
  await expect(page.locator('.cartao-nft')).toHaveCount(9);
  await page.goto('/nft/ausente');
  await expect(page.getByRole('heading', { name: 'NFT não encontrado.' })).toBeVisible();
  await entrar(page);
  await page.goto('/pedido/ausente');
  await expect(page.getByRole('heading', { name: 'Pedido não encontrado.' })).toBeVisible();
  await cenario(page, 'erro-500');
  await page.goto('/nft/1');
  await expect(page.getByRole('alert')).toContainText('temporariamente indisponível');
  await expect(page.locator('.nao-encontrado')).toHaveCount(0);
});

// Um rascunho alterado após timeout não pode reutilizar a chave para mudar o pedido persistido.
test('rejeita a mesma chave de pedido com conteúdo diferente sem criar outra compra', async ({
  page,
}) => {
  await abrir(page);
  await entrar(page);
  await adicionar(page);
  await cenario(page, 'timeout-pedido');
  await revisarCompra(page);
  const pedidoEnviado = page.waitForRequest(
    (requisicao) =>
      new URL(requisicao.url()).pathname === '/api/pedidos' && requisicao.method() === 'POST',
  );
  await page.getByRole('button', { name: 'Confirmar compra', exact: true }).click();
  const requisicao = await pedidoEnviado;
  const dados = envioPedidoSchema.parse(requisicao.postDataJSON());
  const chave = requisicao.headers()['idempotency-key'];
  await expect(page.getByRole('alert').filter({ hasText: 'resposta demorou' })).toBeVisible();
  await page.evaluate(
    ({ chave, dados }) => {
      sessionStorage.setItem(
        'kurio.tentativa:ana',
        JSON.stringify({ chave, dados: { ...dados, nome: 'Outro colecionador' } }),
      );
    },
    { chave, dados },
  );
  await page.reload();
  await page.getByRole('button', { name: 'Recuperar pedido', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(
    'Esta tentativa já foi usada com outros dados.',
  );
  await page.goto('/pedidos');
  await expect(page.locator('.grade-carteiras>a')).toHaveCount(1);
});
