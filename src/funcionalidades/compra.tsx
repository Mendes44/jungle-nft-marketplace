/** Carrinho, revisão e acompanhamento da compra. A API é a autoridade para totais e estados. */
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import axios from 'axios';
import { CheckCircle2, Clock3, ShieldCheck, Trash2, Wallet, XCircle, Search } from 'lucide-react';
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
import { alterar, cache, consultar } from '../infraestrutura/api';
import { useSessao } from '../infraestrutura/sessao';
import { Button } from '../componentes/ui/button';
import { Campo, Dialogo, Esqueleto, Falha } from '../componentes/comuns';
import { NaoEncontrado } from '../componentes/nao-encontrado';
import { MaisDaColecao } from './catalogo';

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
        <dt>Desconto {cotacao.cupom && `(${cotacao.cupom})`}</dt>
        <dd>− {exibirEth(cotacao.desconto)}</dd>
      </div>
      <div>
        <dt>Taxa de rede</dt>
        <dd>{exibirEth(cotacao.taxa)}</dd>
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
      onSubmit={(evento) => {
        evento.preventDefault();
        aplicar.mutate(codigo);
      }}
    >
      <Campo rotulo="Código promocional">
        {(id) => (
          <div className="flex">
            <input
              id={id}
              value={codigo}
              onChange={(evento) => definirCodigo(evento.target.value)}
              placeholder="Digite seu cupom"
            />
            <Button disabled={aplicar.isPending}>Aplicar</Button>
          </div>
        )}
      </Campo>
      {aplicado && (
        <div className="text-xs flex items-center justify-between">
          <span>{aplicado} aplicado</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
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
        <Link to="/">Início</Link> / Mercado / Carrinho de NFTs
      </nav>
      <h1 className="titulo-pagina">
        Seu carrinho<span className="text-[var(--cobre)]">.</span>
      </h1>
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
              <span>Preço / Edições / Total</span>
            </div>
            {carrinho.data.itens.map((item) => (
              <article className="item-carrinho" key={`${item.nftId}:${item.edicaoId}`}>
                <img src={item.imagem} alt={item.nome} width="80" height="80" />
                <div>
                  <Link to="/nft/$nftId" params={{ nftId: item.nftId }}>
                    <h2>{item.nome}</h2>
                  </Link>
                  <p className="text-xs text-[var(--suave)]">
                    Edição {item.edicao} · {exibirEth(item.preco)}
                  </p>
                  <p className="text-xs text-[var(--cobre)]">
                    Total do item: {exibirEth(deWei(paraWei(item.preco) * BigInt(item.quantidade)))}
                  </p>
                  <p className="text-xs">{item.disponivel} disponível(is)</p>
                  {item.quantidade > item.disponivel && (
                    <p className="erro text-xs">
                      Quantidade indisponível. Ajuste ou remova este item.
                    </p>
                  )}
                </div>
                <Campo rotulo={`Quantidade de ${item.nome}`}>
                  {(id) => (
                    <input
                      className="quantidade"
                      id={id}
                      type="number"
                      min="1"
                      max={Math.max(item.disponivel, item.quantidade)}
                      value={item.quantidade}
                      disabled={mudar.isPending}
                      onChange={(evento) => {
                        const quantidade = evento.target.valueAsNumber;
                        if (Number.isInteger(quantidade) && quantidade > 0)
                          mudar.mutate({
                            metodo: 'PATCH',
                            item: { nftId: item.nftId, edicaoId: item.edicaoId, quantidade },
                          });
                      }}
                    />
                  )}
                </Campo>
                <Dialogo
                  titulo="Remover esta obra?"
                  descricao="Você pode adicioná-la novamente enquanto houver edições disponíveis."
                  gatilho={
                    <Button variant="ghost" size="icon" aria-label={`Remover ${item.nome}`}>
                      <Trash2 size={18} />
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
            <Link to="/" className="link-texto">
              Continuar explorando
            </Link>
          </section>
          <aside className="painel-resumo">
            <h2>Resumo da carteira</h2>
            <Cupom aplicado={cotacao.data.cupom} />
            <ResumoValores cotacao={cotacao.data} />
            <Button asChild className="w-full">
              <Link to="/pagamento">Conectar e finalizar</Link>
            </Button>
            <p className="seguranca">
              <ShieldCheck size={17} />
              Valores revalidados antes da compra.
            </p>
          </aside>
        </div>
      )}
      {carrinho.data.itens.length > 0 && <MaisDaColecao />}
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
  const [carteiraId, definirCarteira] = useState('');
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
        erro.response.status !== 401
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
      cache.setQueryData(['cotacao', perfil?.id], atual);
    },
  });
  /** Valida os campos do layout antes de buscar uma cotação atual para a revisão. */
  function prepararRevisao(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const resultado = colecionadorSchema.safeParse(
      Object.fromEntries(new FormData(evento.currentTarget)),
    );
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
    return (
      <Campo key={nome} rotulo={rotulo} erro={erros[nome]}>
        {(id, erroId) => (
          <input
            id={id}
            name={nome}
            type={tipo}
            defaultValue={rascunho[nome] ?? valor}
            required
            aria-invalid={Boolean(erros[nome])}
            aria-describedby={erroId}
            onChange={() => definirRevisao(null)}
          />
        )}
      </Campo>
    );
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
        <Link to="/carrinho">Carrinho</Link> / Pagamento
      </nav>
      <h1 className="titulo-pagina">
        Sua próxima coleção<span className="text-[var(--cobre)]">.</span>
      </h1>
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
      <div className="compra-layout">
        <form
          onSubmit={prepararRevisao}
          onChange={(evento) => {
            sessionStorage.setItem(
              chaveRascunho,
              JSON.stringify(Object.fromEntries(new FormData(evento.currentTarget))),
            );
          }}
        >
          <h2 className="subtitulo">Perfil do colecionador</h2>
          <div className="grade-formulario">
            {campoTexto('nome', 'Nome de exibição', perfil?.nome)}
            {campoTexto('apelido', 'Nome de usuário', perfil?.apelido)}
            {campoTexto('nomePerfil', 'Nome de perfil', perfil?.apelido)}
            {campoTexto('email', 'E-mail', perfil?.email, 'email')}
            {campoTexto('indicacao', 'Código de indicação')}
            {campoTexto('ens', 'Nome ENS (.eth)')}
            <Campo rotulo="Endereço secundário (opcional)" erro={erros.enderecoSecundario}>
              {(id, erroId) => (
                <input
                  id={id}
                  name="enderecoSecundario"
                  defaultValue={rascunho.enderecoSecundario ?? ''}
                  aria-describedby={erroId}
                  onChange={() => definirRevisao(null)}
                />
              )}
            </Campo>
            <Campo rotulo="Observação do colecionador (opcional)">
              {(id) => (
                <textarea
                  id={id}
                  name="observacao"
                  defaultValue={rascunho.observacao ?? ''}
                  maxLength={500}
                  rows={4}
                  onChange={() => definirRevisao(null)}
                />
              )}
            </Campo>
          </div>
          <h2 className="subtitulo mt-8">Carteira e rede</h2>
          {carteiras.data.length ? (
            <>
              <Campo rotulo="Carteira cadastrada">
                {(id) => (
                  <select
                    id={id}
                    value={carteira?.id ?? ''}
                    onChange={(evento) => {
                      definirCarteira(evento.target.value);
                      definirRevisao(null);
                      conexao.reset();
                    }}
                  >
                    {carteiras.data.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nome} · {item.principal ? 'Principal' : 'Secundária'}
                      </option>
                    ))}
                  </select>
                )}
              </Campo>
              <Campo rotulo="Rede">
                {(id) => (
                  <select id={id} value={carteira?.rede} onChange={() => definirRevisao(null)}>
                    <option>{carteira?.rede}</option>
                  </select>
                )}
              </Campo>
              <Campo rotulo="Endereço da carteira">
                {(id) => <input id={id} value={carteira?.endereco ?? ''} readOnly />}
              </Campo>
              <Campo rotulo="Tipo de carteira">
                {(id) => <input id={id} value={carteira?.tipo ?? ''} readOnly />}
              </Campo>
              <div className="flex flex-wrap gap-2 my-4">
                <Button
                  type="button"
                  variant="outline"
                  disabled={conexao.isPending}
                  onClick={() => conexao.mutate(conectado ? 'desconectar' : 'conectar')}
                >
                  <Wallet size={17} />
                  {conectado ? 'Desconectar carteira' : 'Conectar carteira'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={conexao.isPending}
                  onClick={() => conexao.mutate('recusar')}
                >
                  Simular recusa
                </Button>
              </div>
              <p role="status" className="text-sm mb-4">
                {conectado
                  ? 'Carteira conectada na simulação.'
                  : conexao.data?.estado === 'recusada'
                    ? 'Conexão recusada. Tente conectar novamente.'
                    : 'Carteira desconectada.'}
              </p>
              {conexao.isError && <Falha erro={conexao.error} />}
            </>
          ) : (
            <p className="mensagem">
              Cadastre uma carteira para continuar. <Link to="/carteiras">Gerenciar carteiras</Link>
            </p>
          )}
          <Button disabled={!conectado || revisar.isPending || Boolean(tentativa)}>
            {revisar.isPending ? 'Revalidando…' : 'Revisar compra'}
          </Button>
          {revisar.isError && <Falha erro={revisar.error} />}
        </form>
        <aside className="painel-resumo">
          <h2>Seus NFTs</h2>
          {cotacao.data.itens.map((item) => (
            <div className="item-resumo" key={`${item.nftId}:${item.edicaoId}`}>
              <img src={item.imagem} width="54" height="54" alt="" />
              <div>
                <p>{item.nome}</p>
                <small>
                  {item.quantidade} × {exibirEth(item.preco)}
                </small>
              </div>
            </div>
          ))}
          <ResumoValores cotacao={revisao ?? cotacao.data} />
          {desatualizada && !tentativa && (
            <p role="alert" className="mensagem erro">
              A cotação mudou. Revise os valores e confirme novamente.
            </p>
          )}
          {revisao && (
            <div className="revisao">
              <h3>Revise antes de confirmar</h3>
              <p>
                {dadosRevisados?.nome} · {dadosRevisados?.email}
              </p>
              <p>
                {carteira?.nome} · {carteira?.rede}
              </p>
              <Button
                className="w-full mt-4"
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
            </div>
          )}
          {enviar.isError && <Falha erro={enviar.error} />}
          <p className="seguranca">
            <ShieldCheck size={18} />
            Demonstração. Nenhum valor real será cobrado.
          </p>
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
      <div className="icone-recibo">
        {confirmado ? (
          <CheckCircle2 size={48} />
        ) : pendente ? (
          <Clock3 size={48} />
        ) : (
          <XCircle size={48} />
        )}
      </div>
      <p className="sobretitulo">{pedido.data.id}</p>
      <h1 aria-live="polite">
        {confirmado
          ? 'Sua coleção ganhou uma nova história.'
          : pendente
            ? 'Pedido pendente'
            : 'Pagamento recusado'}
      </h1>
      <p className="descricao">
        {confirmado
          ? 'Compra confirmada na simulação. Confira seu recibo.'
          : pendente
            ? 'Aguardando a confirmação da simulação. Você pode recarregar esta página com segurança.'
            : 'A simulação recusou o pagamento. Seus itens foram preservados no carrinho.'}
      </p>
      <div className="painel-resumo text-left">
        <h2>{confirmado ? 'Recibo do pedido' : 'Resumo do pedido'}</h2>
        {pedido.data.cotacao.itens.map((item) => (
          <div className="item-resumo" key={`${item.nftId}:${item.edicaoId}`}>
            <img src={item.imagem} alt="" width="60" height="60" />
            <div>
              <h3>{item.nome}</h3>
              <p>
                {item.quantidade} × {exibirEth(item.preco)} · {item.edicao}
              </p>
            </div>
          </div>
        ))}
        <ResumoValores cotacao={pedido.data.cotacao} />
        <p>Carteira: {pedido.data.carteira.nome}</p>
        <p>
          Data:{' '}
          {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(
            new Date(pedido.data.criadoEm),
          )}
        </p>
        <p>Rede: {pedido.data.carteira.rede}</p>
        {confirmado && (
          <div className="mt-4">
            <p>Transação simulada</p>
            <code className="endereco">{pedido.data.transacao}</code>
            <Dialogo
              titulo="Explorador simulado"
              descricao="Esta referência não existe em uma blockchain real."
              gatilho={
                <Button variant="ghost" size="sm">
                  <Search size={16} aria-hidden="true" /> Ver referência da transação
                </Button>
              }
            >
              <p className="endereco">{pedido.data.transacao}</p>
            </Dialogo>
          </div>
        )}
      </div>
      <Button asChild className="mt-6">
        <Link to={confirmado ? '/' : '/carrinho'}>
          {confirmado ? 'Continuar explorando' : 'Voltar ao carrinho'}
        </Link>
      </Button>
    </section>
  );
}
