/** Descoberta e detalhe: estado de pesquisa pertence à URL; consultas obsoletas são canceladas. */
import axios from 'axios';
import { NaoEncontrado } from '../componentes/nao-encontrado';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearch, useParams } from '@tanstack/react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { Search, ShoppingCart, Heart, Star, Mail, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  catalogoSchema,
  facetasSchema,
  filtrosSchema,
  carrinhoSchema,
  nftSchema,
  type Filtros,
  type Nft,
} from '../dominio/contratos';
import { exibirEth } from '../dominio/valores';
import { alterar, cache, consultar } from '../infraestrutura/api';
import { useSessao } from '../infraestrutura/sessao';
import { Button } from '../componentes/ui/button';
import { Dialogo, Esqueleto, EsqueletoDoNft, Falha } from '../componentes/comuns';
import { DestaquePrincipal, ConteudoEditorial, IconeOriginal } from '../componentes/vitrine';
import { ControleQuantidade, VoltarAoMercado } from '../componentes/controles';

/** Cartão navegável com imagem local e preço sem arredondamento. */
export function CartaoNft({ nft }: { nft: Nft }) {
  const adicionar = useMutation({
    mutationFn: () =>
      alterar(
        'POST',
        '/carrinho',
        { nftId: nft.id, edicaoId: nft.edicoes[0].id, quantidade: 1 },
        carrinhoSchema,
      ),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: ['carrinho'] });
      await cache.invalidateQueries({ queryKey: ['cotacao'] });
    },
  });
  return (
    <article className="cartao-nft" data-nft={nft.id}>
      <Link to="/nft/$nftId" params={{ nftId: nft.id }} aria-label={`Ver ${nft.nome}`}>
        <div className="moldura-arte">
          <img src={nft.imagem} alt={`Arte ${nft.nome}`} width="250" height="250" loading="lazy" />
        </div>
        <h3>{nft.nome}</h3>
      </Link>
      <p className="preco-cartao">
        {exibirEth(nft.edicoes[0].preco)}
        {nft.precoAnterior && <del>{exibirEth(nft.precoAnterior)}</del>}
      </p>
      {nft.raridade === 'raro' && <span className="selo-raridade">RARO</span>}
      <div className="acoes-cartao">
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Adicionar ${nft.nome} ao carrinho`}
          disabled={adicionar.isPending || nft.edicoes[0].disponivel < 1}
          onClick={() => adicionar.mutate()}
        >
          <ShoppingCart size={20} />
        </Button>
        <Favoritar nftId={nft.id} compacto />
        <Link to="/nft/$nftId" params={{ nftId: nft.id }} aria-label={`Inspecionar ${nft.nome}`}>
          <Search size={21} />
        </Link>
      </div>
      {adicionar.isError && <Falha erro={adicionar.error} />}
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
  const facetas = useQuery({
    queryKey: ['facetas'],
    queryFn: ({ signal }) => consultar('/facetas', facetasSchema, signal),
  });
  const categorias = [
    'Arte digital',
    'Fotografia',
    'Música',
    'Arte 3D',
    'Colecionáveis',
    'Generativa',
    'Jogos',
    'Assinaturas',
    'Utilidade',
  ];
  return (
    <div className="coluna-filtros">
      <div className="filtros">
        <h2>Coleções</h2>
        <div className="lista-categorias">
          {categorias.map((categoria) => (
            <button
              type="button"
              key={categoria}
              aria-pressed={filtros.categoria === categoria}
              onClick={() => mudar({ categoria: filtros.categoria === categoria ? '' : categoria })}
            >
              {categoria}
              <span>
                ({facetas.data?.categorias.find((item) => item.nome === categoria)?.total ?? '—'})
              </span>
            </button>
          ))}
        </div>
        <form
          className="filtro-preco"
          onSubmit={(evento) => {
            evento.preventDefault();
            mudar({ minimo, maximo });
          }}
        >
          <h3>Faixa de preço</h3>
          <div className="controle-faixa">
            <label className="sr-only" htmlFor="preco-minimo">
              Mínimo ETH
            </label>
            <input
              id="preco-minimo"
              type="range"
              min="0"
              max="12.30"
              step="0.01"
              value={minimo}
              onChange={(evento) => definirMinimo(evento.target.value)}
            />
            <label className="sr-only" htmlFor="preco-maximo">
              Máximo ETH
            </label>
            <input
              id="preco-maximo"
              type="range"
              min="0"
              max="12.30"
              step="0.01"
              value={maximo}
              onChange={(evento) => definirMaximo(evento.target.value)}
            />
          </div>
          <p>
            Preço: {minimo} - {maximo} ETH
          </p>
          <Button size="sm">Aplicar</Button>
        </form>
        <h3 className="titulo-redes">Rede</h3>
        <div className="lista-redes" role="group" aria-label="Rede">
          {['Ethereum', 'Polygon', 'Solana'].map((rede) => (
            <button
              type="button"
              key={rede}
              aria-pressed={filtros.rede === rede}
              onClick={() => mudar({ rede: filtros.rede === rede ? '' : rede })}
            >
              {rede}
              <span>({facetas.data?.redes.find((item) => item.nome === rede)?.total ?? '—'})</span>
            </button>
          ))}
        </div>
        {(filtros.busca ||
          filtros.categoria ||
          filtros.rede ||
          filtros.minimo !== '0.02' ||
          filtros.maximo !== '12.30') && (
          <Button
            variant="ghost"
            onClick={() =>
              mudar({
                busca: '',
                categoria: '',
                rede: '',
                minimo: '0.02',
                maximo: '12.30',
                ordem: 'recentes',
                aba: 'todos',
              })
            }
          >
            Limpar filtros
          </Button>
        )}
        {facetas.isError && (
          <button type="button" className="text-xs" onClick={() => void facetas.refetch()}>
            Recarregar contagens
          </button>
        )}
      </div>
      <Link className="destaque-lateral" to="/nft/$nftId" params={{ nftId: '2' }}>
        <p>NFT EM DESTAQUE</p>
        <h3>OFERTA LIMITADA</h3>
        <img src="/imagens/colecao-1.webp" width="310" height="368" alt="Sage Nomad" />
      </Link>
    </div>
  );
}

/** Página inicial baseada na composição do Figma e com resultados inteiramente vindos da API. */
export function Inicio() {
  const filtros = filtrosSchema.parse(useSearch({ strict: false }));
  const [filtrosAbertos, definirFiltrosAbertos] = useState(() => window.innerWidth > 600);
  const [buscaAberta, definirBuscaAberta] = useState(Boolean(filtros.busca));
  const navegar = useNavigate();
  const catalogo = useQuery({
    queryKey: ['catalogo', filtros],
    queryFn: ({ signal }) =>
      consultar(
        `/nfts?${new URLSearchParams(Object.entries(filtros).map(([chave, valor]) => [chave, String(valor)]))}`,
        catalogoSchema,
        signal,
      ),
  });
  /** Filtros permanecem na URL e toda alteração reinicia a paginação. */
  function mudar(dados: Partial<Filtros>) {
    void navegar({
      to: '/',
      search: { ...filtros, ...dados, pagina: dados.pagina ?? 1 },
      resetScroll: false,
    });
  }
  useEffect(() => {
    /** O cabeçalho só revela a busca; a consulta segue o mesmo controle e a mesma URL. */
    function abrirBusca() {
      definirBuscaAberta(true);
      window.requestAnimationFrame(() => document.getElementById('busca-catalogo')?.focus());
    }
    window.addEventListener('kurio:abrir-busca', abrirBusca);
    return () => window.removeEventListener('kurio:abrir-busca', abrirBusca);
  }, []);
  return (
    <>
      <div className={`busca-vitrine ${buscaAberta ? 'aberta' : ''}`}>
        <label className="sr-only" htmlFor="busca-catalogo">
          Buscar NFTs
        </label>
        <IconeOriginal nome="busca-mobile" tamanho={22} />
        <input
          id="busca-catalogo"
          type="search"
          placeholder="Explorar coleções"
          value={filtros.busca}
          onChange={(evento) => mudar({ busca: evento.target.value })}
        />
        <button
          type="button"
          className="alternar-filtros"
          aria-label="Filtrar coleções"
          aria-expanded={filtrosAbertos}
          onClick={() => definirFiltrosAbertos(!filtrosAbertos)}
        >
          <IconeOriginal nome="filtros" tamanho={21} />
        </button>
      </div>
      <DestaquePrincipal />
      <section id="catalogo" aria-labelledby="titulo-catalogo">
        <h2 id="titulo-catalogo" className="sr-only">
          Explorar coleções
        </h2>
        <div className="catalogo-layout">
          <aside aria-label="Filtros do catálogo">
            <div className={filtrosAbertos ? 'conteudo-filtros aberto' : 'conteudo-filtros'}>
              <FiltrosCatalogo
                key={`${filtros.minimo}:${filtros.maximo}`}
                filtros={filtros}
                mudar={mudar}
              />
            </div>
          </aside>
          <div>
            <EstadoFavoritos exibir={!catalogo.isError} />
            <div className="barra-catalogo">
              <div className="abas-catalogo" role="tablist" aria-label="Catálogo">
                {[
                  { valor: 'todos', nome: 'Todos os NFTs' },
                  { valor: 'novos', nome: 'Novos lançamentos' },
                  { valor: 'alta', nome: 'Em alta' },
                ].map(({ valor, nome }) => (
                  <button
                    type="button"
                    key={valor}
                    role="tab"
                    aria-selected={filtros.aba === valor}
                    onClick={() => mudar({ aba: z.enum(['todos', 'novos', 'alta']).parse(valor) })}
                  >
                    {nome}
                  </button>
                ))}
              </div>
              <div className="ordenacao">
                <label htmlFor="ordem-catalogo">Ordenar por:</label>
                <select
                  id="ordem-catalogo"
                  aria-label="Ordenar por"
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
              </div>
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
                  <span className="sr-only">
                    Página {filtros.pagina} de {catalogo.data.paginas}
                  </span>
                  {Array.from({ length: catalogo.data.paginas }, (_, indice) => (
                    <button
                      type="button"
                      key={indice}
                      aria-label={`Ir para página ${indice + 1}`}
                      aria-current={filtros.pagina === indice + 1 ? 'page' : undefined}
                      onClick={() => mudar({ pagina: indice + 1 })}
                    >
                      {indice + 1}
                    </button>
                  ))}
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
                    mudar({
                      aba: 'todos',
                      busca: '',
                      categoria: '',
                      rede: '',
                      minimo: '0.02',
                      maximo: '12.30',
                    })
                  }
                >
                  Ver todas as obras
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>
      <ConteudoEditorial />
    </>
  );
}

/** Recomendações são links para obras reais do catálogo, obtidas pela mesma API da busca. */
export function MaisDaColecao({ titulo = 'Mais desta coleção' }: { titulo?: string }) {
  const [pagina, definirPagina] = useState(1);
  const consulta = useQuery({
    queryKey: ['catalogo', 'recomendacoes'],
    queryFn: ({ signal }) => consultar('/nfts', catalogoSchema, signal),
  });
  if (consulta.isError) return null;
  return (
    <section className="mais-colecao" aria-label="Mais desta coleção">
      <h2>{titulo}</h2>
      <div className="grade-recomendacoes">
        {consulta.isPending
          ? [1, 2, 3, 4, 5].map((indice) => <Esqueleto key={indice} />)
          : consulta.data.itens
              .filter((_nft, indice) =>
                (pagina === 0
                  ? [0, 1, 2, 3, 4]
                  : pagina === 1
                    ? [3, 4, 5, 6, 8]
                    : [4, 5, 6, 7, 8]
                ).includes(indice),
              )
              .map((nft) => <CartaoNft key={nft.id} nft={nft} />)}
      </div>
      <div className="indicadores-colecao" aria-label="Páginas de recomendações">
        {[0, 1, 2].map((indice) => (
          <button
            key={indice}
            type="button"
            aria-label={`Ver recomendações ${indice + 1}`}
            aria-pressed={pagina === indice}
            onClick={() => definirPagina(indice)}
          />
        ))}
      </div>
    </section>
  );
}

/** Todos os controles compartilham a consulta privada, sem repetir mensagens em cada cartão. */
function useFavoritos() {
  const { perfil } = useSessao();
  return useQuery({
    queryKey: ['favoritos', perfil?.id],
    queryFn: ({ signal }) => consultar('/favoritos', z.array(z.string()), signal),
    enabled: Boolean(perfil),
  });
}
/** Uma falha de leitura aparece uma vez na página e permite refazer a consulta compartilhada. */
function EstadoFavoritos({ exibir = true }: { exibir?: boolean }) {
  const favoritos = useFavoritos();
  return exibir && favoritos.isError ? (
    <Falha erro={favoritos.error} tentar={() => void favoritos.refetch()} />
  ) : null;
}

/** Favoritos usam optimistic update com snapshot e rollback quando a API recusa a alteração. */
function Favoritar({ nftId, compacto = false }: { nftId: string; compacto?: boolean }) {
  const { perfil } = useSessao();
  const navegar = useNavigate();
  const chave = ['favoritos', perfil?.id];
  const favoritos = useFavoritos();
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
        className={compacto ? 'favorito-compacto' : undefined}
        aria-label={compacto ? `Salvar NFT ${nftId} nos favoritos` : undefined}
        data-favorito={nftId}
        aria-pressed={favorito}
        disabled={salvar.isPending || (Boolean(perfil) && favoritos.isPending) || favoritos.isError}
        onClick={() => {
          if (!perfil) void navegar({ to: '/login', search: { retorno: `/nft/${nftId}` } });
          else salvar.mutate(favorito);
        }}
      >
        <Heart size={17} fill={favorito ? 'currentColor' : 'none'} />
        {!compacto && (favorito ? 'Favoritado' : 'Favoritar')}
      </Button>
      {salvar.isError && <Falha erro={salvar.error} />}
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
  if (nft.isError)
    return axios.isAxiosError(nft.error) && nft.error.response?.status === 404 ? (
      <NaoEncontrado recurso="NFT" />
    ) : (
      <Falha erro={nft.error} tentar={() => void nft.refetch()} />
    );
  const edicao = nft.data.edicoes.find((edicao) => edicao.id === edicaoId) ?? nft.data.edicoes[0];
  const numeroToken = (nft.data.nome.split('#')[1] ?? nftId).padStart(4, '0');
  return (
    <>
      <div className="cabecalho-detalhe-movel">
        <VoltarAoMercado />
        <Favoritar nftId={nftId} compacto />
      </div>
      <nav aria-label="Caminho" className="caminho">
        <Link to="/">Início</Link> / Mercado
      </nav>
      <EstadoFavoritos />
      <section className="detalhe-layout">
        <div className="galeria">
          <div className="miniaturas">
            {[0, 1, 2, 3].map((indice) => (
              <button
                type="button"
                key={indice}
                aria-label={`Visualização ${indice + 1}`}
                aria-pressed={imagem === indice}
                onClick={() => definirImagem(indice)}
              >
                <img
                  src={nft.data.imagem}
                  alt=""
                  width="100"
                  height="100"
                  style={{ transform: `scale(${1 + indice * 0.12})` }}
                />
              </button>
            ))}
          </div>
          <div className="arte-detalhe">
            <img
              src={nft.data.imagem}
              alt={nft.data.nome}
              width="404"
              height="404"
              style={{ transform: `scale(${1 + imagem * 0.12})` }}
            />
            <Dialogo
              titulo={nft.data.nome}
              descricao="Visualização ampliada da arte"
              gatilho={
                <button type="button" className="ampliar-arte" aria-label="Ampliar imagem">
                  <Search size={24} />
                </button>
              }
            >
              <img className="imagem-ampliada" src={nft.data.imagem} alt={nft.data.nome} />
            </Dialogo>
          </div>
        </div>
        <div className="informacoes-nft">
          <div className="titulo-nft">
            <h1>{nft.data.nome}</h1>
            <span className="nota-movel">
              <Star size={14} fill="currentColor" />
              {nft.data.avaliacoes.media}({nft.data.avaliacoes.total})
            </span>
          </div>
          <div className="preco-avaliacoes">
            <p className="preco-grande">{exibirEth(edicao.preco)}</p>
            <span>
              <span className="estrelas" aria-hidden="true">
                ★★★★★
              </span>{' '}
              {nft.data.avaliacoes.total} avaliações de colecionadores
            </span>
          </div>
          <hr />
          <h2>Sobre este NFT:</h2>
          <p className="descricao">
            <span className="texto-desktop">{nft.data.descricao}</span>
            <span className="texto-mobile">
              Um colecionável digital {edicao.nome} finalizado à mão da coleção Kurio Editions,
              verificado na {nft.data.rede}.
            </span>
          </p>
          <fieldset>
            <legend>Edição:</legend>
            <div className="edicoes-nft">
              {[...nft.data.edicoes]
                .sort(
                  (a, b) =>
                    ['unica', 'dez', 'limitada', 'aberta'].indexOf(a.id) -
                    ['unica', 'dez', 'limitada', 'aberta'].indexOf(b.id),
                )
                .map((item) => (
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
                    {item.disponivel === 0 && <span className="sr-only"> · Esgotada</span>}
                  </label>
                ))}
            </div>
          </fieldset>
          <p className={edicao.disponivel ? 'sr-only' : 'erro estoque-esgotado'}>
            {edicao.disponivel
              ? `${edicao.disponivel} unidades disponíveis`
              : 'Esta edição está esgotada.'}
          </p>
          <div className="acoes-compra">
            <div className="linha-quantidade">
              <span className="rotulo-quantidade">Qtd.</span>
              <ControleQuantidade
                rotulo="Quantidade"
                valor={quantidade}
                maximo={edicao.disponivel}
                alterar={definirQuantidade}
              />
              <p className="preco-movel">{exibirEth(edicao.preco)}</p>
            </div>
            <div className="botoes-compra">
              <Button
                className="comprar-nft"
                disabled={adicionar.isPending || edicao.disponivel < quantidade || quantidade < 1}
                onClick={() => adicionar.mutate()}
              >
                <span className="texto-desktop">
                  {adicionar.isPending ? 'Adicionando…' : 'COMPRAR'}
                </span>
                <span className="texto-mobile">
                  {adicionar.isPending ? 'Adicionando…' : 'Comprar NFT'}
                </span>
              </Button>
              <div className="favoritar-detalhe">
                <Favoritar nftId={nftId} />
              </div>
              <Link className="carrinho-detalhe-movel" to="/carrinho" aria-label="Abrir carrinho">
                <ShoppingCart size={22} fill="currentColor" />
              </Link>
            </div>
          </div>
          {adicionar.isError && <Falha erro={adicionar.error} />}
          <dl className="metadados">
            <div>
              <dt>ID do token:</dt>
              <dd>#{numeroToken}</dd>
            </div>
            <div>
              <dt>Coleção:</dt>
              <dd>{nft.data.colecao}</dd>
            </div>
            <div>
              <dt>Atributos:</dt>
              <dd>{nft.data.atributos.join(', ')}</dd>
            </div>
          </dl>
          <div className="compartilhar-nft">
            <strong>Compartilhar este NFT:</strong>
            <Dialogo
              titulo="Compartilhar esta obra"
              descricao={nft.data.nome}
              gatilho={
                <button type="button" aria-label="Compartilhar no LinkedIn">
                  <img src="/icones/rede-linkedin.svg" alt="" width="18" height="18" />
                </button>
              }
            >
              <p>Copie o endereço desta página para compartilhar a obra.</p>
              <code className="endereco">{window.location.href}</code>
            </Dialogo>
            <a
              href={`mailto:?subject=${encodeURIComponent(nft.data.nome)}&body=${encodeURIComponent(window.location.href)}`}
              aria-label="Compartilhar por e-mail"
            >
              <Mail size={17} />
            </a>
          </div>
        </div>
      </section>
      <section className="detalhes-editoriais">
        <div className="abas-detalhe">
          <h2>Detalhes do NFT</h2>
          <Dialogo
            titulo="Avaliações de colecionadores"
            descricao="Resumo fictício retornado pela API da demonstração"
            gatilho={
              <button type="button">
                Avaliações de colecionadores ({nft.data.avaliacoes.total})
              </button>
            }
          >
            <p>
              {nft.data.avaliacoes.total} avaliações · Nota média {nft.data.avaliacoes.media} de 5.
            </p>
            <p>
              As avaliações deste catálogo são dados fictícios. Publicar avaliações não faz parte
              dos fluxos desta demonstração.
            </p>
          </Dialogo>
        </div>
        <p>
          {nft.data.nome} é uma obra digital {edicao.nome} finalizada à mão da coleção Kurio
          Editions. Cada atributo fica armazenado nos metadados do token e verificado na{' '}
          {nft.data.rede}. A obra explora identidade, movimento e luz em um mundo digital sem
          fronteiras.
        </p>
        <p>
          A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores
          e um registro permanente de procedência registrada na rede. {nft.data.criador} recebe{' '}
          {nft.data.direitosAutorais}% de direitos autorais nas vendas secundárias, apoiando novos
          trabalhos e lançamentos da comunidade.
        </p>
        <dl>
          <dt>Rede:</dt>
          <dd>
            Cunhado na {nft.data.rede} com procedência imutável e metadados armazenados no IPFS.
          </dd>
          <dt>Contrato:</dt>
          <dd>{nft.data.contrato} · Contrato inteligente ERC-721 verificado.</dd>
          <dt>Direitos autorais:</dt>
          <dd>
            Direitos autorais do criador: {nft.data.direitosAutorais}% nas vendas secundárias, pagos
            automaticamente pelos mercados compatíveis.
          </dd>
        </dl>
      </section>
      <MaisDaColecao />
    </>
  );
}
