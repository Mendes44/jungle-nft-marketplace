/** Banco da API simulada. Apenas esta camada acessa a persistência dos dados de negócio. */
import { z } from 'zod';
import {
  carteiraSchema,
  cotacaoSchema,
  itemSchema,
  nftSchema,
  pedidoSchema,
  perfilSchema,
  type Item,
  type Perfil,
  type Cotacao,
  type Pedido,
} from '../dominio/contratos';
import { deWei, paraWei } from '../dominio/valores';

const chaveBanco = 'kurio.banco.v1';
const usuarioSchema = perfilSchema.extend({ senhaHash: z.string() });
const bancoSchema = z.object({
  nfts: z.array(nftSchema),
  usuarios: z.array(usuarioSchema),
  sessoes: z.record(
    z.string(),
    z.object({
      usuarioId: z.string(),
      expiraEm: z.number(),
      carteiraId: z.string().optional(),
      rede: carteiraSchema.shape.rede.optional(),
      provedor: carteiraSchema.shape.tipo.optional(),
    }),
  ),
  carrinhos: z.record(z.string(), z.object({ itens: z.array(itemSchema), cupom: z.string() })),
  favoritos: z.record(z.string(), z.array(z.string())),
  carteiras: z.record(z.string(), z.array(carteiraSchema)),
  pedidos: z.array(pedidoSchema),
  tentativas: z.record(z.string(), z.object({ corpo: z.string(), pedidoId: z.string() })),
  cenario: z.string(),
  sequencia: z.number(),
  versaoCatalogo: z.number().default(1),
});
export type Banco = z.infer<typeof bancoSchema>;
export type Usuario = z.infer<typeof usuarioSchema>;

/** Erros de domínio viram respostas REST estruturadas no handler central. */
export class FalhaApi extends Error {
  constructor(
    public status: number,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

/** Hash de credenciais fictícias; o navegador não mantém senhas em claro no banco. */
export async function hashSenha(senha: string): Promise<string> {
  const resumo = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`kurio-simulacao:${senha}`),
  );
  return Array.from(new Uint8Array(resumo), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Fixtures variadas e determinísticas; cada edição possui disponibilidade própria. */
export async function criarBanco(): Promise<Banco> {
  const nomes = [
    'Emerald Ape #042',
    'Sage Nomad #009',
    'Neon Vessel #552',
    'Cosmic Bloom #118',
    'Violet Nomad #314',
    'Ivory Baron #088',
    'Golden Beat #207',
    'Golden Frequency #071',
    'Golden Signal #160',
    'Terra Nova #247',
    'Pixel Forest #260',
    'Aurora #273',
  ];
  const precos = [
    '1.19',
    '1.69',
    '1.99',
    '1.29',
    '1.39',
    '1.79',
    '0.99',
    '0.59',
    '0.39',
    '2.29',
    '0.59',
    '0.100000000000000001',
  ];
  const senhaHash = await hashSenha('Colecao123');
  // O Figma reutiliza os quatro retratos em diferentes NFTs e edições.
  const retratos = [0, 1, 2, 1, 1, 2, 3, 3, 3, 0, 1, 2];
  return bancoSchema.parse({
    nfts: nomes.map((nome, indice) => ({
      id: String(indice + 1),
      nome,
      criador: indice === 0 ? 'Nova Sato' : indice % 2 ? 'Marina Costa' : 'Rafael Lima',
      categoria: ['Arte digital', 'Fotografia', 'Arte 3D'][indice % 3],
      rede: indice % 2 ? 'Polygon' : 'Ethereum',
      imagem: `/imagens/colecao-${retratos[indice]}.webp`,
      descricao:
        'Um colecionável digital finalizado à mão da coleção Kurio Editions, verificado na Ethereum, com arte desbloqueável e acesso para colecionadores.',
      colecao: 'Kurio Apes',
      atributos:
        retratos[indice] === 0
          ? ['Óculos', 'Esmeralda', 'Raro']
          : retratos[indice] === 1
            ? ['Chapéu', 'Moletom', 'Raro']
            : retratos[indice] === 2
              ? ['Paletó', 'Marfim', 'Raro']
              : ['Fones', 'Dourado', 'Raro'],
      contrato: '0x7A42...19E8',
      direitosAutorais: 5,
      versao: 1,
      novo: indice < 3,
      emAlta: [0, 2, 5].includes(indice),
      raridade: [2].includes(indice) ? 'raro' : 'comum',
      precoAnterior: indice === 2 ? '2.29' : undefined,
      avaliacoes: { media: 4.8, total: 19 },
      edicoes: [
        { id: 'limitada', nome: '1/50', disponivel: indice === 0 ? 5 : 15, preco: precos[indice] },
        {
          id: 'unica',
          nome: '1/1',
          disponivel: indice === 0 ? 0 : 1,
          preco: deWei(paraWei(precos[indice]) * 2n),
        },
        { id: 'dez', nome: '1/10', disponivel: 10, preco: precos[indice] },
        { id: 'aberta', nome: 'ABERTA', disponivel: 100, preco: precos[indice] },
      ],
    })),
    usuarios: [
      {
        id: 'ana',
        nome: 'Ana Oliveira',
        email: 'ana@exemplo.com',
        apelido: 'ana.arte',
        ens: 'ana.eth',
        nomeCarteira: 'Minha carteira',
        biografia: 'Colecionando novas perspectivas.',
        avatar: '/imagens/colecao-0.webp',
        senhaHash,
      },
      {
        id: 'bruno',
        nome: 'Bruno Santos',
        email: 'bruno@exemplo.com',
        apelido: 'bruno.nft',
        ens: 'bruno.eth',
        nomeCarteira: 'Carteira de Bruno',
        biografia: '',
        avatar: '/imagens/colecao-0.webp',
        senhaHash,
      },
    ],
    sessoes: {},
    carrinhos: {},
    favoritos: {},
    carteiras: {
      ana: [
        {
          id: 'ana-principal',
          nome: 'Minha carteira',
          apelido: 'Principal',
          nomePerfil: 'ana.arte',
          email: 'ana@exemplo.com',
          ens: 'ana.eth',
          indicacao: 'KURIO',
          endereco: `0x${'a'.repeat(40)}`,
          rede: 'Ethereum',
          tipo: 'MetaMask',
          principal: true,
        },
      ],
      bruno: [
        {
          id: 'bruno-principal',
          nome: 'Carteira de Bruno',
          apelido: 'Principal',
          nomePerfil: 'bruno.nft',
          email: 'bruno@exemplo.com',
          ens: 'bruno.eth',
          indicacao: 'KURIO',
          endereco: `0x${'b'.repeat(40)}`,
          rede: 'Ethereum',
          tipo: 'Coinbase Wallet',
          principal: true,
        },
      ],
    },
    pedidos: [],
    tentativas: {},
    cenario: 'padrao',
    sequencia: 0,
    versaoCatalogo: 2,
  });
}

/** Recupera apenas dados aderentes ao contrato; dados antigos/corrompidos iniciam uma fixture limpa. */
export async function carregarBanco(): Promise<Banco> {
  try {
    const resultado = bancoSchema.safeParse(JSON.parse(localStorage.getItem(chaveBanco) ?? 'null'));
    if (resultado.success) {
      const banco = resultado.data;
      if (banco.versaoCatalogo < 2) {
        // Atualiza nomes e classificações sem apagar contas, estoque, carrinhos ou recibos históricos.
        const referencia = await criarBanco();
        for (const nft of banco.nfts) {
          const original = referencia.nfts.find((item) => item.id === nft.id);
          if (original) {
            nft.nome = original.nome;
            nft.descricao = original.descricao;
            nft.novo = original.novo;
            nft.emAlta = original.emAlta;
            nft.raridade = original.raridade;
            nft.precoAnterior = original.precoAnterior;
            nft.avaliacoes = original.avaliacoes;
            nft.colecao = original.colecao;
            nft.atributos = original.atributos;
            nft.contrato = original.contrato;
            nft.direitosAutorais = original.direitosAutorais;
            for (const edicao of original.edicoes) {
              if (!nft.edicoes.some((existente) => existente.id === edicao.id))
                nft.edicoes.push(edicao);
            }
          }
        }
        banco.versaoCatalogo = 2;
        salvarBanco(banco);
      }
      return banco;
    }
  } catch {
    /* Persistência inválida não impede a demonstração. */
  }
  const banco = await criarBanco();
  salvarBanco(banco);
  return banco;
}
/** Persiste a transação simulada antes de responder ou transmitir qualquer evento. */
export function salvarBanco(banco: Banco): void {
  localStorage.setItem(chaveBanco, JSON.stringify(banco));
}

/** Resolve o dono a partir do token de sessão; visitante só possui acesso ao seu carrinho. */
export function identificar(banco: Banco, requisicao: Request, privado = false): string {
  const token = requisicao.headers.get('Authorization')?.replace('Bearer ', '');
  const sessao = token ? banco.sessoes[token] : undefined;
  if (token && (!sessao || sessao.expiraEm <= Date.now()))
    throw new FalhaApi(401, 'Sua sessão expirou. Entre novamente para continuar.');
  if (sessao) return sessao.usuarioId;
  if (privado) throw new FalhaApi(401, 'Entre na sua conta para continuar.');
  const visitante = requisicao.headers.get('X-Visitante');
  if (!visitante || !/^[\w-]{1,80}$/.test(visitante))
    throw new FalhaApi(400, 'Identificação do visitante inválida.');
  return `visitante:${visitante}`;
}

/** Oculta o hash de senha de qualquer resposta pública. */
export function perfilPublico(usuario: Usuario): Perfil {
  return perfilSchema.parse(usuario);
}

/** Garante que um carrinho sempre existe para o escopo solicitado. */
export function obterCarrinho(banco: Banco, dono: string) {
  return (banco.carrinhos[dono] ??= { itens: [], cupom: '' });
}

/** Monta snapshot com os valores atuais do catálogo; itens esgotados continuam visíveis para correção. */
export function linhasCarrinho(banco: Banco, dono: string) {
  return obterCarrinho(banco, dono).itens.map((item) => {
    const nft = banco.nfts.find((nft) => nft.id === item.nftId);
    const edicao = nft?.edicoes.find((edicao) => edicao.id === item.edicaoId);
    if (!nft || !edicao) throw new FalhaApi(404, 'NFT ou edição não encontrado.');
    return {
      ...item,
      nome: nft.nome,
      edicao: edicao.nome,
      imagem: nft.imagem,
      preco: edicao.preco,
      disponivel: edicao.disponivel,
    };
  });
}

/** Normaliza o código e distingue formato inválido, inexistência e expiração. */
export function validarCupom(entrada: string, cenario = 'padrao'): string {
  const codigo = entrada.trim().toUpperCase();
  if (!codigo) return '';
  if (cenario === 'cupom-invalido' || !/^[A-Z0-9]{3,32}$/.test(codigo))
    throw new FalhaApi(422, 'Cupom inválido. Use de 3 a 32 letras ou números.');
  if (cenario === 'cupom-inexistente') throw new FalhaApi(422, 'Cupom não existe.');
  if (codigo === 'EXPIRADO') throw new FalhaApi(422, 'Este cupom expirou.');
  if (codigo !== 'KURIO10') throw new FalhaApi(422, 'Cupom não existe.');
  return codigo;
}

/** Valida cupom no servidor e calcula desconto de 10% truncado em wei. */
export function cotar(banco: Banco, dono: string): Cotacao {
  const carrinho = obterCarrinho(banco, dono);
  validarCupom(carrinho.cupom);
  const itens = linhasCarrinho(banco, dono);
  const subtotal = itens.reduce(
    (soma, item) => soma + paraWei(item.preco) * BigInt(item.quantidade),
    0n,
  );
  const desconto = carrinho.cupom ? subtotal / 10n : 0n;
  const taxa = itens.length ? paraWei('0.005') : 0n;
  const valores = {
    itens,
    cupom: carrinho.cupom,
    subtotal: deWei(subtotal),
    desconto: deWei(desconto),
    taxa: deWei(taxa),
    total: deWei(subtotal - desconto + taxa),
  };
  return cotacaoSchema.parse({ ...valores, id: JSON.stringify(valores) });
}

/** Soma itens de visitante ao carrinho autenticado, respeitando o estoque de cada edição. */
export function mesclarVisitante(banco: Banco, visitante: string, dono: string): void {
  const origem = obterCarrinho(banco, `visitante:${visitante}`);
  const destino = obterCarrinho(banco, dono);
  for (const item of origem.itens) {
    const existente = destino.itens.find((linha) => mesmaLinha(linha, item));
    const estoque =
      banco.nfts
        .find((nft) => nft.id === item.nftId)
        ?.edicoes.find((edicao) => edicao.id === item.edicaoId)?.disponivel ?? 0;
    const quantidade = Math.min(estoque, item.quantidade + (existente?.quantidade ?? 0));
    if (existente) existente.quantidade = quantidade;
    else if (quantidade) destino.itens.push({ ...item, quantidade });
  }
  destino.itens = destino.itens.filter((item) => item.quantidade > 0);
  if (!destino.cupom) destino.cupom = origem.cupom;
  delete banco.carrinhos[`visitante:${visitante}`];
}
/** Compara a chave composta: NFTs iguais de edições diferentes são linhas distintas. */
export function mesmaLinha(primeiro: Item, segundo: Item): boolean {
  return primeiro.nftId === segundo.nftId && primeiro.edicaoId === segundo.edicaoId;
}

/** Liquida uma única vez, preservando itens adicionados depois da criação do pedido. */
export function finalizarPedido(banco: Banco, pedido: Pedido): boolean {
  if (pedido.estado !== 'pendente' || Date.now() < pedido.finalizarEm) return false;
  pedido.estado = pedido.recusar ? 'recusado' : 'confirmado';
  pedido.versao += 1;
  if (pedido.recusar) {
    for (const item of pedido.cotacao.itens) {
      const nft = banco.nfts.find((nft) => nft.id === item.nftId);
      const edicao = nft?.edicoes.find((edicao) => edicao.id === item.edicaoId);
      if (edicao && nft) {
        edicao.disponivel += item.quantidade;
        nft.versao += 1;
      }
    }
  } else {
    const carrinho = obterCarrinho(banco, pedido.usuarioId);
    carrinho.itens = carrinho.itens.flatMap((item) => {
      const comprado = pedido.cotacao.itens.find((linha) => mesmaLinha(linha, item));
      const restante = item.quantidade - (comprado?.quantidade ?? 0);
      return restante > 0 ? [{ ...item, quantidade: restante }] : [];
    });
    if (!carrinho.itens.length) carrinho.cupom = '';
  }
  salvarBanco(banco);
  return true;
}
