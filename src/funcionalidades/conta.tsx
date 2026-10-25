/** Autenticação, perfil e carteiras: mutations REST com validação local e erros do servidor. */
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import * as Dialog from '@radix-ui/react-dialog';
import { Wallet, Pencil, Plus, X } from 'lucide-react';
import {
  cadastroSchema,
  carteiraSchema,
  dadosPerfilSchema,
  pedidoSchema,
  perfilSchema,
  type Carteira,
  type Perfil,
} from '../dominio/contratos';
import { alterar, cache, consultar, trocarSessao } from '../infraestrutura/api';
import { useSessao } from '../infraestrutura/sessao';
import { Button } from '../componentes/ui/button';
import { Campo, Esqueleto, Falha } from '../componentes/comuns';

/** Nunca redireciona a domínios externos fornecidos em parâmetros de busca. */
function retornoSeguro(retorno: string) {
  return retorno.startsWith('/') &&
    !retorno.startsWith('//') &&
    !retorno.startsWith('/login') &&
    !retorno.startsWith('/cadastro')
    ? retorno
    : '/';
}
/** Login e cadastro compartilham a estrutura visual e mantêm o contexto anterior. */
export function Autenticacao({ cadastro = false }: { cadastro?: boolean }) {
  const { retorno, motivo } = useSearch({ strict: false });
  const navegar = useNavigate();
  const [erros, definirErros] = useState<Record<string, string>>({});
  const autenticar = useMutation({
    mutationFn: (dados: { nome?: string; email: string; senha: string }) =>
      alterar(
        'POST',
        cadastro ? '/cadastro' : '/login',
        dados,
        z.object({ token: z.string(), perfil: perfilSchema }),
      ),
    onSuccess: async (dados) => {
      await trocarSessao(dados.token);
      await navegar({ href: retornoSeguro(retorno ?? '/') });
    },
  });
  /** Credenciais são enviadas à API e não são persistidas no formulário. */
  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = Object.fromEntries(new FormData(evento.currentTarget));
    const esquema = cadastro
      ? cadastroSchema
      : z.object({
          email: z.email('Informe um e-mail válido.'),
          senha: z.string().min(1, 'Informe sua senha.'),
        });
    const resultado = esquema.safeParse(formulario);
    if (!resultado.success) {
      definirErros(
        Object.fromEntries(
          resultado.error.issues.map((item) => [String(item.path[0]), item.message]),
        ),
      );
      return;
    }
    if (cadastro && formulario.confirmacao !== resultado.data.senha) {
      definirErros({ confirmacao: 'As senhas precisam ser iguais.' });
      return;
    }
    definirErros({});
    autenticar.mutate(resultado.data);
  }
  return (
    <>
      <div className="fundo-autenticacao" aria-hidden="true" inert>
        <div>
          <p>Bem-vindo à Kurio</p>
          <h2>
            SEJA DONO DO FUTURO
            <br />
            DA ARTE DIGITAL
          </h2>
          <p>Descubra NFTs selecionados de criadores emergentes e consagrados.</p>
        </div>
        <img src="/imagens/colecao-0.webp" alt="" width="450" height="450" />
        <div className="vitrine-autenticacao">
          {[0, 1, 2, 1, 3, 2].map((retrato, indice) => (
            <img
              key={indice}
              src={`/imagens/colecao-${retrato}.webp`}
              alt=""
              width="240"
              height="240"
            />
          ))}
        </div>
      </div>
      <Dialog.Root
        open
        onOpenChange={(aberto) => {
          if (!aberto) void navegar({ href: retornoSeguro(retorno ?? '/') });
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialogo-fundo" />
          <Dialog.Content className="autenticacao-conteudo">
            <Dialog.Title className="sr-only">
              {cadastro ? 'Criar conta de colecionador' : 'Acessar sua conta'}
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              Entre ou cadastre-se para gerenciar suas obras e carteiras.
            </Dialog.Description>
            <Dialog.Close asChild>
              <Button
                variant="ghost"
                size="icon"
                className="dialogo-fechar"
                aria-label="Fechar autenticação"
              >
                <X size={18} />
              </Button>
            </Dialog.Close>
            <section className="autenticacao-layout">
              {motivo === 'sessao-expirada' && (
                <p className="mensagem" role="status">
                  Sua sessão expirou. Entre novamente para continuar de onde parou.
                </p>
              )}
              <div>
                <p className="sobretitulo">SUA COLEÇÃO COMEÇA AQUI</p>
                <h1>{cadastro ? 'Crie sua conta.' : 'Bem-vindo de volta.'}</h1>
                <p className="descricao">
                  {cadastro
                    ? 'Faça parte de uma nova forma de colecionar arte.'
                    : 'Entre para explorar, colecionar e acompanhar suas obras.'}
                </p>
                <form onSubmit={enviar} noValidate>
                  {cadastro && (
                    <Campo rotulo="Nome completo" erro={erros.nome}>
                      {(id, erroId) => (
                        <input
                          id={id}
                          name="nome"
                          autoComplete="name"
                          required
                          minLength={3}
                          aria-invalid={Boolean(erros.nome)}
                          aria-describedby={erroId}
                        />
                      )}
                    </Campo>
                  )}
                  <Campo rotulo="E-mail" erro={erros.email}>
                    {(id, erroId) => (
                      <input
                        id={id}
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        aria-invalid={Boolean(erros.email)}
                        aria-describedby={erroId}
                      />
                    )}
                  </Campo>
                  <Campo rotulo="Senha" erro={erros.senha}>
                    {(id, erroId) => (
                      <input
                        id={id}
                        name="senha"
                        type="password"
                        autoComplete={cadastro ? 'new-password' : 'current-password'}
                        required
                        aria-invalid={Boolean(erros.senha)}
                        aria-describedby={erroId}
                      />
                    )}
                  </Campo>
                  {cadastro && (
                    <Campo rotulo="Confirmar senha" erro={erros.confirmacao}>
                      {(id, erroId) => (
                        <input
                          id={id}
                          name="confirmacao"
                          type="password"
                          autoComplete="new-password"
                          aria-invalid={Boolean(erros.confirmacao)}
                          aria-describedby={erroId}
                        />
                      )}
                    </Campo>
                  )}
                  {autenticar.isError && <Falha erro={autenticar.error} />}
                  <Button className="w-full mt-4" disabled={autenticar.isPending}>
                    {autenticar.isPending ? 'Aguarde…' : cadastro ? 'Criar conta' : 'Entrar'}
                  </Button>
                </form>
                <p className="text-sm mt-6">
                  {cadastro ? 'Já tem uma conta? ' : 'Ainda não tem uma conta? '}
                  <Link
                    className="link-texto"
                    to={cadastro ? '/login' : '/cadastro'}
                    search={{ retorno: retorno ?? '/' }}
                  >
                    {cadastro ? 'Entrar' : 'Cadastre-se'}
                  </Link>
                </p>
                <p className="text-xs text-[var(--suave)] mt-8">
                  Demonstração: ana@exemplo.com ou bruno@exemplo.com
                  <br />
                  Senha fictícia: Colecao123
                </p>
              </div>
              <div className="arte-autenticacao">
                <img
                  src="/imagens/colecao-0.webp"
                  width="480"
                  height="480"
                  alt="Macaco Esmeralda da coleção Kurio"
                />
                <p>ARTE DIGITAL. IDENTIDADE REAL.</p>
              </div>
            </section>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
/** Entrada independente permite baixar a tela de cadastro somente ao navegar até ela. */
export function Cadastro() {
  return <Autenticacao cadastro />;
}
/** Navegação privada sempre deixa o destino atual explícito. */
export function NavegacaoConta() {
  return (
    <nav className="navegacao-conta" aria-label="Sua conta">
      <Link to="/perfil" activeProps={{ className: 'ativo' }}>
        Perfil do colecionador
      </Link>
      <Link to="/carteiras" activeProps={{ className: 'ativo' }}>
        Carteiras
      </Link>
      <Link to="/pedidos" activeProps={{ className: 'ativo' }}>
        Meus pedidos
      </Link>
    </nav>
  );
}

/** Edição separada permite usar os dados recuperados como estado inicial sem efeitos de sincronização. */
function FormularioPerfil({ perfil }: { perfil: Perfil }) {
  const [avatar, definirAvatar] = useState(perfil.avatar);
  const [erroAvatar, definirErroAvatar] = useState('');
  const [erros, definirErros] = useState<Record<string, string>>({});
  const salvar = useMutation({
    mutationFn: (dados: z.infer<typeof dadosPerfilSchema>) =>
      alterar('PATCH', '/perfil', dados, perfilSchema),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: ['perfil'] });
      await cache.invalidateQueries({ queryKey: ['sessao'] });
    },
  });
  const senha = useMutation({
    mutationFn: (dados: { atual: string; nova: string }) =>
      alterar('PATCH', '/senha', dados, z.object({ sucesso: z.boolean() })),
  });
  /** Lê imagens pequenas e não executáveis; o servidor valida novamente o data URL. */
  async function lerAvatar(arquivo?: File) {
    if (!arquivo) return;
    if (
      !['image/png', 'image/jpeg', 'image/webp'].includes(arquivo.type) ||
      arquivo.size > 400000
    ) {
      definirErroAvatar('Use PNG, JPEG ou WebP de até 400 KB.');
      return;
    }
    const leitor = new FileReader();
    leitor.onload = () => {
      if (typeof leitor.result === 'string') {
        definirAvatar(leitor.result);
        definirErroAvatar('');
      }
    };
    leitor.onerror = () => definirErroAvatar('Não foi possível ler esta imagem.');
    leitor.readAsDataURL(arquivo);
  }
  /** A API verifica conflitos de e-mail antes de persistir o perfil. */
  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const resultado = dadosPerfilSchema.safeParse({
      ...Object.fromEntries(new FormData(evento.currentTarget)),
      avatar,
    });
    if (!resultado.success) {
      definirErros(
        Object.fromEntries(
          resultado.error.issues.map((item) => [String(item.path[0]), item.message]),
        ),
      );
      return;
    }
    definirErros({});
    salvar.mutate(resultado.data);
  }
  /** Senha atual é conferida na API; confirmação e complexidade são validadas antes do envio. */
  function mudarSenha(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = new FormData(evento.currentTarget);
    const resultado = z
      .object({ atual: z.string().min(1), nova: cadastroSchema.shape.senha, confirmar: z.string() })
      .refine((dados) => dados.nova === dados.confirmar, {
        message: 'As senhas precisam ser iguais.',
        path: ['confirmar'],
      })
      .safeParse(Object.fromEntries(formulario));
    if (!resultado.success) {
      definirErros(
        Object.fromEntries(
          resultado.error.issues.map((item) => [String(item.path[0]), item.message]),
        ),
      );
      return;
    }
    definirErros({});
    senha.mutate(resultado.data);
    evento.currentTarget.reset();
  }
  return (
    <div className="conta-layout">
      <div>
        <form onSubmit={enviar} noValidate>
          <h2 className="subtitulo">Informações do perfil</h2>
          <div className="avatar-editor">
            <img src={avatar} width="88" height="88" alt="Seu avatar" />
            <Campo rotulo="Alterar avatar" erro={erroAvatar}>
              {(id, erroId) => (
                <input
                  id={id}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  aria-describedby={erroId}
                  onChange={(evento) => void lerAvatar(evento.target.files?.[0])}
                />
              )}
            </Campo>
          </div>
          <div className="grade-formulario">
            {[
              { nome: 'nome', rotulo: 'Nome completo', valor: perfil.nome },
              { nome: 'apelido', rotulo: 'Nome de usuário', valor: perfil.apelido },
              { nome: 'email', rotulo: 'E-mail', valor: perfil.email },
            ].map((campo) => (
              <Campo key={campo.nome} rotulo={campo.rotulo} erro={erros[campo.nome]}>
                {(id, erroId) => (
                  <input
                    id={id}
                    name={campo.nome}
                    defaultValue={campo.valor}
                    aria-invalid={Boolean(erros[campo.nome])}
                    aria-describedby={erroId}
                  />
                )}
              </Campo>
            ))}
          </div>
          <Campo rotulo="Biografia" erro={erros.biografia}>
            {(id, erroId) => (
              <textarea
                id={id}
                name="biografia"
                defaultValue={perfil.biografia}
                maxLength={300}
                rows={4}
                aria-describedby={erroId}
              />
            )}
          </Campo>
          <Button disabled={salvar.isPending}>Salvar perfil</Button>
          {salvar.isError && <Falha erro={salvar.error} />}
          {salvar.isSuccess && (
            <p role="status" className="mensagem">
              Perfil atualizado.
            </p>
          )}
        </form>
        <form className="mt-12" onSubmit={mudarSenha} noValidate>
          <h2 className="subtitulo">Alterar senha</h2>
          {[
            { nome: 'atual', rotulo: 'Senha atual' },
            { nome: 'nova', rotulo: 'Nova senha' },
            { nome: 'confirmar', rotulo: 'Confirmar nova senha' },
          ].map((campo) => (
            <Campo key={campo.nome} rotulo={campo.rotulo} erro={erros[campo.nome]}>
              {(id, erroId) => (
                <input
                  id={id}
                  type="password"
                  name={campo.nome}
                  autoComplete={campo.nome === 'atual' ? 'current-password' : 'new-password'}
                  aria-invalid={Boolean(erros[campo.nome])}
                  aria-describedby={erroId}
                />
              )}
            </Campo>
          ))}
          <Button disabled={senha.isPending}>Atualizar senha</Button>
          {senha.isError && <Falha erro={senha.error} />}
          {senha.isSuccess && (
            <p role="status" className="mensagem">
              Senha atualizada.
            </p>
          )}
        </form>
      </div>
      <aside className="painel-resumo">
        <h2>Sua identidade, sua coleção.</h2>
        <img
          src="/imagens/colecao-0.webp"
          width="300"
          height="300"
          alt="Personagem da coleção Kurio"
        />
        <p className="descricao">
          Mantenha seus dados atualizados para personalizar sua experiência.
        </p>
      </aside>
    </div>
  );
}
/** Consulta o perfil protegido, inclusive em acesso direto e refresh. */
export function PerfilColecionador() {
  const { perfil } = useSessao();
  const consulta = useQuery({
    queryKey: ['perfil', perfil?.id],
    queryFn: ({ signal }) => consultar('/perfil', perfilSchema, signal),
  });
  return (
    <>
      <NavegacaoConta />
      <h1 className="titulo-pagina">Meu perfil</h1>
      {consulta.isPending ? (
        <Esqueleto detalhe />
      ) : consulta.isError ? (
        <Falha erro={consulta.error} tentar={() => void consulta.refetch()} />
      ) : (
        <FormularioPerfil perfil={consulta.data} />
      )}
    </>
  );
}

/** Cadastro e edição usam o mesmo contrato; a API mantém exatamente uma carteira principal. */
function FormularioCarteira({ carteira, concluir }: { carteira?: Carteira; concluir: () => void }) {
  const [erros, definirErros] = useState<Record<string, string>>({});
  const salvar = useMutation({
    mutationFn: (dados: Carteira) =>
      alterar(carteira ? 'PATCH' : 'POST', '/carteiras', dados, z.array(carteiraSchema)),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: ['carteiras'] });
      concluir();
    },
  });
  /** Valida endereço hexadecimal, nome e rede antes da mutation tipada. */
  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = new FormData(evento.currentTarget);
    const resultado = carteiraSchema.safeParse({
      ...Object.fromEntries(formulario),
      id: carteira?.id ?? crypto.randomUUID(),
      principal: formulario.has('principal'),
    });
    if (!resultado.success) {
      definirErros(
        Object.fromEntries(
          resultado.error.issues.map((item) => [String(item.path[0]), item.message]),
        ),
      );
      return;
    }
    definirErros({});
    salvar.mutate(resultado.data);
  }
  return (
    <form className="painel-resumo mt-6" onSubmit={enviar} noValidate>
      <h2>{carteira ? 'Editar carteira' : 'Nova carteira'}</h2>
      <Campo rotulo="Nome da carteira" erro={erros.nome}>
        {(id, erroId) => (
          <input
            id={id}
            name="nome"
            defaultValue={carteira?.nome}
            aria-invalid={Boolean(erros.nome)}
            aria-describedby={erroId}
          />
        )}
      </Campo>
      <Campo rotulo="Endereço da carteira" erro={erros.endereco}>
        {(id, erroId) => (
          <input
            id={id}
            name="endereco"
            defaultValue={carteira?.endereco}
            placeholder="0x…"
            aria-invalid={Boolean(erros.endereco)}
            aria-describedby={erroId}
          />
        )}
      </Campo>
      <Campo rotulo="Rede da carteira">
        {(id) => (
          <select id={id} name="rede" defaultValue={carteira?.rede ?? 'Ethereum'}>
            <option>Ethereum</option>
            <option>Polygon</option>
          </select>
        )}
      </Campo>
      <Campo rotulo="Tipo de carteira">
        {(id) => (
          <select id={id} name="tipo" defaultValue={carteira?.tipo ?? 'MetaMask'}>
            <option>MetaMask</option>
            <option>Coinbase Wallet</option>
            <option>WalletConnect</option>
          </select>
        )}
      </Campo>
      <label className="flex gap-3 my-5">
        <input type="checkbox" name="principal" defaultChecked={carteira?.principal} />
        Usar como carteira principal
      </label>
      <div className="flex gap-3">
        <Button disabled={salvar.isPending}>Salvar carteira</Button>
        <Button type="button" variant="ghost" onClick={concluir}>
          Cancelar
        </Button>
      </div>
      {salvar.isError && <Falha erro={salvar.error} />}
    </form>
  );
}
/** Carteiras persistidas são a única origem das opções disponíveis no checkout. */
export function Carteiras() {
  const { perfil } = useSessao();
  const carteiras = useQuery({
    queryKey: ['carteiras', perfil?.id],
    queryFn: ({ signal }) => consultar('/carteiras', z.array(carteiraSchema), signal),
  });
  const [edicao, definirEdicao] = useState<Carteira | 'nova' | null>(null);
  return (
    <>
      <NavegacaoConta />
      <h1 className="titulo-pagina">Minhas carteiras</h1>
      <p className="descricao">
        Gerencie sua carteira principal e secundária. Endereços e conexões são fictícios.
      </p>
      {carteiras.isPending ? (
        <Esqueleto />
      ) : carteiras.isError ? (
        <Falha erro={carteiras.error} tentar={() => void carteiras.refetch()} />
      ) : (
        <>
          <div className="grade-carteiras">
            {carteiras.data.map((carteira) => (
              <article className="painel-resumo" key={carteira.id}>
                <Wallet size={28} />
                <p className="sobretitulo mt-5">
                  {carteira.principal ? 'PRINCIPAL' : 'SECUNDÁRIA'}
                </p>
                <h2>{carteira.nome}</h2>
                <p className="endereco">{carteira.endereco}</p>
                <p>
                  {carteira.tipo} · {carteira.rede}
                </p>
                <Button variant="outline" onClick={() => definirEdicao(carteira)}>
                  <Pencil size={16} />
                  Editar {carteira.nome}
                </Button>
              </article>
            ))}
          </div>
          {carteiras.data.length < 2 && (
            <Button className="mt-5" onClick={() => definirEdicao('nova')}>
              <Plus size={16} />
              Adicionar carteira
            </Button>
          )}
          {edicao && (
            <FormularioCarteira
              key={typeof edicao === 'string' ? edicao : edicao.id}
              carteira={edicao === 'nova' ? undefined : edicao}
              concluir={() => definirEdicao(null)}
            />
          )}
        </>
      )}
    </>
  );
}

/** Histórico dá acesso aos estados persistidos sem criar uma nova tentativa de compra. */
export function MeusPedidos() {
  const { perfil } = useSessao();
  const pedidos = useQuery({
    queryKey: ['pedidos', perfil?.id],
    queryFn: ({ signal }) => consultar('/pedidos', z.array(pedidoSchema), signal),
  });
  return (
    <>
      <NavegacaoConta />
      <h1 className="titulo-pagina">Meus pedidos</h1>
      {pedidos.isPending ? (
        <Esqueleto />
      ) : pedidos.isError ? (
        <Falha erro={pedidos.error} tentar={() => void pedidos.refetch()} />
      ) : pedidos.data.length ? (
        <div className="grade-carteiras">
          {pedidos.data.map((pedido) => (
            <Link
              className="painel-resumo"
              to="/pedido/$pedidoId"
              params={{ pedidoId: pedido.id }}
              key={pedido.id}
            >
              <h2>{pedido.id}</h2>
              <p>Estado: {pedido.estado}</p>
              <p>{pedido.cotacao.itens.length} obra(s) · Ver pedido</p>
            </Link>
          ))}
        </div>
      ) : (
        <p className="vazio">Você ainda não possui pedidos.</p>
      )}
    </>
  );
}
