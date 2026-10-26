/** Estrutura Kurio, navegação responsiva e painel de cenários disponível também no build. */
import { useEffect } from 'react';
import { cenarios } from '../dominio/cenarios';
import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { Menu } from 'lucide-react';
import { carrinhoSchema } from '../dominio/contratos';
import { alterar, cache, consultar, trocarSessao } from '../infraestrutura/api';
import { useSessao } from '../infraestrutura/sessao';
import { useTempoReal } from '../infraestrutura/tempo-real';
import { AvisoTempoReal } from './aviso-tempo-real';
import { Button } from './ui/button';
import { Campo, Dialogo, Falha } from './comuns';
import { IconeOriginal, RodapeOriginal } from './vitrine';

/** Controles da demonstração enviam requisições; os eventos são emitidos exclusivamente nos mocks. */
function PainelSimulacao() {
  const consulta = useQuery({
    queryKey: ['simulacao'],
    queryFn: () => consultar('/simulacao', z.object({ cenario: z.string() })),
  });
  const mudar = useMutation({
    mutationFn: (dados: { cenario?: string; acao?: string }) =>
      alterar('POST', '/simulacao', dados, z.object({ cenario: z.string() })),
    onSuccess: async (dados, variaveis) => {
      cache.setQueryData(['simulacao'], dados);
      if (variaveis.acao === 'reset') {
        await trocarSessao('');
        for (const chave of Object.keys(sessionStorage)) {
          if (chave.startsWith('kurio.')) sessionStorage.removeItem(chave);
        }
        window.location.assign('/');
      } else if (!variaveis.acao || variaveis.acao === 'expirar') await cache.invalidateQueries();
    },
  });
  return (
    <div className="space-y-4 mt-6">
      <Campo rotulo="Cenário da simulação">
        {(id) => (
          <select
            id={id}
            value={consulta.data?.cenario ?? ''}
            disabled={consulta.isPending || consulta.isError || mudar.isPending}
            onChange={(evento) => mudar.mutate({ cenario: evento.target.value })}
          >
            {!consulta.data && (
              <option value="">
                {consulta.isError ? 'Consulta indisponível' : 'Consultando cenário…'}
              </option>
            )}
            {cenarios.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        )}
      </Campo>
      {consulta.isError && <Falha erro={consulta.error} tentar={() => void consulta.refetch()} />}
      <div className="grade-simulacao">
        {[
          { acao: 'preco', nome: 'Alterar preço do NFT 1' },
          { acao: 'esgotar', nome: 'Esgotar edição do NFT 1' },
          { acao: 'duplicado', nome: 'Reemitir evento duplicado' },
          { acao: 'antigo', nome: 'Emitir evento antigo' },
          { acao: 'desconectar', nome: 'Interromper Socket.IO' },
          { acao: 'expirar', nome: 'Expirar sessão' },
          { acao: 'finalizar', nome: 'Concluir pedidos pendentes' },
        ].map((item) => (
          <Button
            key={item.acao}
            variant="outline"
            size="sm"
            onClick={() => mudar.mutate({ acao: item.acao })}
          >
            {item.nome}
          </Button>
        ))}
      </div>
      <Button onClick={() => mudar.mutate({ acao: 'reset' })}>Restaurar demonstração</Button>
      <p className="text-xs text-[var(--suave)]">
        O reset remove somente os dados fictícios desta aplicação neste navegador.
      </p>
      {mudar.isError && <Falha erro={mudar.error} />}
    </div>
  );
}

/** Frame comum com skip link, foco de navegação e feedback acessível em tempo real. */
export function Estrutura() {
  const { perfil, token } = useSessao();
  const navegar = useNavigate();
  const local = useRouterState({ select: (estado) => estado.location });
  const { conectado, aviso, dispensarAviso } = useTempoReal();
  const carrinho = useQuery({
    queryKey: ['carrinho', perfil?.id ?? token],
    queryFn: ({ signal }) => consultar('/carrinho', carrinhoSchema, signal),
  });
  const sair = useMutation({
    mutationFn: () => alterar('POST', '/logout', {}, z.object({ sucesso: z.boolean() })),
    onSuccess: async () => {
      await trocarSessao('');
      await navegar({ to: '/' });
    },
  });
  useEffect(() => {
    /** A expiração mantém o endereço do fluxo privado para retomada depois do login. */
    function autenticar() {
      void navegar({ to: '/login', search: { retorno: local.href, motivo: 'sessao-expirada' } });
    }
    window.addEventListener('kurio:autenticar', autenticar);
    return () => window.removeEventListener('kurio:autenticar', autenticar);
  }, [navegar, local.href]);
  useEffect(() => {
    document.title = `Kurio | ${local.pathname === '/' ? 'Arte digital e colecionáveis' : local.pathname.startsWith('/nft') ? 'Detalhes da obra' : 'Sua coleção'}`;
  }, [local.pathname]);
  const tipoPagina =
    local.pathname === '/'
      ? 'inicio'
      : local.pathname.startsWith('/nft/')
        ? 'detalhe'
        : ['/perfil', '/carteiras', '/pedidos'].includes(local.pathname)
          ? 'conta'
          : ['/login', '/cadastro'].includes(local.pathname)
            ? 'autenticacao'
            : local.pathname.startsWith('/pedido/')
              ? 'pedido'
              : local.pathname.slice(1);
  /** A busca abre o controle da página inicial sem descartar filtros já presentes na URL. */
  function abrirBusca() {
    const focar = () => window.dispatchEvent(new Event('kurio:abrir-busca'));
    if (local.pathname === '/') focar();
    else void navegar({ to: '/' }).then(() => window.requestAnimationFrame(focar));
  }
  const quantidade = carrinho.data?.itens.reduce((total, item) => total + item.quantidade, 0) ?? 0;
  return (
    <>
      <a className="pular-conteudo" href="#conteudo">
        Pular para o conteúdo
      </a>
      <div className={`pagina pagina-${tipoPagina}`}>
        <header className="cabecalho">
          <Link to="/" className="marca" aria-label="KURIO início">
            KURIO
          </Link>
          <nav className="navegacao-desktop" aria-label="Principal">
            <Link to="/" activeProps={{ className: 'ativo' }} activeOptions={{ exact: true }}>
              Início
            </Link>
            <a
              href="/#catalogo"
              className={
                ['detalhe', 'carrinho', 'pagamento'].includes(tipoPagina) ? 'ativo' : undefined
              }
            >
              Mercado
            </a>
            <Dialogo
              titulo="Criadores Kurio"
              descricao="Conheça os artistas nas informações de cada obra."
              gatilho={<button>Criadores</button>}
            >
              <p>
                A curadoria desta demonstração reúne Rafael Lima e Marina Costa. Explore as obras
                para conhecer cada coleção.
              </p>
            </Dialogo>
            <Dialogo
              titulo="Sobre esta demonstração"
              descricao="Um marketplace de arte digital com integrações simuladas."
              gatilho={<button>Aprenda</button>}
            >
              <p>
                ETH é a unidade de referência. Carteiras, compras e transações são simuladas e não
                movimentam ativos reais.
              </p>
            </Dialogo>
          </nav>
          <div className="acoes-cabecalho">
            <button
              type="button"
              className="buscar-cabecalho"
              aria-label="Abrir busca de NFTs"
              onClick={abrirBusca}
            >
              <IconeOriginal nome="busca" tamanho={26} />
            </button>
            <Link
              className="icone-carrinho"
              to="/carrinho"
              aria-label={`Carrinho, ${quantidade} itens`}
            >
              <IconeOriginal nome="carrinho" tamanho={28} />
              <span>{quantidade}</span>
            </Link>
            {perfil ? (
              <>
                <Link className="conta-cabecalho" to="/perfil">
                  {perfil.apelido}
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => sair.mutate()}
                  disabled={sair.isPending}
                >
                  Sair
                </Button>
              </>
            ) : (
              <Button asChild size="sm">
                <Link to="/login" search={{ retorno: local.href }}>
                  <IconeOriginal nome="entrar" tamanho={20} />
                  Entrar
                </Link>
              </Button>
            )}
            <div className="menu-mobile">
              <Dialogo
                titulo="Navegação"
                descricao="Explore o mercado e gerencie sua coleção."
                gatilho={
                  <Button variant="ghost" size="icon" aria-label="Abrir navegação">
                    <Menu size={21} />
                  </Button>
                }
              >
                <nav className="flex flex-col gap-5 mt-6">
                  <a href="/">Início</a>
                  <a href="/#catalogo">Mercado</a>
                  <a href="/perfil">Meu perfil</a>
                  <a href="/carteiras">Carteiras</a>
                  <a href="/pedidos">Meus pedidos</a>
                </nav>
              </Dialogo>
            </div>
          </div>
        </header>
        <div className="barra-conexao" role="status">
          <span className={conectado ? 'conectado' : ''}>●</span>
          {conectado ? 'Atualizações em tempo real ativas' : 'Reconectando atualizações…'}
          <span className="selo-demo">AMBIENTE DE DEMONSTRAÇÃO</span>
        </div>
        <AvisoTempoReal aviso={aviso} fechar={dispensarAviso} />
        {sair.isError && <Falha erro={sair.error} />}
        <main id="conteudo" tabIndex={-1}>
          <Outlet />
        </main>
        <footer className="rodape-original">
          <RodapeOriginal />
        </footer>
      </div>
      {import.meta.env.VITE_MOCKS !== 'false' && (
        <div className="acesso-simulacao">
          <Dialogo
            key={local.pathname}
            titulo="Cenários da demonstração"
            descricao="Reproduza latência, falhas e eventos da API simulada."
            gatilho={
              <Button variant="ghost" size="sm" aria-label="Simulação">
                <IconeOriginal nome="digitalizar" tamanho={34} />
                <span>Simulação</span>
              </Button>
            }
          >
            <PainelSimulacao />
          </Dialogo>
        </div>
      )}
      <nav className="navegacao-inferior" aria-label="Navegação móvel">
        <Link to="/" aria-label="Página inicial">
          <IconeOriginal nome="inicio" />
        </Link>
        <Link to="/pedidos" aria-label="Minha coleção">
          <IconeOriginal nome="favoritos" />
        </Link>
        <span className="espaco-digitalizador" aria-hidden="true" />
        <Link to="/carrinho" aria-label="Abrir carrinho">
          <IconeOriginal nome="sacola" />
        </Link>
        {perfil ? (
          <Dialogo
            key={local.pathname}
            titulo="Sua conta"
            descricao={perfil.nome}
            gatilho={
              <button type="button" aria-label="Abrir sua conta">
                <IconeOriginal nome="perfil" />
              </button>
            }
          >
            <nav className="menu-conta">
              <Link to="/perfil">Meu perfil</Link>
              <Link to="/carteiras">Carteiras</Link>
              <Link to="/pedidos">Minha coleção</Link>
              <Button onClick={() => sair.mutate()} disabled={sair.isPending}>
                Sair
              </Button>
            </nav>
          </Dialogo>
        ) : (
          <Link to="/perfil" aria-label="Abrir meu perfil">
            <IconeOriginal nome="perfil" />
          </Link>
        )}
      </nav>
    </>
  );
}
