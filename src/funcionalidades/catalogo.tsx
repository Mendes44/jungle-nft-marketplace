/** Descoberta e detalhe: estado de pesquisa pertence à URL; consultas obsoletas são canceladas. */
import { useState } from 'react';
import { Link, useNavigate, useSearch, useParams } from '@tanstack/react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { ArrowRight, Heart, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  catalogoSchema,
  carrinhoSchema,
  nftSchema,
  type Filtros,
  type Nft,
} from '../dominio/contratos';
import { exibirEth } from '../dominio/valores';
import { alterar, cache, consultar } from '../infraestrutura/api';
import { useSessao } from '../infraestrutura/sessao';
import { Button } from '../componentes/ui/button';
import { Campo, Esqueleto, EsqueletoDoNft, Falha } from '../componentes/comuns';

/** Cartão navegável com imagem local e preço sem arredondamento. */
export function CartaoNft({ nft }: { nft: Nft }) {
  return (
    <article className="cartao-nft">
      <Link to="/nft/$nftId" params={{ nftId: nft.id }} aria-label={`Ver ${nft.nome}`}>
        <div className="moldura-arte">
          <img src={nft.imagem} alt={`Arte ${nft.nome}`} width="400" height="400" loading="lazy" />
        </div>
        <div className="flex justify-between gap-2 mt-4">
          <h3>{nft.nome}</h3>
          <ArrowRight size={16} aria-hidden="true" />
        </div>
      </Link>
      <p className="text-[var(--cobre)] mt-1">{exibirEth(nft.edicoes[0].preco)}</p>
      <p className="text-xs text-[var(--suave)] mt-2">
        {nft.criador} · {nft.rede}
      </p>
    </article>
  );
}

/** Filtros combináveis com reset de página em uma única navegação tipada. */
function FiltrosCatalogo({
  filtros,
  mudar,
}: {
  filtros: Filtros;
  mudar: (dados: Partial<Filtros>) => void;
}) {
  const [minimo, definirMinimo] = useState(filtros.minimo);
  const [maximo, definirMaximo] = useState(filtros.maximo);
  return (
    <div className="filtros">
      <h2>Coleções</h2>
      <div className="lista-categorias">
        {['', 'Arte digital', 'Fotografia', 'Arte 3D'].map((categoria) => (
          <button
            key={categoria}
            aria-pressed={filtros.categoria === categoria}
            onClick={() => mudar({ categoria })}
          >
            {categoria || 'Todas as coleções'}
            <span>{categoria ? '↗' : '12'}</span>
          </button>
        ))}
      </div>
      <form
        onSubmit={(evento) => {
          evento.preventDefault();
          mudar({ minimo, maximo });
        }}
      >
        <h3>Faixa de preço</h3>
        <div className="flex gap-2">
          <Campo rotulo="Mínimo ETH">
            {(id) => (
              <input
                id={id}
                type="text"
                inputMode="decimal"
                pattern="[0-9]+([.][0-9]{1,18})?"
                value={minimo}
                onChange={(evento) => definirMinimo(evento.target.value)}
                required
              />
            )}
          </Campo>
          <Campo rotulo="Máximo ETH">
            {(id) => (
              <input
                id={id}
                type="text"
                inputMode="decimal"
                pattern="[0-9]+([.][0-9]{1,18})?"
                value={maximo}
                onChange={(evento) => definirMaximo(evento.target.value)}
                required
              />
            )}
          </Campo>
        </div>
        <Button size="sm" className="mt-3">
          Aplicar preço
        </Button>
      </form>
      <Campo rotulo="Rede">
        {(id) => (
          <select
            id={id}
            value={filtros.rede}
            onChange={(evento) => mudar({ rede: evento.target.value })}
          >
            <option value="">Todas as redes</option>
            <option>Ethereum</option>
            <option>Polygon</option>
          </select>
        )}
      </Campo>
      <Button
        variant="ghost"
        onClick={() =>
          mudar({
            busca: '',
            categoria: '',
            rede: '',
            minimo: '0',
            maximo: '100',
            ordem: 'recentes',
          })
        }
      >
        Limpar filtros
      </Button>
      <div className="destaque-lateral">
        <p className="sobretitulo">NFT EM DESTAQUE</p>
        <img
          src="/imagens/colecao-1.webp"
          width="240"
          height="240"
          alt="Nômade Sábio, destaque da coleção"
        />
        <h3>Nômade Sábio #055</h3>
        <p>Uma nova perspectiva.</p>
      </div>
    </div>
  );
}

/** Página inicial baseada na composição do Figma e com resultados inteiramente vindos da API. */
export function Inicio() {
  const filtros = useSearch({ from: '/' });
  const [filtrosAbertos, definirFiltrosAbertos] = useState(() => window.innerWidth > 600);
  const navegar = useNavigate({ from: '/' });
  const catalogo = useQuery({
    queryKey: ['catalogo', filtros],
    queryFn: ({ signal }) =>
      consultar(
        `/nfts?${new URLSearchParams(Object.entries(filtros).map(([chave, valor]) => [chave, String(valor)]))}`,
        catalogoSchema,
        signal,
      ),
  });
  /** Alterações preservam os demais filtros e reiniciam a paginação. */
  function mudar(dados: Partial<Filtros>) {
    void navegar({
      search: { ...filtros, ...dados, pagina: dados.pagina ?? 1 },
      resetScroll: false,
    });
  }
  return (
    <>
      <section className="hero">
        <div>
          <p className="sobretitulo">Bem-vindo à Kurio</p>
          <h1>
            <span className="texto-desktop">
              SEJA DONO DO FUTURO
              <br />
              DA ARTE DIGITAL
            </span>
            <span className="texto-mobile">
              SEJA DONO DA
              <br />
              CULTURA DIGITAL
            </span>
          </h1>
          <p className="descricao">
            <span className="texto-desktop">
              Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte
              digital rara, apoie artistas e tenha uma parte da cultura da internet.
            </span>
            <span className="texto-mobile">
              Descubra NFTs selecionados de criadores do mundo todo.
            </span>
          </p>
          <Button asChild>
            <a href="#catalogo">
              EXPLORAR COLEÇÕES <ArrowRight size={17} />
            </a>
          </Button>
          <p className="hero-nota">
            <span>12</span> obras selecionadas <span>02</span> redes para explorar
          </p>
        </div>
        <Link
          to="/nft/$nftId"
          params={{ nftId: '1' }}
          className="hero-arte"
          aria-label="Conhecer MACACO ESMERALDA #042"
        >
          <img
            src="/imagens/colecao-0.webp"
            alt="Macaco Esmeralda, personagem da coleção Kurio"
            width="480"
            height="480"
            fetchPriority="high"
          />
          <img
            className="arte-secundaria"
            src="/imagens/colecao-1.webp"
            alt=""
            width="110"
            height="110"
          />
          <div>
            <span>MACACO ESMERALDA #042</span>
            <span>↗</span>
          </div>
        </Link>
      </section>
      <section id="catalogo" aria-labelledby="titulo-catalogo">
        <div className="cabecalho-secao">
          <div>
            <p className="sobretitulo">ENCONTRE SUA PRÓXIMA PEÇA</p>
            <h2 id="titulo-catalogo">
              Explore o mercado<span className="text-[var(--cobre)]">.</span>
            </h2>
          </div>
          <span className="text-xs text-[var(--suave)]">
            Curadoria independente · Edições limitadas
          </span>
        </div>
        <div className="catalogo-layout">
          <aside aria-label="Filtros do catálogo">
            <button
              className="alternar-filtros"
              aria-expanded={filtrosAbertos}
              onClick={() => definirFiltrosAbertos(!filtrosAbertos)}
            >
              Filtrar coleções <span>{filtrosAbertos ? '−' : '+'}</span>
            </button>
            <div className={filtrosAbertos ? 'conteudo-filtros aberto' : 'conteudo-filtros'}>
              <FiltrosCatalogo
                key={`${filtros.minimo}:${filtros.maximo}`}
                filtros={filtros}
                mudar={mudar}
              />
            </div>
          </aside>
          <div>
            <div className="barra-catalogo">
              <Campo rotulo="Buscar NFTs">
                {(id) => (
                  <input
                    id={id}
                    type="search"
                    placeholder="Nome da obra ou artista"
                    value={filtros.busca}
                    onChange={(evento) => mudar({ busca: evento.target.value })}
                  />
                )}
              </Campo>
              <Campo rotulo="Ordenar por">
                {(id) => (
                  <select
                    id={id}
                    value={filtros.ordem}
                    onChange={(evento) =>
                      mudar({
                        ordem: z.enum(['recentes', 'menor', 'maior']).parse(evento.target.value),
                      })
                    }
                  >
                    <option value="recentes">Listados recentemente</option>
                    <option value="menor">Menor preço</option>
                    <option value="maior">Maior preço</option>
                  </select>
                )}
              </Campo>
            </div>
            {catalogo.isFetching && !catalogo.isPending && (
              <p role="status" className="text-xs mb-3">
                Atualizando resultados…
              </p>
            )}
            {catalogo.isPending ? (
              <div className="grade-nfts">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((indice) => (
                  <Esqueleto key={indice} />
                ))}
              </div>
            ) : catalogo.isError ? (
              <Falha erro={catalogo.error} tentar={() => void catalogo.refetch()} />
            ) : catalogo.data.itens.length ? (
              <>
                <p className="sr-only" role="status">
                  {catalogo.data.total} obras encontradas
                </p>
                <div className="grade-nfts">
                  {catalogo.data.itens.map((nft) => (
                    <CartaoNft key={nft.id} nft={nft} />
                  ))}
                </div>
                <nav aria-label="Paginação" className="paginacao">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={filtros.pagina <= 1}
                    aria-label="Página anterior"
                    onClick={() => mudar({ pagina: filtros.pagina - 1 })}
                  >
                    <ChevronLeft size={18} />
                  </Button>
                  <span>
                    Página {filtros.pagina} de {catalogo.data.paginas}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={filtros.pagina >= catalogo.data.paginas}
                    aria-label="Próxima página"
                    onClick={() => mudar({ pagina: filtros.pagina + 1 })}
                  >
                    <ChevronRight size={18} />
                  </Button>
                </nav>
              </>
            ) : (
              <div className="vazio">
                <h3>Nenhuma obra encontrada</h3>
                <p>Experimente outra busca ou remova um filtro.</p>
                <Button
                  onClick={() =>
                    mudar({ busca: '', categoria: '', rede: '', minimo: '0', maximo: '100' })
                  }
                >
                  Ver todas as obras
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>
      <section className="faixa-editorial">
        <p className="sobretitulo">ARTE QUE CONECTA</p>
        <h2>
          Uma coleção.
          <br />
          Infinitas perspectivas.
        </h2>
        <p>Cada obra tem uma história. Encontre a sua.</p>
        <Button asChild variant="outline">
          <Link to="/nft/$nftId" params={{ nftId: '1' }}>
            Conhecer a coleção <ArrowRight size={18} />
          </Link>
        </Button>
      </section>
    </>
  );
}

/** Recomendações são links para obras reais do catálogo, obtidas pela mesma API da busca. */
export function MaisDaColecao() {
  const consulta = useQuery({
    queryKey: ['catalogo', 'recomendacoes'],
    queryFn: ({ signal }) => consultar('/nfts', catalogoSchema, signal),
  });
  if (consulta.isError) return null;
  return (
    <section className="mais-colecao" aria-label="Mais desta coleção">
      <h2>Mais desta coleção</h2>
      <div className="grade-recomendacoes">
        {consulta.isPending
          ? [1, 2, 3, 4, 5].map((indice) => <Esqueleto key={indice} />)
          : consulta.data.itens.slice(3, 8).map((nft) => <CartaoNft key={nft.id} nft={nft} />)}
      </div>
    </section>
  );
}

/** Favoritos usam optimistic update com snapshot e rollback quando a API recusa a alteração. */
function Favoritar({ nftId }: { nftId: string }) {
  const { perfil } = useSessao();
  const navegar = useNavigate();
  const chave = ['favoritos', perfil?.id];
  const favoritos = useQuery({
    queryKey: chave,
    queryFn: ({ signal }) => consultar('/favoritos', z.array(z.string()), signal),
    enabled: Boolean(perfil),
  });
  const favorito = favoritos.data?.includes(nftId) ?? false;
  const salvar = useMutation({
    mutationFn: (remover: boolean) =>
      alterar(remover ? 'DELETE' : 'POST', '/favoritos', { nftId }, z.array(z.string())),
    onMutate: async (remover) => {
      await cache.cancelQueries({ queryKey: chave });
      const anterior = cache.getQueryData<string[]>(chave);
      cache.setQueryData<string[]>(chave, (itens = []) =>
        remover ? itens.filter((id) => id !== nftId) : [...itens, nftId],
      );
      return { anterior };
    },
    onError: (_erro, _dados, contexto) => {
      cache.setQueryData(chave, contexto?.anterior ?? []);
    },
    onSettled: () => cache.invalidateQueries({ queryKey: chave }),
  });
  return (
    <div>
      <Button
        variant="outline"
        aria-pressed={favorito}
        disabled={salvar.isPending || (Boolean(perfil) && favoritos.isPending) || favoritos.isError}
        onClick={() => {
          if (!perfil) void navegar({ to: '/login', search: { retorno: `/nft/${nftId}` } });
          else salvar.mutate(favorito);
        }}
      >
        <Heart size={17} fill={favorito ? 'currentColor' : 'none'} />
        {favorito ? 'Favoritado' : 'Favoritar'}
      </Button>
      {salvar.isError && <Falha erro={salvar.error} />}
      {favoritos.isError && (
        <Falha erro={favoritos.error} tentar={() => void favoritos.refetch()} />
      )}
    </div>
  );
}

/** Detalhe suporta acesso direto, edições esgotadas e validação de quantidade também no servidor. */
export function DetalheNft() {
  const { nftId } = useParams({ from: '/nft/$nftId' });
  const nft = useQuery({
    queryKey: ['nft', nftId],
    queryFn: ({ signal }) => consultar(`/nfts/${nftId}`, nftSchema, signal),
  });
  const [edicaoId, definirEdicao] = useState('limitada');
  const [quantidade, definirQuantidade] = useState(1);
  const [imagem, definirImagem] = useState(0);
  const navegar = useNavigate();
  const adicionar = useMutation({
    mutationFn: () => alterar('POST', '/carrinho', { nftId, edicaoId, quantidade }, carrinhoSchema),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: ['carrinho'] });
      await cache.invalidateQueries({ queryKey: ['cotacao'] });
      await navegar({ to: '/carrinho' });
    },
  });
  if (nft.isPending) return <EsqueletoDoNft />;
  if (nft.isError) return <Falha erro={nft.error} tentar={() => void nft.refetch()} />;
  const edicao = nft.data.edicoes.find((edicao) => edicao.id === edicaoId) ?? nft.data.edicoes[0];
  return (
    <>
      <nav aria-label="Caminho" className="caminho">
        <Link to="/">Início</Link> / Mercado / {nft.data.nome}
      </nav>
      <section className="detalhe-layout">
        <div className="galeria">
          <div className="miniaturas">
            {[0, 1, 2].map((indice) => (
              <button
                key={indice}
                aria-label={`Visualização ${indice + 1}`}
                aria-pressed={imagem === indice}
                onClick={() => definirImagem(indice)}
              >
                <img
                  src={nft.data.imagem}
                  alt=""
                  width="72"
                  height="72"
                  style={{ transform: `scale(${1 + indice * 0.12})` }}
                />
              </button>
            ))}
          </div>
          <div className="arte-detalhe">
            <img
              src={nft.data.imagem}
              alt={nft.data.nome}
              width="600"
              height="600"
              style={{ transform: `scale(${1 + imagem * 0.12})` }}
            />
          </div>
        </div>
        <div className="informacoes-nft">
          <p className="sobretitulo">EDIÇÕES KURIO / {nft.data.rede}</p>
          <h1>{nft.data.nome}</h1>
          <p className="preco-grande">{exibirEth(edicao.preco)}</p>
          <hr />
          <h2>Sobre este NFT</h2>
          <p className="descricao">{nft.data.descricao}</p>
          <fieldset>
            <legend>Edição</legend>
            <div className="flex gap-3 flex-wrap">
              {nft.data.edicoes.map((item) => (
                <label className="edicao" key={item.id}>
                  <input
                    type="radio"
                    name="edicao"
                    value={item.id}
                    checked={edicaoId === item.id}
                    onChange={() => {
                      definirEdicao(item.id);
                      definirQuantidade(1);
                    }}
                  />
                  {item.nome}
                  {item.disponivel === 0 && ' · Esgotada'}
                </label>
              ))}
            </div>
          </fieldset>
          <p className="text-xs text-[var(--suave)] mt-3">
            {edicao.disponivel} unidade(s) disponível(is)
          </p>
          <div className="acoes-compra">
            <Campo rotulo="Quantidade">
              {(id) => (
                <input
                  id={id}
                  type="number"
                  min="1"
                  max={Math.max(1, edicao.disponivel)}
                  value={quantidade}
                  onChange={(evento) => definirQuantidade(evento.target.valueAsNumber || 1)}
                />
              )}
            </Campo>
            <Button
              disabled={adicionar.isPending || edicao.disponivel < quantidade || quantidade < 1}
              onClick={() => adicionar.mutate()}
            >
              {adicionar.isPending ? 'Adicionando…' : 'COMPRAR'}
            </Button>
            <Favoritar nftId={nftId} />
          </div>
          {adicionar.isError && <Falha erro={adicionar.error} />}
          <dl className="metadados">
            <div>
              <dt>ID do token</dt>
              <dd>#{nftId.padStart(4, '0')}</dd>
            </div>
            <div>
              <dt>Coleção</dt>
              <dd>Edições Kurio</dd>
            </div>
            <div>
              <dt>Criador</dt>
              <dd>{nft.data.criador}</dd>
            </div>
          </dl>
          <p className="seguranca">
            <ShieldCheck size={18} />
            Compra e carteira simuladas para demonstração.
          </p>
        </div>
      </section>
      <section className="detalhes-editoriais">
        <h2>Detalhes do NFT</h2>
        <p>{nft.data.descricao}</p>
        <p>
          Rede: {nft.data.rede}. A compra é uma simulação, sem transferência de ativos ou cobrança
          real.
        </p>
      </section>
      <MaisDaColecao />
    </>
  );
}
