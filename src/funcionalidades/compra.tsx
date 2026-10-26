/** Carrinho, revisão e acompanhamento da compra. A API é a autoridade para totais e estados. */
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import axios from 'axios';
import { Clock3, Trash2, XCircle } from 'lucide-react';
import {
  carteiraSchema,
  carrinhoSchema,
  colecionadorSchema,
  cotacaoSchema,
  envioPedidoSchema,
  pedidoSchema,
  type Cotacao,
  type Item,
} from '../dominio/contratos';
import { deWei, exibirEth, paraWei } from '../dominio/valores';
import { completarEns } from '../dominio/nomes';
import { alterar, cache, consultar } from '../infraestrutura/api';
import { useSessao } from '../infraestrutura/sessao';
import { Button } from '../componentes/ui/button';
import { Campo, Dialogo, Esqueleto, Falha } from '../componentes/comuns';
import { NaoEncontrado } from '../componentes/nao-encontrado';
import { MaisDaColecao } from './catalogo';
import { ControleQuantidade, VoltarAoMercado, EntradaEns } from '../componentes/controles';

/** Chaves incluem o dono; carrinhos de visitantes nunca reutilizam o cache de uma conta. */
function useDadosCarrinho() {
  const { perfil, token } = useSessao();
  const dono = perfil?.id ?? token;
  const carrinho = useQuery({
    queryKey: ['carrinho', dono],
    queryFn: ({ signal }) => consultar('/carrinho', carrinhoSchema, signal),
  });
  const cotacao = useQuery({
    queryKey: ['cotacao', dono],
    queryFn: ({ signal }) => consultar('/cotacao', cotacaoSchema, signal),
  });
  return { carrinho, cotacao };
}
/** Após uma mutation, resumo e itens são lidos novamente da mesma fonte. */
async function atualizarCarrinho() {
  await Promise.all([
    cache.invalidateQueries({ queryKey: ['carrinho'] }),
    cache.invalidateQueries({ queryKey: ['cotacao'] }),
  ]);
}

/** Resumo reutiliza o snapshot do pedido no recibo e a cotação viva durante a compra. */
export function ResumoValores({ cotacao }: { cotacao: Cotacao }) {
  return (
    <dl className="resumo-valores">
      <div>
        <dt>Subtotal</dt>
        <dd>{exibirEth(cotacao.subtotal)}</dd>
      </div>
      <div>
        <dt>Desconto do lançamento {cotacao.cupom && `(${cotacao.cupom})`}</dt>
        <dd>− {exibirEth(cotacao.desconto)}</dd>
      </div>
      <div>
        <dt>Taxa de rede</dt>
        <dd>
          {exibirEth(cotacao.taxa)}
          <small className="taxa-estimada">Taxa estimada</small>
        </dd>
      </div>
      <div className="total">
        <dt>Total</dt>
        <dd>{exibirEth(cotacao.total)}</dd>
      </div>
    </dl>
  );
}

/** Cupom só é exibido como aplicado depois da validação REST. */
function Cupom({ aplicado }: { aplicado: string }) {
  const [codigo, definirCodigo] = useState(aplicado);
  const aplicar = useMutation({
    mutationFn: (cupom: string) => alterar('POST', '/cotacao', { cupom }, cotacaoSchema),
    onSuccess: atualizarCarrinho,
  });
  return (
    <form
      className="formulario-cupom"
      onSubmit={(evento) => {
        evento.preventDefault();
        aplicar.mutate(codigo);
      }}
    >
      <Campo rotulo="Código promocional">
        {(id) => (
          <div className="entrada-cupom">
            <input
              id={id}
              value={codigo}
              onChange={(evento) => definirCodigo(evento.target.value)}
              placeholder="Digite o código promocional..."
            />
            <Button className="aplicar-cupom" disabled={aplicar.isPending}>
              Aplicar
            </Button>
          </div>
        )}
      </Campo>
      {aplicado && (
        <div className="cupom-aplicado">
          <span>{aplicado} aplicado</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="remover-cupom"
            disabled={aplicar.isPending}
            onClick={() => {
              definirCodigo('');
              aplicar.mutate('');
            }}
          >
            Remover cupom
          </Button>
        </div>
      )}
      {aplicar.isError && <Falha erro={aplicar.error} />}
    </form>
  );
}

/** Itens e disponibilidade permanecem visíveis quando um preço ou estoque muda. */
export function Carrinho() {
  const { carrinho, cotacao } = useDadosCarrinho();
  const mudar = useMutation({
    mutationFn: ({
      metodo,
      item,
    }: {
      metodo: 'PATCH' | 'DELETE';
      item: Omit<Item, 'quantidade'> & { quantidade?: number };
    }) => alterar(metodo, '/carrinho', item, carrinhoSchema),
    onSuccess: atualizarCarrinho,
  });
  if (carrinho.isPending || cotacao.isPending) return <Esqueleto detalhe />;
  if (carrinho.isError || cotacao.isError)
    return (
      <Falha
        erro={carrinho.error ?? cotacao.error}
        tentar={() => {
          void carrinho.refetch();
          void cotacao.refetch();
        }}
      />
    );
  return (
    <>
      <nav className="caminho" aria-label="Caminho">
        <Link to="/">Início</Link> / Mercado / Carrinho
      </nav>
      <div className="cabecalho-pagina-compra">
        <VoltarAoMercado />
        <h1>Carrinho de NFTs</h1>
      </div>
      {!carrinho.data.itens.length ? (
        <div className="vazio">
          <h2>Uma coleção começa com uma descoberta.</h2>
          <p>Seu carrinho ainda está vazio.</p>
          <Button asChild>
            <Link to="/">Explorar NFTs</Link>
          </Button>
        </div>
      ) : (
        <div className="compra-layout">
          <section aria-label="Itens do carrinho">
            <div className="cabecalho-itens">
              <span>NFTs</span>
              <span>Preço</span>
              <span>Edições</span>
              <span>Total</span>
            </div>
            {carrinho.data.itens.map((item) => (
              <article className="item-carrinho" key={`${item.nftId}:${item.edicaoId}`}>
                <img src={item.imagem} alt={item.nome} width="70" height="70" />
                <div className="nome-item">
                  <Link to="/nft/$nftId" params={{ nftId: item.nftId }}>
                    <h2>{item.nome}</h2>
                  </Link>
                  <p className="token-item">
                    ID do token: #{(item.nome.split('#')[1] ?? item.nftId).padStart(4, '0')}
                  </p>
                  <p className="edicao-item">Edição: {item.edicao}</p>
                  {item.quantidade > item.disponivel && (
                    <p className="erro text-xs">
                      Quantidade indisponível. Ajuste ou remova este item.
                    </p>
                  )}
                </div>
                <p className="preco-unitario">{exibirEth(item.preco)}</p>
                <ControleQuantidade
                  rotulo={`Quantidade de ${item.nome}`}
                  valor={item.quantidade}
                  maximo={item.disponivel}
                  desabilitado={mudar.isPending}
                  alterar={(quantidade) =>
                    mudar.mutate({
                      metodo: 'PATCH',
                      item: { nftId: item.nftId, edicaoId: item.edicaoId, quantidade },
                    })
                  }
                />
                <p
                  className={`total-item ${exibirEth(deWei(paraWei(item.preco) * BigInt(item.quantidade))).length > 16 ? 'valor-longo' : ''}`}
                >
                  {exibirEth(deWei(paraWei(item.preco) * BigInt(item.quantidade)))}
                </p>
                <Dialogo
                  titulo="Remover esta obra?"
                  descricao="Você pode adicioná-la novamente enquanto houver edições disponíveis."
                  gatilho={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="remover-item"
                      aria-label={`Remover ${item.nome}`}
                    >
                      <Trash2 size={20} aria-hidden="true" />
                    </Button>
                  }
                >
                  <Button
                    disabled={mudar.isPending}
                    onClick={() =>
                      mudar.mutate({
                        metodo: 'DELETE',
                        item: { nftId: item.nftId, edicaoId: item.edicaoId },
                      })
                    }
                  >
                    Remover do carrinho
                  </Button>
                </Dialogo>
              </article>
            ))}
            {mudar.isError && <Falha erro={mudar.error} />}
          </section>
          <aside className="painel-resumo">
            <h2>Resumo da carteira</h2>
            <Cupom aplicado={cotacao.data.cupom} />
            <ResumoValores cotacao={cotacao.data} />
            <Button asChild className="w-full">
              <Link to="/pagamento">Conectar e finalizar</Link>
            </Button>
            <Link className="continuar-explorando" to="/">
              Continuar explorando
            </Link>
          </aside>
        </div>
      )}
      {carrinho.data.itens.length > 0 && <MaisDaColecao titulo="Colecionadores também viram" />}
    </>
  );
}

const tentativaSchema = z.object({ chave: z.string(), dados: envioPedidoSchema });
type Tentativa = z.infer<typeof tentativaSchema>;
/** Recupera a mesma tentativa depois de um timeout; dados pertencem somente à conta da chave. */
function lerTentativa(chave: string): Tentativa | null {
  try {
    const resultado = tentativaSchema.safeParse(
      JSON.parse(sessionStorage.getItem(chave) ?? 'null'),
    );
    return resultado.success ? resultado.data : null;
  } catch {
    return null;
  }
}
/** Rascunhos de checkout são recuperáveis somente na mesma aba e para a mesma conta. */
function lerRascunho(chave: string): Record<string, string> {
  try {
    const resultado = z
      .record(z.string(), z.string())
      .safeParse(JSON.parse(sessionStorage.getItem(chave) ?? 'null'));
    return resultado.success ? resultado.data : {};
  } catch {
    return {};
  }
}
/** Formulário com revisão explícita e conexão simulada através da API. */
export function Pagamento() {
  const { perfil, carregando } = useSessao();
  // A identidade deve estar resolvida antes de recuperar qualquer rascunho privado.
  if (carregando || !perfil) return <Esqueleto detalhe />;
  return <FormularioPagamento key={perfil.id} />;
}
/** Isola o ciclo do formulário por usuário, inclusive após expiração e nova autenticação. */
function FormularioPagamento() {
  const { perfil } = useSessao();
  const navegar = useNavigate();
  const chavePersistencia = `kurio.tentativa:${perfil?.id}`;
  const chaveRascunho = `kurio.rascunho:${perfil?.id}`;
  const [rascunho] = useState(() => lerRascunho(chaveRascunho));
  const [etapaMovel, definirEtapaMovel] = useState(
    rascunho.etapa === 'carteira' ? 'carteira' : 'dados',
  );
  const [revisaoAberta, definirRevisaoAberta] = useState(false);
  const [tentativa, definirTentativa] = useState(() => lerTentativa(chavePersistencia));
  const { carrinho, cotacao } = useDadosCarrinho();
  const carteiras = useQuery({
    queryKey: ['carteiras', perfil?.id],
    queryFn: ({ signal }) => consultar('/carteiras', z.array(carteiraSchema), signal),
  });
  const pedidos = useQuery({
    queryKey: ['pedidos', perfil?.id],
    queryFn: ({ signal }) => consultar('/pedidos', z.array(pedidoSchema), signal),
  });
  const [carteiraId, definirCarteira] = useState(rascunho.carteiraId ?? '');
  const [revisao, definirRevisao] = useState<Cotacao | null>(null);
  const [dadosRevisados, definirDadosRevisados] = useState<z.infer<
    typeof colecionadorSchema
  > | null>(null);
  const [erros, definirErros] = useState<Record<string, string>>({});
  const carteira =
    carteiras.data?.find((item) => item.id === carteiraId) ??
    carteiras.data?.find((item) => item.principal) ??
    carteiras.data?.[0];
  const conexao = useMutation({
    mutationFn: (acao: 'conectar' | 'recusar' | 'desconectar') =>
      alterar(
        'POST',
        '/conexao',
        { carteiraId: carteira?.id ?? '', acao },
        z.object({
          estado: z.enum(['conectada', 'recusada', 'desconectada']),
          carteiraId: z.string(),
        }),
      ),
  });
  const conectado =
    conexao.data?.estado === 'conectada' && conexao.data.carteiraId === carteira?.id;
  const enviar = useMutation({
    mutationFn: (atual: Tentativa) =>
      alterar('POST', '/pedidos', atual.dados, pedidoSchema, atual.chave),
    onError: (erro: unknown) => {
      // Uma resposta definitiva encerra este envio; timeouts preservam a tentativa para replay.
      // Um conflito de chave pode indicar pedido anterior existente, recuperável pelo histórico.
      if (
        axios.isAxiosError(erro) &&
        erro.response &&
        erro.response.status >= 400 &&
        erro.response.status < 500 &&
        erro.response.status !== 401 &&
        z.object({ mensagem: z.string() }).safeParse(erro.response.data).success
      ) {
        sessionStorage.removeItem(chavePersistencia);
        definirTentativa(null);
        definirRevisao(null);
      }
    },
    onSuccess: async (pedido) => {
      sessionStorage.removeItem(chavePersistencia);
      sessionStorage.removeItem(chaveRascunho);
      definirTentativa(null);
      await atualizarCarrinho();
      await navegar({ to: '/pedido/$pedidoId', params: { pedidoId: pedido.id } });
    },
  });
  const revisar = useMutation({
    mutationFn: () => consultar('/cotacao', cotacaoSchema),
    onSuccess: (atual) => {
      definirRevisao(atual);
      definirRevisaoAberta(true);
      cache.setQueryData(['cotacao', perfil?.id], atual);
    },
  });
  /** Valida os campos do layout antes de buscar uma cotação atual para a revisão. */
  function prepararRevisao(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const valores = Object.fromEntries(new FormData(evento.currentTarget));
    if (typeof valores.ens === 'string') valores.ens = completarEns(valores.ens);
    const resultado = colecionadorSchema.safeParse(valores);
    if (!resultado.success) {
      definirErros(
        Object.fromEntries(
          resultado.error.issues.map((item) => [String(item.path[0]), item.message]),
        ),
      );
      return;
    }
    definirErros({});
    definirDadosRevisados(resultado.data);
    if (window.matchMedia('(max-width: 600px)').matches && etapaMovel === 'dados') {
      definirEtapaMovel('carteira');
      sessionStorage.setItem(
        chaveRascunho,
        JSON.stringify({ ...valores, etapa: 'carteira', carteiraId: carteira?.id ?? '' }),
      );
      window.scrollTo(0, 0);
      return;
    }
    if (!conectado) {
      definirErros({ carteira: 'Conecte uma carteira para continuar.' });
      return;
    }
    revisar.mutate();
  }
  /** Persiste chave e conteúdo antes do primeiro envio; reenvios nunca geram uma segunda chave. */
  function confirmar() {
    if (enviar.isPending) return;
    if (tentativa) {
      enviar.mutate(tentativa);
      return;
    }
    if (!revisao || !dadosRevisados || !carteira || !conectado) return;
    const atual: Tentativa = {
      chave: crypto.randomUUID(),
      dados: {
        ...dadosRevisados,
        cotacaoId: revisao.id,
        carteiraId: carteira.id,
        rede: carteira.rede,
        conectado: true,
      },
    };
    sessionStorage.setItem(chavePersistencia, JSON.stringify(atual));
    definirTentativa(atual);
    enviar.mutate(atual);
  }
  /** Campos repetem o contrato do layout; dados confirmados são copiados para o snapshot do pedido. */
  function campoTexto(nome: string, rotulo: string, valor = '', tipo = 'text') {
    const valorInicial = rascunho[nome] ?? valor;
    return (
      <Campo key={nome} classe={`campo-${nome}`} rotulo={rotulo} obrigatorio erro={erros[nome]}>
        {(id, erroId) =>
          nome === 'ens' ? (
            <EntradaEns
              id={id}
              valorInicial={valorInicial}
              erroId={erroId}
              invalido={Boolean(erros[nome])}
              aoAlterar={() => definirRevisao(null)}
            />
          ) : (
            <input
              id={id}
              name={nome}
              type={tipo}
              defaultValue={valorInicial}
              required
              aria-invalid={Boolean(erros[nome])}
              aria-describedby={erroId}
              onChange={() => definirRevisao(null)}
            />
          )
        }
      </Campo>
    );
  }
  /** A escolha de outra carteira invalida conexão e revisão ligadas ao endereço anterior. */
  function escolherCarteira(id: string) {
    definirCarteira(id);
    sessionStorage.setItem(
      chaveRascunho,
      JSON.stringify({ ...lerRascunho(chaveRascunho), carteiraId: id }),
    );
    definirRevisao(null);
    conexao.reset();
  }
  /** Voltar aos dados não apaga os campos já preenchidos nem a tentativa persistida. */
  function editarDados() {
    definirEtapaMovel('dados');
    const dados = lerRascunho(chaveRascunho);
    sessionStorage.setItem(chaveRascunho, JSON.stringify({ ...dados, etapa: 'dados' }));
  }
  if (carrinho.isPending || cotacao.isPending || carteiras.isPending) return <Esqueleto detalhe />;
  if (carrinho.isError || cotacao.isError || carteiras.isError)
    return (
      <Falha
        erro={carrinho.error ?? cotacao.error ?? carteiras.error}
        tentar={() => {
          void carrinho.refetch();
          void cotacao.refetch();
          void carteiras.refetch();
        }}
      />
    );
  const pendente = pedidos.data?.find((pedido) => pedido.estado === 'pendente');
  const desatualizada = Boolean(revisao && cotacao.data.id !== revisao.id);
  if (!carrinho.data.itens.length && !tentativa)
    return (
      <div className="vazio">
        <h1>Seu carrinho está vazio</h1>
        {enviar.isError && <Falha erro={enviar.error} />}
        {enviar.isError && (
          <Link to="/pedidos" className="link-texto">
            Consultar meus pedidos
          </Link>
        )}
        <Button asChild>
          <Link to="/">Explorar NFTs</Link>
        </Button>
      </div>
    );
  return (
    <>
      <nav aria-label="Caminho" className="caminho">
        <Link to="/">Início</Link> / Mercado / Pagamento
      </nav>
      <div className="cabecalho-pagina-compra">
        <button
          type="button"
          className="voltar-movel"
          aria-label={
            etapaMovel === 'carteira' ? 'Editar dados do colecionador' : 'Voltar ao carrinho'
          }
          onClick={() =>
            etapaMovel === 'carteira' ? editarDados() : void navegar({ to: '/carrinho' })
          }
        >
          ‹
        </button>
        <h1>{etapaMovel === 'dados' ? 'Perfil do colecionador' : 'Pagamento com carteira'}</h1>
      </div>
      {pendente && (
        <p className="mensagem">
          <Link to="/pedido/$pedidoId" params={{ pedidoId: pendente.id }}>
            Você tem um pedido pendente. Acompanhar {pendente.id}
          </Link>
        </p>
      )}
      {tentativa && (
        <div role="status" className="mensagem">
          <p>Uma tentativa foi enviada. Recupere o mesmo pedido sem criar outra compra.</p>
          <Button disabled={enviar.isPending} onClick={confirmar}>
            {enviar.isPending ? 'Recuperando…' : 'Recuperar pedido'}
          </Button>
        </div>
      )}
      <div className={`compra-layout pagamento-layout etapa-${etapaMovel}`}>
        <form
          id="formulario-pagamento"
          className="formulario-pagamento"
          noValidate
          onSubmit={prepararRevisao}
          onChange={(evento) =>
            sessionStorage.setItem(
              chaveRascunho,
              JSON.stringify({
                ...Object.fromEntries(new FormData(evento.currentTarget)),
                etapa: etapaMovel,
              }),
            )
          }
        >
          <h2>Perfil do colecionador</h2>
          {campoTexto('nome', 'Nome de exibição', perfil?.nome)}
          {campoTexto('apelido', 'Nome do usuário', perfil?.apelido)}
          <Campo classe="campo-rede" rotulo="Rede" obrigatorio>
            {(id) => (
              <select id={id} value={carteira?.rede ?? ''} onChange={() => definirRevisao(null)}>
                <option>{carteira?.rede ?? 'Selecione uma rede'}</option>
              </select>
            )}
          </Campo>
          {campoTexto('nomePerfil', 'Nome do perfil', perfil?.apelido)}
          <Campo classe="campo-endereco" rotulo="Endereço da carteira" obrigatorio>
            {(id) => (
              <input
                id={id}
                value={carteira?.endereco ?? ''}
                readOnly
                placeholder="Endereço 0x da carteira"
              />
            )}
          </Campo>
          <Campo
            classe="campo-endereco-secundario"
            rotulo="Endereço secundário (opcional)"
            erro={erros.enderecoSecundario}
          >
            {(id, erroId) => (
              <input
                id={id}
                name="enderecoSecundario"
                defaultValue={rascunho.enderecoSecundario ?? ''}
                placeholder="ENS ou carteira secundária (opcional)"
                aria-describedby={erroId}
                onChange={() => definirRevisao(null)}
              />
            )}
          </Campo>
          <Campo classe="campo-tipo" rotulo="Tipo de carteira" obrigatorio>
            {(id) => (
              <input
                id={id}
                value={carteira?.tipo ?? ''}
                readOnly
                placeholder="Selecione uma carteira"
              />
            )}
          </Campo>
          {campoTexto('indicacao', 'Código de indicação')}
          {campoTexto('email', 'E-mail', perfil?.email, 'email')}
          {campoTexto('ens', 'Nome ENS')}
          <details className="carteira-alternativa">
            <summary>Usar outra carteira?</summary>
            <Campo rotulo="Carteira cadastrada">
              {(id) => (
                <select
                  id={id}
                  name="carteiraId"
                  value={carteira?.id ?? ''}
                  onChange={(evento) => escolherCarteira(evento.target.value)}
                >
                  {carteiras.data.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nome} · {item.principal ? 'Principal' : 'Secundária'}
                    </option>
                  ))}
                </select>
              )}
            </Campo>
            <div className="acoes-conexao">
              <Button
                type="button"
                disabled={conexao.isPending || !carteira}
                onClick={() => {
                  definirRevisao(null);
                  conexao.mutate(conectado ? 'desconectar' : 'conectar');
                }}
              >
                {conectado ? 'Desconectar carteira' : 'Conectar carteira'}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={conexao.isPending || !carteira}
                onClick={() => {
                  definirRevisao(null);
                  conexao.mutate('recusar');
                }}
              >
                Simular recusa
              </Button>
            </div>
          </details>
          <Campo classe="campo-observacao" rotulo="Observação do colecionador (opcional)">
            {(id) => (
              <textarea
                id={id}
                name="observacao"
                defaultValue={rascunho.observacao ?? ''}
                maxLength={500}
                rows={6}
                onChange={() => definirRevisao(null)}
              />
            )}
          </Campo>
          <Button className="continuar-pagamento-movel" type="submit">
            Continuar
          </Button>
          {revisar.isError && <Falha erro={revisar.error} />}
        </form>
        <aside className="painel-resumo resumo-pagamento">
          <div className="nfts-pagamento">
            <h2>Seus NFTs</h2>
            <div className="cabecalho-resumo">
              <span>NFTs</span>
              <span>Subtotal</span>
            </div>
            {cotacao.data.itens.map((item) => (
              <div className="item-resumo" key={`${item.nftId}:${item.edicaoId}`}>
                <img src={item.imagem} width="70" height="70" alt="" />
                <div>
                  <h3>{item.nome}</h3>
                  <p>ID do token: #{(item.nome.split('#')[1] ?? item.nftId).padStart(4, '0')}</p>
                </div>
                <span>(x {item.quantidade})</span>
                <strong>{exibirEth(deWei(paraWei(item.preco) * BigInt(item.quantidade)))}</strong>
              </div>
            ))}
            <details className="cupom-pagamento">
              <summary>Tem um código promocional? Aplique aqui</summary>
              <Cupom aplicado={cotacao.data.cupom} />
            </details>
            <ResumoValores cotacao={revisao ?? cotacao.data} />
          </div>
          <div className="carteiras-salvas-pagamento">
            <h2>
              {conectado ? 'Carteira conectada' : 'Selecione sua carteira'}
              <Link to="/carteiras">Trocar carteira</Link>
            </h2>
            {carteiras.data.map((item) => (
              <div
                className={`cartao-carteira-pagamento ${carteira?.id === item.id ? 'selecionada' : ''}`}
                key={item.id}
              >
                <label>
                  <input
                    type="radio"
                    name="carteira-pagamento"
                    checked={carteira?.id === item.id}
                    onChange={() => escolherCarteira(item.id)}
                  />
                  <span>
                    <strong>{item.nome}</strong>
                    <small>
                      {item.endereco.slice(0, 6)}…{item.endereco.slice(-4)}
                    </small>
                    <small>Rede {item.rede}</small>
                  </span>
                </label>
                <Dialogo
                  titulo="Opções da carteira"
                  descricao={item.nome}
                  gatilho={
                    <button type="button" aria-label={`Opções de ${item.nome}`}>
                      ⋮
                    </button>
                  }
                >
                  <div className="menu-conta">
                    <Button
                      disabled={conexao.isPending || carteira?.id !== item.id}
                      onClick={() => conexao.mutate(conectado ? 'desconectar' : 'conectar')}
                    >
                      {conectado ? 'Desconectar carteira' : 'Conectar carteira'}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={conexao.isPending}
                      onClick={() => conexao.mutate('recusar')}
                    >
                      Simular recusa
                    </Button>
                    <Link to="/carteiras">Gerenciar carteiras</Link>
                  </div>
                </Dialogo>
              </div>
            ))}
          </div>
          <fieldset className="provedores-carteira">
            <legend>Carteira e rede</legend>
            {['WalletConnect', 'MetaMask', 'Coinbase Wallet'].map((tipo) => (
              <label key={tipo}>
                <span className="emblema-provedor" aria-hidden="true">
                  {tipo === 'WalletConnect' ? (
                    'W'
                  ) : tipo === 'MetaMask' ? (
                    'M'
                  ) : (
                    <img src="/icones/carteira-provedor.svg" width="22" height="22" alt="" />
                  )}
                </span>
                <span>{tipo}</span>
                <input
                  type="radio"
                  name="provedor-carteira"
                  value={tipo}
                  aria-label={tipo}
                  checked={Boolean(conectado && carteira?.tipo === tipo)}
                  disabled={carteira?.tipo !== tipo || conexao.isPending}
                  onChange={() => {
                    definirRevisao(null);
                    conexao.mutate('conectar');
                  }}
                />
              </label>
            ))}
          </fieldset>
          <p
            role="status"
            className={conexao.data?.estado === 'recusada' ? 'mensagem erro' : 'sr-only'}
          >
            {conectado
              ? 'Carteira conectada na simulação.'
              : conexao.data?.estado === 'recusada'
                ? 'Conexão recusada. Tente conectar novamente.'
                : 'Carteira desconectada.'}
          </p>
          {conexao.isError && <Falha erro={conexao.error} />}
          {erros.carteira && (
            <p className="erro" role="alert">
              {erros.carteira}
            </p>
          )}
          <p className="total-pagamento-movel">
            Total: <strong>{exibirEth((revisao ?? cotacao.data).total)}</strong>
          </p>
          {desatualizada && !tentativa && (
            <p role="alert" className="mensagem erro">
              A cotação mudou. Revise os valores e confirme novamente.
            </p>
          )}
          {desatualizada && !tentativa && (
            <Button type="button" onClick={() => revisar.mutate()}>
              Revisar compra
            </Button>
          )}
          <Dialogo
            titulo="Revisar compra"
            descricao="Confira os dados e a cotação atual antes de confirmar o pedido."
            aberto={revisaoAberta}
            aoAlterarAbertura={(aberto) => {
              if (!aberto) definirRevisaoAberta(false);
            }}
            gatilho={
              <Button
                className="confirmar-pagamento"
                form="formulario-pagamento"
                type="submit"
                disabled={!conectado || desatualizada || revisar.isPending || Boolean(tentativa)}
              >
                {revisar.isPending ? 'Revalidando…' : 'Confirmar compra'}
              </Button>
            }
          >
            {revisao && (
              <>
                <p>
                  {dadosRevisados?.nome} · {dadosRevisados?.email}
                </p>
                <p>
                  {carteira?.nome} · {carteira?.rede}
                </p>
                <ResumoValores cotacao={revisao} />
                {desatualizada && (
                  <p className="mensagem erro" role="alert">
                    A cotação mudou. Revise os valores e confirme novamente.
                  </p>
                )}
                {desatualizada && (
                  <Button type="button" onClick={() => revisar.mutate()}>
                    Revisar compra
                  </Button>
                )}
                <div className="acoes-revisao">
                  <Button
                    disabled={
                      !conectado ||
                      desatualizada ||
                      enviar.isPending ||
                      Boolean(tentativa) ||
                      cotacao.data.itens.some((item) => item.quantidade > item.disponivel)
                    }
                    onClick={confirmar}
                  >
                    {enviar.isPending ? 'Enviando pedido…' : 'Confirmar compra'}
                  </Button>
                  {tentativa && (
                    <Button disabled={enviar.isPending} onClick={confirmar}>
                      Recuperar pedido
                    </Button>
                  )}
                  <Button variant="ghost" onClick={() => definirRevisaoAberta(false)}>
                    Voltar aos dados
                  </Button>
                </div>
              </>
            )}
            {enviar.isError && <Falha erro={enviar.error} />}
          </Dialogo>
          {revisao && !revisaoAberta && (
            <Button type="button" variant="ghost" onClick={() => definirRevisaoAberta(true)}>
              Ver revisão
            </Button>
          )}
          {!revisaoAberta && enviar.isError && <Falha erro={enviar.error} />}
          {!carteiras.data.length && (
            <Link to="/carteiras">Cadastre uma carteira para continuar</Link>
          )}
        </aside>
      </div>
    </>
  );
}

/** A confirmação só existe depois do estado confirmado retornado pela API. */
export function AcompanharPedido() {
  const { pedidoId } = useParams({ from: '/pedido/$pedidoId' });
  const { perfil } = useSessao();
  const pedido = useQuery({
    queryKey: ['pedido', perfil?.id, pedidoId],
    queryFn: ({ signal }) => consultar(`/pedidos/${pedidoId}`, pedidoSchema, signal),
    refetchInterval: (consulta) => (consulta.state.data?.estado === 'pendente' ? 1200 : false),
  });
  if (pedido.isPending) return <Esqueleto detalhe />;
  if (pedido.isError)
    return axios.isAxiosError(pedido.error) && pedido.error.response?.status === 404 ? (
      <NaoEncontrado recurso="pedido" />
    ) : (
      <Falha erro={pedido.error} tentar={() => void pedido.refetch()} />
    );
  const confirmado = pedido.data.estado === 'confirmado';
  const pendente = pedido.data.estado === 'pendente';
  return (
    <section className="recibo">
      <Link
        to={confirmado ? '/' : '/carrinho'}
        className="fechar-recibo"
        aria-label="Fechar recibo"
      >
        <img src="/icones/fechar.svg" width="18" height="18" alt="" />
      </Link>
      <div className="cabecalho-recibo">
        <div className="icone-recibo">
          {confirmado ? (
            <img src="/icones/recibo-confirmado.svg" width="69" height="85" alt="" />
          ) : pendente ? (
            <Clock3 size={64} />
          ) : (
            <XCircle size={64} />
          )}
        </div>
        <h1 aria-live="polite">
          {confirmado
            ? 'Seus NFTs agora estão na sua carteira'
            : pendente
              ? 'Pedido pendente'
              : 'Pagamento recusado'}
        </h1>
      </div>
      <dl className="identificacao-recibo">
        <div>
          <dt>ID da transação</dt>
          <dd title={pedido.data.transacao || pedido.data.id}>
            {pedido.data.transacao
              ? `${pedido.data.transacao.slice(0, 6)}…${pedido.data.transacao.slice(-4)}`
              : pedido.data.id}
          </dd>
        </div>
        <div>
          <dt>Data</dt>
          <dd>
            {new Intl.DateTimeFormat('pt-BR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            }).format(new Date(pedido.data.criadoEm))}
          </dd>
        </div>
        <div>
          <dt>Total</dt>
          <dd>{exibirEth(pedido.data.cotacao.total)}</dd>
        </div>
        <div>
          <dt>Carteira</dt>
          <dd>{pedido.data.carteira.tipo}</dd>
        </div>
      </dl>
      <div className="corpo-recibo">
        <h2>Detalhes da transação</h2>
        <div className="colunas-recibo">
          <span>NFTs</span>
          <span>Edições</span>
          <span>Subtotal</span>
        </div>
        {pedido.data.cotacao.itens.map((item) => (
          <div className="item-recibo" key={`${item.nftId}:${item.edicaoId}`}>
            <img src={item.imagem} width="70" height="70" alt="" />
            <div>
              <h3>{item.nome}</h3>
              <p>ID do token: #{(item.nome.split('#')[1] ?? item.nftId).padStart(4, '0')}</p>
            </div>
            <span>(x {item.quantidade})</span>
            <strong>{exibirEth(deWei(paraWei(item.preco) * BigInt(item.quantidade)))}</strong>
          </div>
        ))}
        <div className="valores-recibo">
          <ResumoValores cotacao={pedido.data.cotacao} />
        </div>
        <p className="descricao-recibo">
          {confirmado
            ? `Transação confirmada na simulação da rede ${pedido.data.carteira.rede}. O recibo registra as obras e os valores desta compra. Nenhum ativo real foi transferido.`
            : pendente
              ? 'Aguardando a confirmação da simulação. Você pode recarregar esta página com segurança.'
              : 'A simulação recusou o pagamento. Seus itens foram preservados no carrinho.'}
        </p>
        {confirmado ? (
          <Dialogo
            titulo="Explorador simulado"
            descricao="Esta referência não existe em uma blockchain real."
            gatilho={<Button className="explorador-recibo">Ver no Etherscan</Button>}
          >
            <p>Transação simulada</p>
            <code className="endereco">{pedido.data.transacao}</code>
            <p>Pedido: {pedido.data.id}</p>
          </Dialogo>
        ) : (
          <Button asChild className="explorador-recibo">
            <Link to="/carrinho">Voltar ao carrinho</Link>
          </Button>
        )}
      </div>
    </section>
  );
}
