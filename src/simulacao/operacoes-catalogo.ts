/** Operações REST de catalogo; regras e persistência ficam na camada de simulação. */
import { HttpResponse } from 'msw';
import { z } from 'zod';
import { filtrosSchema } from '../dominio/contratos';
import { paraWei } from '../dominio/valores';
import { FalhaApi, salvarBanco } from './banco';
import type { ContextoRequisicao } from './contexto';
const quantidadePorPagina = 9;
/** A busca em português aceita nomes com ou sem acentos, sem alterar o texto apresentado. */
function normalizarBusca(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}
/** Aplica filtros combinados, ordenação em wei e paginação no servidor. */
export async function listarNfts(contexto: ContextoRequisicao): Promise<Response> {
  const { banco, url } = contexto;

  const filtros = filtrosSchema.parse(Object.fromEntries(url.searchParams));
  const itens = banco.nfts.filter(
    (nft) =>
      normalizarBusca(`${nft.nome} ${nft.criador}`).includes(normalizarBusca(filtros.busca)) &&
      (!filtros.categoria || nft.categoria === filtros.categoria) &&
      (!filtros.rede || nft.rede === filtros.rede) &&
      (filtros.aba !== 'novos' || nft.novo) &&
      (filtros.aba !== 'alta' || nft.emAlta) &&
      paraWei(nft.edicoes[0].preco) >= paraWei(filtros.minimo) &&
      paraWei(nft.edicoes[0].preco) <= paraWei(filtros.maximo),
  );
  if (filtros.ordem !== 'recentes')
    itens.sort((primeiro, segundo) => {
      const diferenca = paraWei(primeiro.edicoes[0].preco) - paraWei(segundo.edicoes[0].preco);
      return (diferenca < 0n ? -1 : diferenca > 0n ? 1 : 0) * (filtros.ordem === 'menor' ? 1 : -1);
    });
  return HttpResponse.json(
    banco.cenario === 'vazio'
      ? { itens: [], total: 0, paginas: 1 }
      : {
          itens: itens.slice(
            (filtros.pagina - 1) * quantidadePorPagina,
            filtros.pagina * quantidadePorPagina,
          ),
          total: itens.length,
          paginas: Math.max(1, Math.ceil(itens.length / quantidadePorPagina)),
        },
  );
}

/** Contagens das coleções e redes são derivadas do banco, sem números decorativos na interface. */
export function consultarFacetas(contexto: ContextoRequisicao): Response {
  const { banco } = contexto;
  return HttpResponse.json({
    categorias: [
      'Arte digital',
      'Fotografia',
      'Música',
      'Arte 3D',
      'Colecionáveis',
      'Generativa',
      'Jogos',
      'Assinaturas',
      'Utilidade',
    ].map((nome) => ({ nome, total: banco.nfts.filter((nft) => nft.categoria === nome).length })),
    redes: ['Ethereum', 'Polygon', 'Solana'].map((nome) => ({
      nome,
      total: banco.nfts.filter((nft) => nft.rede === nome).length,
    })),
  });
}

/** Localiza uma obra por identificador e diferencia recursos inexistentes. */
export async function consultarNft(contexto: ContextoRequisicao): Promise<Response> {
  const { banco, caminho } = contexto;

  const nft = banco.nfts.find((nft) => nft.id === caminho.split('/')[2]);
  if (!nft) throw new FalhaApi(404, 'NFT não encontrado.');
  return HttpResponse.json(nft);
}

/** Consulta ou persiste favoritos dentro do escopo do usuário autenticado. */
export async function alterarFavoritos(contexto: ContextoRequisicao): Promise<Response> {
  const { banco, metodo, dono, lerCorpo } = contexto;

  const favoritos = (banco.favoritos[dono] ??= []);
  if (metodo !== 'GET') {
    if (banco.cenario === 'favorito-falha')
      throw new FalhaApi(
        503,
        'Não foi possível salvar seu favorito. O estado anterior foi restaurado.',
      );
    const { nftId } = z.object({ nftId: z.string() }).parse(await lerCorpo());
    if (!banco.nfts.some((nft) => nft.id === nftId)) throw new FalhaApi(404, 'NFT não encontrado.');
    banco.favoritos[dono] =
      metodo === 'DELETE'
        ? favoritos.filter((id) => id !== nftId)
        : Array.from(new Set([...favoritos, nftId]));
    salvarBanco(banco);
  }
  return HttpResponse.json(banco.favoritos[dono]);
}
