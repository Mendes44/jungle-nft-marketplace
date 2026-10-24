import { cenarios } from '../dominio/cenarios';
import {
  alterarCarrinho,
  consultarCotacao,
  listarPedidos,
  criarPedido,
  consultarPedido,
} from './operacoes-compra';
import { listarNfts, consultarNft, alterarFavoritos } from './operacoes-catalogo';
import {
  autenticarConta,
  alterarConexao,
  consultarSessao,
  encerrarSessao,
  alterarPerfil,
  alterarSenha,
  alterarCarteiras,
} from './operacoes-conta';
/** REST e WebSocket da demonstração: a interface nunca escreve diretamente no banco simulado. */
import { delay, http, HttpResponse, ws } from 'msw';
import { setupWorker } from 'msw/browser';
import { toSocketIo } from '@mswjs/socket.io-binding';
import { z } from 'zod';
import { type Evento } from '../dominio/contratos';

import { origemSocket } from '../infraestrutura/configuracao';
import {
  carregarBanco,
  criarBanco,
  FalhaApi,
  finalizarPedido,
  identificar,
  salvarBanco,
} from './banco';

let banco = await carregarBanco();
const conexoes = new Set<{
  dono: string;
  emitir: (nome: string, evento: Evento) => void;
  fechar: () => void;
}>();
// MSW 2 remove o prefixo /socket.io/ ao comparar a URL do transporte.
const canal = ws.link(origemSocket);

/** Publica somente após persistência; eventos privados seguem o dono da conexão autenticada. */
function emitir(nome: string, recursoId: string, versao: number, usuarioId?: string): void {
  const evento = { id: `${nome}:${recursoId}:${versao}`, recursoId, versao, usuarioId };
  for (const conexao of conexoes)
    if (!usuarioId || conexao.dono === usuarioId) conexao.emitir(nome, evento);
}
/** Reconcilia pedidos persistidos, inclusive após refresh ou interrupção do transporte. */
function reconciliarPedidos(): void {
  for (const pedido of banco.pedidos)
    if (finalizarPedido(banco, pedido)) {
      emitir('order.updated', pedido.id, pedido.versao, pedido.usuarioId);
      for (const item of pedido.cotacao.itens) {
        const nft = banco.nfts.find((nft) => nft.id === item.nftId);
        if (nft) emitir('nft.updated', nft.id, nft.versao);
      }
    }
}

/** O heartbeat do protocolo mantém o cliente Socket.IO ativo; timers são liberados ao desconectar. */
const manipuladorSocket = canal.addEventListener('connection', (conexao) => {
  const socket = toSocketIo(conexao);
  const url = new URL(conexao.client.url);
  const token = url.searchParams.get('token') ?? '';
  const sessao = banco.sessoes[token];
  const dono = sessao && sessao.expiraEm > Date.now() ? sessao.usuarioId : '';
  const registro = {
    dono,
    emitir: (nome: string, evento: Evento) => socket.client.emit(nome, evento),
    fechar: () => conexao.client.close(1012, 'Interrupção simulada'),
  };
  conexoes.add(registro);
  const temporizador = setInterval(() => {
    if (token && (!banco.sessoes[token] || banco.sessoes[token].expiraEm <= Date.now())) {
      conexao.client.close(1008, 'Sessão expirada');
      return;
    }
    conexao.client.send('2');
    reconciliarPedidos();
  }, 1000);
  conexao.client.addEventListener('close', () => {
    clearInterval(temporizador);
    conexoes.delete(registro);
  });
});

/** Mantém todas as validações, falhas e mudanças de estado na fronteira REST. */
async function responder(requisicao: Request): Promise<Response> {
  const url = new URL(requisicao.url);
  const caminho = url.pathname.replace('/api', '');
  const metodo = requisicao.method;
  const lerCorpo = async (): Promise<unknown> => requisicao.json();

  // Rotas exclusivas da demonstração também atravessam MSW e Axios.
  if (caminho === '/simulacao' && metodo === 'GET')
    return HttpResponse.json({ cenario: banco.cenario });
  if (caminho === '/simulacao' && metodo === 'POST') {
    const dados = z
      .object({
        cenario: z.enum(cenarios).optional(),
        acao: z
          .enum([
            'reset',
            'preco',
            'esgotar',
            'duplicado',
            'antigo',
            'desconectar',
            'expirar',
            'finalizar',
          ])
          .optional(),
        nftId: z.string().optional(),
      })
      .parse(await lerCorpo());
    if (dados.acao === 'reset') {
      for (const conexao of conexoes) conexao.fechar();
      banco = await criarBanco();
    }
    if (dados.cenario) banco.cenario = dados.cenario;
    if (dados.acao === 'expirar') {
      for (const sessao of Object.values(banco.sessoes)) sessao.expiraEm = 0;
    }
    if (dados.acao === 'desconectar') for (const conexao of conexoes) conexao.fechar();
    if (dados.acao === 'finalizar') {
      for (const pedido of banco.pedidos) pedido.finalizarEm = 0;
      reconciliarPedidos();
    }
    const nft = banco.nfts.find((nft) => nft.id === (dados.nftId ?? '1'));
    if (nft && (dados.acao === 'preco' || dados.acao === 'esgotar')) {
      if (dados.acao === 'preco') nft.edicoes[0].preco = '1.39';
      else nft.edicoes[0].disponivel = 0;
      nft.versao++;
      salvarBanco(banco);
      emitir('nft.updated', nft.id, nft.versao);
    }
    if (nft && (dados.acao === 'duplicado' || dados.acao === 'antigo'))
      emitir(
        'nft.updated',
        nft.id,
        dados.acao === 'antigo' ? Math.max(0, nft.versao - 1) : nft.versao,
      );
    salvarBanco(banco);
    return HttpResponse.json({ cenario: banco.cenario });
  }

  await delay(
    banco.cenario === 'lento'
      ? 1800
      : banco.cenario === 'variavel'
        ? url.searchParams.get('busca')?.length === 1
          ? 1200
          : 80
        : 60,
  );
  if (banco.cenario === 'sem-conexao') return HttpResponse.error();
  if (banco.cenario === 'erro-500')
    throw new FalhaApi(503, 'Serviço temporariamente indisponível. Tente novamente.');
  if (banco.cenario === 'erro-403')
    throw new FalhaApi(403, 'Você não tem permissão para esta operação.');
  if (banco.cenario === 'sessao-expirada')
    for (const sessao of Object.values(banco.sessoes)) sessao.expiraEm = 0;
  reconciliarPedidos();

  if ((caminho === '/login' || caminho === '/cadastro') && metodo === 'POST')
    return autenticarConta({
      banco,
      requisicao,
      url,
      caminho,
      metodo,
      dono: '',
      usuario: undefined,
      lerCorpo,
      emitir,
    });
  const privado = [
    '/sessao',
    '/logout',
    '/perfil',
    '/senha',
    '/carteiras',
    '/conexao',
    '/favoritos',
    '/pedidos',
  ].some((prefixo) => caminho.startsWith(prefixo));
  const dono = identificar(banco, requisicao, privado);
  const usuario = banco.usuarios.find((usuario) => usuario.id === dono);
  const contexto = { banco, requisicao, url, caminho, metodo, dono, usuario, lerCorpo, emitir };
  if (caminho === '/conexao' && metodo === 'POST') return alterarConexao(contexto);
  if (caminho === '/sessao') return consultarSessao(contexto);
  if (caminho === '/logout' && metodo === 'POST') return encerrarSessao(contexto);
  if (caminho === '/nfts') return listarNfts(contexto);
  if (caminho.startsWith('/nfts/')) return consultarNft(contexto);
  if (caminho === '/favoritos') return alterarFavoritos(contexto);
  if (caminho === '/carrinho') return alterarCarrinho(contexto);
  if (caminho === '/cotacao') return consultarCotacao(contexto);
  if (caminho === '/perfil' && usuario) return alterarPerfil(contexto);
  if (caminho === '/senha' && usuario && metodo === 'PATCH') return alterarSenha(contexto);
  if (caminho === '/carteiras') return alterarCarteiras(contexto);
  if (caminho === '/pedidos' && metodo === 'GET') return listarPedidos(contexto);
  if (caminho === '/pedidos' && metodo === 'POST') return criarPedido(contexto);
  if (caminho.startsWith('/pedidos/')) return consultarPedido(contexto);
  throw new FalhaApi(404, 'Recurso não encontrado.');
}

/** Normaliza erros de validação e de negócio sem ocultar falhas de programação. */
const manipuladorRest = http.all('/api/*', async ({ request }) => {
  try {
    return await responder(request);
  } catch (erro) {
    if (erro instanceof z.ZodError)
      return HttpResponse.json(
        { mensagem: erro.issues.map((item) => item.message).join(' ') },
        { status: 422 },
      );
    if (erro instanceof FalhaApi)
      return HttpResponse.json({ mensagem: erro.message }, { status: erro.status });
    return HttpResponse.json({ mensagem: 'Falha inesperada na simulação.' }, { status: 500 });
  }
});

export const trabalhador = setupWorker(manipuladorRest, manipuladorSocket);
