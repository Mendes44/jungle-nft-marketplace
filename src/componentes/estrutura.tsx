/** Estrutura Kurio, navegação responsiva e painel de cenários disponível também no build. */
import { useEffect } from 'react';
import { cenarios } from '../dominio/cenarios';
import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import {
  Home,
  Heart,
  UserRound,
  LogIn,
  Menu,
  ShoppingCart,
  SlidersHorizontal,
  Wallet,
} from 'lucide-react';
import { carrinhoSchema } from '../dominio/contratos';
import { alterar, cache, consultar, trocarSessao } from '../infraestrutura/api';
import { useSessao } from '../infraestrutura/sessao';
import { useTempoReal } from '../infraestrutura/tempo-real';
import { Button } from './ui/button';
import { Campo, Dialogo, Falha } from './comuns';

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
  const { conectado, aviso } = useTempoReal();
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
  const quantidade = carrinho.data?.itens.reduce((total, item) => total + item.quantidade, 0) ?? 0;
  return (
    <>
      <a className="pular-conteudo" href="#conteudo">
        Pular para o conteúdo
      </a>
      <div className="pagina">
        <header className="cabecalho">
          <Link to="/" className="marca" aria-label="KURIO início">
            KURIO
          </Link>
          <nav className="navegacao-desktop" aria-label="Principal">
            <Link to="/" activeProps={{ className: 'ativo' }} activeOptions={{ exact: true }}>
              Início
            </Link>
            <a href="/#catalogo">Mercado</a>
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
            <Link
              className="icone-carrinho"
              to="/carrinho"
              aria-label={`Carrinho, ${quantidade} itens`}
            >
              <ShoppingCart size={21} />
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
                  <LogIn size={16} />
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
        <div aria-live="polite" aria-atomic="true" className="aviso-tempo-real">
          {aviso}
        </div>
        {sair.isError && <Falha erro={sair.error} />}
        <main id="conteudo" tabIndex={-1}>
          <Outlet />
        </main>
        <footer>
          <div className="beneficios">
            <div>
              <Wallet />
              <h2>Segurança da carteira</h2>
              <p>Gerencie suas carteiras e revise cada compra.</p>
            </div>
            <div>
              <ShoppingCart />
              <h2>Colecione do seu jeito</h2>
              <p>Explore obras e edições de criadores independentes.</p>
            </div>
            <div>
              <SlidersHorizontal />
              <h2>Uma experiência transparente</h2>
              <p>Valores e disponibilidade sempre atualizados.</p>
            </div>
            <div>
              <h2>Antecipe sua próxima coleção</h2>
              <p>Descubra os lançamentos e acompanhe suas obras favoritas.</p>
              <Link to="/" className="link-texto">
                Explorar o mercado
              </Link>
            </div>
          </div>
          <div className="links-rodape">
            <div>
              <h2>Meu perfil</h2>
              <Link to="/perfil">Dados do perfil</Link>
              <Link to="/pedidos">Minhas compras</Link>
              <Link to="/carteiras">Carteiras</Link>
            </div>
            <div>
              <h2>Central de ajuda</h2>
              <Dialogo
                titulo="Como comprar NFTs"
                descricao="Guia da demonstração Kurio"
                gatilho={<button>Como comprar NFTs</button>}
              >
                <p>
                  Escolha uma obra e uma edição, adicione ao carrinho, entre na conta e conecte uma
                  carteira simulada. Revise os dados antes de confirmar. Todas as operações são
                  fictícias.
                </p>
              </Dialogo>
              <Link to="/carteiras">Carteira e segurança</Link>
            </div>
            <div>
              <h2>Coleções</h2>
              <a href="/#catalogo">Arte digital</a>
              <a href="/#catalogo">Fotografia</a>
              <a href="/#catalogo">Arte 3D</a>
            </div>
            <div>
              <h2>Carteiras compatíveis</h2>
              <p>MetaMask · WalletConnect · Coinbase Wallet</p>
              <p>© 2026 Kurio</p>
            </div>
          </div>
          <div className="rodape-final">
            <Link to="/" className="marca">
              KURIO
            </Link>
            <p>Arte digital. Novas perspectivas.</p>
            <div className="flex gap-5">
              <Link to="/perfil">Meu perfil</Link>
              <Link to="/carteiras">Carteiras</Link>
            </div>
          </div>
          <div className="rodape-demo">
            <span>Compras e transações inteiramente simuladas.</span>
            {import.meta.env.VITE_MOCKS !== 'false' && (
              <Dialogo
                key={local.pathname}
                titulo="Cenários da demonstração"
                descricao="Reproduza latência, falhas e eventos da API simulada."
                gatilho={
                  <Button variant="ghost" size="sm">
                    <SlidersHorizontal size={15} />
                    Simulação
                  </Button>
                }
              >
                <PainelSimulacao />
              </Dialogo>
            )}
          </div>
        </footer>
      </div>
      <nav className="navegacao-inferior" aria-label="Navegação móvel">
        <Link to="/" aria-label="Página inicial">
          <Home size={23} />
        </Link>
        <Link to="/pedidos" aria-label="Minha coleção">
          <Heart size={23} />
        </Link>
        <Link to="/carrinho" aria-label="Abrir carrinho">
          <ShoppingCart size={23} />
        </Link>
        <Link to="/perfil" aria-label="Abrir meu perfil">
          <UserRound size={23} />
        </Link>
      </nav>
    </>
  );
}
