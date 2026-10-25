/** Rotas TanStack Router com parâmetros validados e proteção assíncrona dos recursos privados. */
import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  type SearchSchemaInput,
  type ErrorComponentProps,
  lazyRouteComponent,
} from '@tanstack/react-router';
import axios from 'axios';
import { z } from 'zod';
import { filtrosSchema, type Filtros } from './dominio/contratos';
import { buscarSessao } from './infraestrutura/api';
import { Estrutura } from './componentes/estrutura';
import { NaoEncontrado } from './componentes/nao-encontrado';
import { Inicio, DetalheNft } from './funcionalidades/catalogo';
import { Falha } from './componentes/comuns';
import { Button } from './componentes/ui/button';

/** Permite repetir o carregamento ou retornar ao início quando uma rota falha. */
function ErroDaRota({ error, reset }: ErrorComponentProps) {
  return (
    <section className="pagina">
      <Falha erro={error} tentar={reset} />
      <Button asChild variant="outline">
        <a href="/">Voltar ao início</a>
      </Button>
    </section>
  );
}

const raiz = createRootRoute({
  component: Estrutura,
  notFoundComponent: () => <NaoEncontrado />,
  errorComponent: ErroDaRota,
});
const inicio = createRoute({
  getParentRoute: () => raiz,
  path: '/',
  validateSearch: (dados: Partial<Filtros> & SearchSchemaInput) => filtrosSchema.parse(dados),
  component: Inicio,
});
const detalhe = createRoute({
  getParentRoute: () => raiz,
  path: '/nft/$nftId',
  component: DetalheNft,
});
const carrinho = createRoute({
  getParentRoute: () => raiz,
  path: '/carrinho',
  component: lazyRouteComponent(() => import('./funcionalidades/compra'), 'Carrinho'),
});
const retornoSchema = z.object({
  retorno: z.string().catch('/'),
  motivo: z.literal('sessao-expirada').optional(),
});
const login = createRoute({
  getParentRoute: () => raiz,
  path: '/login',
  validateSearch: (dados) => retornoSchema.parse(dados),
  component: lazyRouteComponent(() => import('./funcionalidades/conta'), 'Autenticacao'),
});
const cadastro = createRoute({
  getParentRoute: () => raiz,
  path: '/cadastro',
  validateSearch: (dados) => retornoSchema.parse(dados),
  component: lazyRouteComponent(() => import('./funcionalidades/conta'), 'Cadastro'),
});
/** Guarda o contexto completo, incluindo busca, e exige uma sessão validada na API. */
async function proteger({ location }: { location: { href: string } }) {
  let perfil;
  try {
    perfil = await buscarSessao();
  } catch (erro) {
    if (!axios.isAxiosError(erro) || erro.response?.status !== 401) throw erro;
    perfil = null;
  }
  if (!perfil) throw redirect({ to: '/login', search: { retorno: location.href } });
}
const pagamento = createRoute({
  getParentRoute: () => raiz,
  path: '/pagamento',
  beforeLoad: proteger,
  component: lazyRouteComponent(() => import('./funcionalidades/compra'), 'Pagamento'),
});
const pedido = createRoute({
  getParentRoute: () => raiz,
  path: '/pedido/$pedidoId',
  beforeLoad: proteger,
  component: lazyRouteComponent(() => import('./funcionalidades/compra'), 'AcompanharPedido'),
});
const perfil = createRoute({
  getParentRoute: () => raiz,
  path: '/perfil',
  beforeLoad: proteger,
  component: lazyRouteComponent(() => import('./funcionalidades/conta'), 'PerfilColecionador'),
});
const carteiras = createRoute({
  getParentRoute: () => raiz,
  path: '/carteiras',
  beforeLoad: proteger,
  component: lazyRouteComponent(() => import('./funcionalidades/conta'), 'Carteiras'),
});
const pedidos = createRoute({
  getParentRoute: () => raiz,
  path: '/pedidos',
  beforeLoad: proteger,
  component: lazyRouteComponent(() => import('./funcionalidades/conta'), 'MeusPedidos'),
});
export const roteador = createRouter({
  routeTree: raiz.addChildren([
    inicio,
    detalhe,
    carrinho,
    login,
    cadastro,
    pagamento,
    pedido,
    perfil,
    carteiras,
    pedidos,
  ]),
  scrollRestoration: true,
  defaultPendingMinMs: 0,
});
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof roteador;
  }
}
