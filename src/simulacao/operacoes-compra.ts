/** Operações REST de compra; regras e persistência ficam na camada de simulação. */
import { delay, HttpResponse } from 'msw';
import { z } from 'zod';
import {
  colecionadorSchema,
  envioPedidoSchema,
  itemSchema,
  type Pedido,
} from '../dominio/contratos';
import { cotar, FalhaApi, linhasCarrinho, mesmaLinha, obterCarrinho, salvarBanco } from './banco';
import type { ContextoRequisicao } from './contexto';
/** Valida a edição e o estoque antes de alterar a quantidade da linha composta. */
export async function alterarCarrinho(contexto: ContextoRequisicao): Promise<Response> {
  const { banco, metodo, dono, lerCorpo } = contexto;

  const carrinho = obterCarrinho(banco, dono);
  if (metodo === 'POST' || metodo === 'PATCH') {
    const item = itemSchema.parse(await lerCorpo());
    const edicao = banco.nfts
      .find((nft) => nft.id === item.nftId)
      ?.edicoes.find((edicao) => edicao.id === item.edicaoId);
    if (!edicao) throw new FalhaApi(404, 'Edição não encontrada.');
    const existente = carrinho.itens.find((linha) => mesmaLinha(linha, item));
    const quantidade =
      metodo === 'POST' ? item.quantidade + (existente?.quantidade ?? 0) : item.quantidade;
    if (quantidade > edicao.disponivel)
      throw new FalhaApi(409, `Há apenas ${edicao.disponivel} unidade(s) desta edição.`);
    if (existente) existente.quantidade = quantidade;
    else carrinho.itens.push({ ...item, quantidade });
  }
  if (metodo === 'DELETE') {
    const item = itemSchema.omit({ quantidade: true }).parse(await lerCorpo());
    carrinho.itens = carrinho.itens.filter(
      (linha) => linha.nftId !== item.nftId || linha.edicaoId !== item.edicaoId,
    );
  }
  salvarBanco(banco);
  return HttpResponse.json({ itens: linhasCarrinho(banco, dono), cupom: carrinho.cupom });
}

/** Valida o cupom e devolve os totais calculados na API. */
export async function consultarCotacao(contexto: ContextoRequisicao): Promise<Response> {
  const { banco, metodo, dono, lerCorpo } = contexto;

  if (metodo === 'POST') {
    const { cupom } = z.object({ cupom: z.string() }).parse(await lerCorpo());
    if (cupom && cupom.toUpperCase() !== 'KURIO10')
      throw new FalhaApi(
        422,
        cupom.toUpperCase() === 'EXPIRADO' ? 'Este cupom expirou.' : 'Cupom inválido.',
      );
    obterCarrinho(banco, dono).cupom = cupom.toUpperCase();
    salvarBanco(banco);
  }
  return HttpResponse.json(cotar(banco, dono));
}

/** Lista apenas pedidos pertencentes à conta atual. */
export async function listarPedidos(contexto: ContextoRequisicao): Promise<Response> {
  const { banco, dono } = contexto;

  return HttpResponse.json(banco.pedidos.filter((pedido) => pedido.usuarioId === dono));
}

/** Recupera tentativas idempotentes ou reserva estoque e persiste um novo pedido pendente. */
export async function criarPedido(contexto: ContextoRequisicao): Promise<Response> {
  const { banco, requisicao, dono, lerCorpo, emitir } = contexto;

  const dados = envioPedidoSchema.parse(await lerCorpo());
  const chave = requisicao.headers.get('Idempotency-Key');
  if (!chave || chave.length > 100)
    throw new FalhaApi(422, 'Uma chave de idempotência é obrigatória.');
  const chaveDono = `${dono}:${chave}`;
  const corpo = JSON.stringify(dados);
  const tentativa = banco.tentativas[chaveDono];
  if (tentativa) {
    if (tentativa.corpo !== corpo)
      throw new FalhaApi(409, 'Esta tentativa já foi usada com outros dados.');
    const pedido = banco.pedidos.find((pedido) => pedido.id === tentativa.pedidoId);
    if (!pedido) throw new FalhaApi(404, 'Pedido não encontrado.');
    return HttpResponse.json(pedido);
  }
  const cotacao = cotar(banco, dono);
  if (!cotacao.itens.length) throw new FalhaApi(422, 'Seu carrinho está vazio.');
  if (cotacao.id !== dados.cotacaoId)
    throw new FalhaApi(409, 'A cotação mudou. Revise os valores e confirme novamente.');
  if (cotacao.itens.some((item) => item.quantidade > item.disponivel))
    throw new FalhaApi(409, 'Uma edição esgotou. Atualize as quantidades do carrinho.');
  const carteira = banco.carteiras[dono]?.find((carteira) => carteira.id === dados.carteiraId);
  if (!carteira || carteira.rede !== dados.rede)
    throw new FalhaApi(422, 'Selecione uma carteira e sua rede cadastrada.');
  const token = requisicao.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  if (banco.sessoes[token]?.carteiraId !== carteira.id)
    throw new FalhaApi(422, 'Conecte a carteira antes de enviar o pedido.');
  const pedido: Pedido = {
    id: `KUR-${String(++banco.sequencia).padStart(5, '0')}`,
    usuarioId: dono,
    estado: 'pendente',
    versao: 1,
    cotacao: structuredClone(cotacao),
    carteira: structuredClone(carteira),
    colecionador: colecionadorSchema.parse(dados),
    transacao: `0x${crypto.randomUUID().replaceAll('-', '')}`,
    criadoEm: Date.now(),
    finalizarEm: Date.now() + (banco.cenario === 'pedido-lento' ? 60000 : 1800),
    recusar: banco.cenario === 'pagamento-recusado',
  };
  banco.pedidos.push(pedido);
  banco.tentativas[chaveDono] = { corpo, pedidoId: pedido.id };
  // Reserva atômica antes da resposta evita vender a mesma edição a outro pedido pendente.
  for (const item of cotacao.itens) {
    const nft = banco.nfts.find((nft) => nft.id === item.nftId);
    const edicao = nft?.edicoes.find((edicao) => edicao.id === item.edicaoId);
    if (nft && edicao) {
      edicao.disponivel -= item.quantidade;
      nft.versao++;
    }
  }
  salvarBanco(banco);
  emitir('order.updated', pedido.id, pedido.versao, dono);
  for (const item of cotacao.itens) {
    const nft = banco.nfts.find((nft) => nft.id === item.nftId);
    if (nft) emitir('nft.updated', nft.id, nft.versao);
  }
  if (banco.cenario === 'timeout-pedido') {
    await delay(5500);
  }
  return HttpResponse.json(pedido, { status: 201 });
}

/** Protege o recibo por proprietário antes de devolvê-lo à interface. */
export async function consultarPedido(contexto: ContextoRequisicao): Promise<Response> {
  const { banco, caminho, dono } = contexto;

  const pedido = banco.pedidos.find((pedido) => pedido.id === caminho.split('/')[2]);
  if (!pedido) throw new FalhaApi(404, 'Pedido não encontrado.');
  if (pedido.usuarioId !== dono) throw new FalhaApi(403, 'Este pedido pertence a outra conta.');
  return HttpResponse.json(pedido);
}
