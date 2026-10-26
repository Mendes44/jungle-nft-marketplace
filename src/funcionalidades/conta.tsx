/** Autenticação e conta do colecionador com validação nas duas fronteiras da API. */
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import * as Dialog from '@radix-ui/react-dialog';
import { Image as IconeImagem } from 'lucide-react';
import {
  cadastroSchema,
  carteiraSchema,
  dadosCarteiraSchema,
  dadosPerfilSchema,
  pedidoSchema,
  perfilSchema,
  type Carteira,
  type Perfil,
} from '../dominio/contratos';
import { completarEns } from '../dominio/nomes';
import { alterar, cache, consultar, trocarSessao } from '../infraestrutura/api';
import { useSessao } from '../infraestrutura/sessao';
import { Button } from '../componentes/ui/button';
import { Campo, Dialogo, Esqueleto, Falha } from '../componentes/comuns';
import { EntradaEns, EntradaSenha } from '../componentes/controles';
import { IconeOriginal } from '../componentes/vitrine';
import { Inicio } from './catalogo';

/** Aceita apenas rotas locais para o retorno depois de autenticar. */
function retornoSeguro(retorno: string) {
  return retorno.startsWith('/') &&
    !retorno.startsWith('//') &&
    !retorno.startsWith('/login') &&
    !retorno.startsWith('/cadastro')
    ? retorno
    : '/';
}
/** Os provedores externos do frame explicam sua indisponibilidade sem simular autenticação bem-sucedida. */
function AcessoExterno({ provedor }: { provedor: 'Google' | 'Facebook' }) {
  return (
    <Dialogo
      titulo={`Continuar com ${provedor}`}
      descricao="Autenticação externa indisponível nesta demonstração."
      gatilho={
        <button type="button" className="acesso-externo">
          <img src={`/icones/acesso-${provedor.toLowerCase()}.svg`} width="20" height="20" alt="" />
          Continuar com {provedor}
        </button>
      }
    >
      <p>
        Use seu e-mail e senha ou crie uma conta para continuar. Nenhum dado foi enviado ao
        provedor.
      </p>
    </Dialogo>
  );
}
/** Login e cadastro preservam o destino original e usam a composição dos respectivos frames. */
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
  /** Confere os campos e a confirmação antes da mutation de autenticação. */
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
        <Inicio />
      </div>
      <Dialog.Root
        open
        onOpenChange={(aberto) => {
          if (!aberto) void navegar({ href: retornoSeguro(retorno ?? '/') });
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="autenticacao-fundo" />
          <Dialog.Content
            className={`autenticacao-conteudo ${cadastro ? 'cadastro-conteudo' : 'login-conteudo'}`}
          >
            <Dialog.Title className="sr-only">
              {cadastro ? 'Criar conta de colecionador' : 'Acessar sua conta'}
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              Entre ou cadastre-se para gerenciar suas obras e carteiras.
            </Dialog.Description>
            <Dialog.Close asChild>
              <button type="button" className="dialogo-fechar" aria-label="Fechar autenticação">
                <IconeOriginal nome="fechar" tamanho={20} />
              </button>
            </Dialog.Close>
            <div className="marca-autenticacao" aria-hidden="true">
              KURIO
            </div>
            <div className="abas-autenticacao">
              <Link
                className={!cadastro ? 'ativo' : ''}
                to="/login"
                search={{ retorno: retorno ?? '/' }}
              >
                Entrar
              </Link>
              <span>|</span>
              <Link
                className={cadastro ? 'ativo' : ''}
                to="/cadastro"
                search={{ retorno: retorno ?? '/' }}
              >
                Criar conta
              </Link>
            </div>
            <h1 className="titulo-autenticacao-movel">
              {cadastro ? 'Criar perfil de colecionador' : 'Entrar'}
            </h1>
            <p className="descricao-autenticacao">
              {cadastro
                ? 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.'
                : 'Entre para gerenciar sua carteira, coleção e perfil de criador.'}
            </p>
            {motivo === 'sessao-expirada' && (
              <p className="mensagem" role="status">
                Sua sessão expirou. Entre novamente para continuar de onde parou.
              </p>
            )}
            <form onSubmit={enviar} noValidate>
              {cadastro && (
                <Campo rotulo="Nome completo" erro={erros.nome}>
                  {(id, erroId) => (
                    <input
                      id={id}
                      name="nome"
                      placeholder="Nome de usuário"
                      autoComplete="name"
                      required
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
                    placeholder={cadastro ? 'Digite seu e-mail' : 'contato@email.com'}
                    autoComplete="email"
                    required
                    aria-invalid={Boolean(erros.email)}
                    aria-describedby={erroId}
                  />
                )}
              </Campo>
              <Campo rotulo="Senha" erro={erros.senha}>
                {(id, erroId) => (
                  <EntradaSenha
                    id={id}
                    nome="senha"
                    rotulo="Senha"
                    placeholder={cadastro ? 'Senha' : '***********'}
                    autocomplete={cadastro ? 'new-password' : 'current-password'}
                    invalido={Boolean(erros.senha)}
                    erroId={erroId}
                  />
                )}
              </Campo>
              {cadastro && (
                <Campo rotulo="Confirmar senha" erro={erros.confirmacao}>
                  {(id, erroId) => (
                    <EntradaSenha
                      id={id}
                      nome="confirmacao"
                      rotulo="Confirmar senha"
                      placeholder="Confirmar senha"
                      autocomplete="new-password"
                      invalido={Boolean(erros.confirmacao)}
                      erroId={erroId}
                    />
                  )}
                </Campo>
              )}
              {!cadastro && (
                <Dialogo
                  titulo="Recuperar senha"
                  descricao="A recuperação por e-mail não está conectada nesta demonstração."
                  gatilho={
                    <button type="button" className="esqueceu-senha">
                      Esqueceu a senha?
                    </button>
                  }
                >
                  <p>
                    As contas fictícias usam a senha Colecao123. Você também pode criar outra conta
                    de teste.
                  </p>
                </Dialogo>
              )}
              {autenticar.isError && <Falha erro={autenticar.error} />}
              <Button className="enviar-autenticacao" disabled={autenticar.isPending}>
                {autenticar.isPending ? (
                  'Aguarde…'
                ) : cadastro ? (
                  <>
                    <span className="texto-desktop">Criar conta</span>
                    <span className="texto-mobile">Criar perfil</span>
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>
            <div className="separador-acesso">
              <span>Ou continue com</span>
            </div>
            <div className="provedores-acesso">
              <AcessoExterno provedor="Google" />
              <AcessoExterno provedor="Facebook" />
            </div>
            <p className="alternar-autenticacao">
              {cadastro ? 'Já tem uma conta? ' : 'Novo na Kurio? '}
              <Link to={cadastro ? '/login' : '/cadastro'} search={{ retorno: retorno ?? '/' }}>
                {cadastro ? 'Entre' : 'Crie uma conta'}
              </Link>
            </p>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
/** Entrada separada para o carregamento da rota de cadastro. */
export function Cadastro() {
  return <Autenticacao cadastro />;
}

/** A navegação mantém as rotas reais e identifica os recursos editoriais ainda sem backend. */
export function NavegacaoConta() {
  const navegar = useNavigate();
  const sair = useMutation({
    mutationFn: () => alterar('POST', '/logout', {}, z.object({ sucesso: z.boolean() })),
    onSuccess: async () => {
      await trocarSessao('');
      await navegar({ to: '/' });
    },
  });
  return (
    <nav className="navegacao-conta" aria-label="Sua conta">
      <h2>Meu perfil</h2>
      <Link to="/perfil" activeProps={{ className: 'ativo' }}>
        <img src="/icones/conta-perfil.svg" width="20" height="20" alt="" />
        Dados do perfil
      </Link>
      <Link to="/carteiras" activeProps={{ className: 'ativo' }}>
        <img src="/icones/conta-carteiras.svg" width="20" height="20" alt="" />
        Carteiras
      </Link>
      <Link to="/pedidos" activeProps={{ className: 'ativo' }}>
        <img src="/icones/conta-atividade.svg" width="20" height="20" alt="" />
        Atividade
      </Link>
      {[
        { nome: 'Lista de interesse', icone: 'interesse' },
        { nome: 'Ofertas', icone: 'ofertas' },
        { nome: 'Arquivos baixados', icone: 'downloads' },
        { nome: 'Suporte', icone: 'suporte' },
      ].map(({ nome, icone }) => (
        <Dialogo
          key={nome}
          titulo={nome}
          descricao="Recurso complementar do marketplace."
          gatilho={
            <button type="button">
              <img src={`/icones/conta-${icone}.svg`} width="20" height="20" alt="" />
              {nome}
            </button>
          }
        >
          <p>
            {nome === 'Lista de interesse'
              ? 'Os favoritos são salvos nos cartões das obras e permanecem associados à sua conta.'
              : 'Esta seção não faz parte dos fluxos integrados da demonstração.'}
          </p>
        </Dialogo>
      ))}
      <button
        type="button"
        className="sair-conta"
        disabled={sair.isPending}
        onClick={() => sair.mutate()}
      >
        <img src="/icones/conta-sair.svg" width="20" height="20" alt="" />
        Sair
      </button>
      {sair.isError && <Falha erro={sair.error} />}
    </nav>
  );
}

/** O perfil e a senha usam endpoints distintos; o envio informa qual operação foi concluída. */
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
  /** Restringe o upload a imagens raster pequenas; o servidor valida novamente o data URL. */
  function lerAvatar(arquivo?: File) {
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
  /** Campos de senha vazios preservam a senha atual; se preenchidos, os três são conferidos. */
  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const valores = Object.fromEntries(new FormData(formulario));
    const resultado = dadosPerfilSchema.safeParse({
      ...valores,
      ens: completarEns(String(valores.ens ?? '')),
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
    const alterarSenha = Boolean(valores.atual || valores.nova || valores.confirmar);
    const dadosSenha = z
      .object({
        atual: z.string().min(1, 'Informe sua senha atual.'),
        nova: cadastroSchema.shape.senha,
        confirmar: z.string(),
      })
      .refine((dados) => dados.nova === dados.confirmar, {
        message: 'As senhas precisam ser iguais.',
        path: ['confirmar'],
      })
      .safeParse(valores);
    if (alterarSenha && !dadosSenha.success) {
      definirErros(
        Object.fromEntries(
          dadosSenha.error.issues.map((item) => [String(item.path[0]), item.message]),
        ),
      );
      return;
    }
    definirErros({});
    try {
      await salvar.mutateAsync(resultado.data);
      if (alterarSenha && dadosSenha.success) {
        await senha.mutateAsync(dadosSenha.data);
        for (const nome of ['atual', 'nova', 'confirmar']) {
          const entrada = formulario.elements.namedItem(nome);
          if (entrada instanceof HTMLInputElement) entrada.value = '';
        }
      }
    } catch {
      /* Cada mutation apresenta o erro retornado pela API abaixo do formulário. */
    }
  }
  return (
    <div className="conteudo-conta">
      <h1>Perfil do colecionador</h1>
      <form className="formulario-perfil" onSubmit={(evento) => void enviar(evento)} noValidate>
        <div className="campos-perfil">
          {[
            { nome: 'nome', rotulo: 'Nome de exibição', valor: perfil.nome },
            { nome: 'apelido', rotulo: 'Nome de usuário', valor: perfil.apelido },
            { nome: 'email', rotulo: 'E-mail', valor: perfil.email },
          ].map((campo) => (
            <Campo obrigatorio key={campo.nome} rotulo={campo.rotulo} erro={erros[campo.nome]}>
              {(id, erroId) => (
                <input
                  id={id}
                  name={campo.nome}
                  type={campo.nome === 'email' ? 'email' : 'text'}
                  defaultValue={campo.valor}
                  aria-invalid={Boolean(erros[campo.nome])}
                  aria-describedby={erroId}
                />
              )}
            </Campo>
          ))}
          <Campo rotulo="Nome ENS" obrigatorio erro={erros.ens}>
            {(id, erroId) => (
              <EntradaEns
                id={id}
                valorInicial={perfil.ens}
                invalido={Boolean(erros.ens)}
                erroId={erroId}
              />
            )}
          </Campo>
          <Campo rotulo="Apelido da carteira" obrigatorio erro={erros.nomeCarteira}>
            {(id, erroId) => (
              <input
                id={id}
                name="nomeCarteira"
                defaultValue={perfil.nomeCarteira}
                aria-describedby={erroId}
              />
            )}
          </Campo>
          <div className="avatar-editor">
            <span>Avatar</span>
            <div>
              {avatar ? (
                <img src={avatar} width="50" height="50" alt="Seu avatar" />
              ) : (
                <span className="avatar-vazio">
                  <IconeImagem size={20} />
                </span>
              )}
              <label className="alterar-avatar">
                Alterar
                <input
                  type="file"
                  aria-label="Alterar avatar"
                  aria-invalid={Boolean(erroAvatar)}
                  aria-describedby={erroAvatar ? 'erro-avatar' : undefined}
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(evento) => lerAvatar(evento.target.files?.[0])}
                />
              </label>
              <button type="button" onClick={() => definirAvatar('')}>
                Remover
              </button>
            </div>
            {erroAvatar && (
              <small id="erro-avatar" className="erro" role="alert">
                {erroAvatar}
              </small>
            )}
          </div>
        </div>
        <details className="biografia-perfil">
          <summary>Editar biografia</summary>
          <Campo rotulo="Biografia" erro={erros.biografia}>
            {(id, erroId) => (
              <textarea
                id={id}
                name="biografia"
                defaultValue={perfil.biografia}
                maxLength={300}
                rows={3}
                aria-describedby={erroId}
              />
            )}
          </Campo>
        </details>
        <fieldset className="campos-senha">
          <legend>Alterar senha</legend>
          {[
            { nome: 'atual', rotulo: 'Senha atual' },
            { nome: 'nova', rotulo: 'Nova senha' },
            { nome: 'confirmar', rotulo: 'Confirmar nova senha' },
          ].map((campo) => (
            <Campo key={campo.nome} rotulo={campo.rotulo} erro={erros[campo.nome]}>
              {(id, erroId) => (
                <EntradaSenha
                  id={id}
                  nome={campo.nome}
                  rotulo={campo.rotulo}
                  placeholder=""
                  autocomplete={campo.nome === 'atual' ? 'current-password' : 'new-password'}
                  erroId={erroId}
                  invalido={Boolean(erros[campo.nome])}
                />
              )}
            </Campo>
          ))}
        </fieldset>
        <Button className="salvar-perfil" disabled={salvar.isPending || senha.isPending}>
          Salvar
        </Button>
        {salvar.isError && <Falha erro={salvar.error} />}
        {senha.isError && <Falha erro={senha.error} />}
        {salvar.isSuccess && (
          <p role="status" className="mensagem">
            Perfil atualizado.{senha.isSuccess && ' Senha atualizada.'}
          </p>
        )}
      </form>
    </div>
  );
}
/** Recupera o perfil protegido também em acesso direto e refresh. */
export function PerfilColecionador() {
  const { perfil } = useSessao();
  const consulta = useQuery({
    queryKey: ['perfil', perfil?.id],
    queryFn: ({ signal }) => consultar('/perfil', perfilSchema, signal),
  });
  return (
    <>
      <NavegacaoConta />
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

/** Campos adicionais do Figma são persistidos junto da carteira, sem alterar seus identificadores. */
function FormularioCarteira({
  carteira,
  principal = false,
  concluir,
}: {
  carteira?: Carteira;
  principal?: boolean;
  concluir: () => void;
}) {
  const { perfil } = useSessao();
  const [erros, definirErros] = useState<Record<string, string>>({});
  const salvar = useMutation({
    mutationFn: (dados: Carteira) =>
      alterar(carteira ? 'PATCH' : 'POST', '/carteiras', dados, z.array(carteiraSchema)),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: ['carteiras'] });
      concluir();
    },
  });
  /** Mantém endereço e rede tipados e normaliza o domínio antes de persistir. */
  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = new FormData(evento.currentTarget);
    const valores = Object.fromEntries(formulario);
    const resultado = dadosCarteiraSchema.safeParse({
      ...valores,
      ens: completarEns(String(valores.ens ?? '')),
      id: carteira?.id ?? crypto.randomUUID(),
      principal: principal || formulario.has('principal'),
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
  const campos = [
    { nome: 'nome', rotulo: 'Nome de exibição' },
    { nome: 'apelido', rotulo: 'Apelido da carteira' },
    { nome: 'endereco', rotulo: 'Endereço da carteira' },
    { nome: 'nomePerfil', rotulo: 'Nome do perfil' },
    { nome: 'enderecoSecundario', rotulo: 'Endereço secundário (opcional)' },
    { nome: 'indicacao', rotulo: 'Código de indicação' },
    { nome: 'email', rotulo: 'E-mail' },
  ] as const;
  return (
    <form className="formulario-carteira" onSubmit={enviar} noValidate>
      <div className="campos-carteira">
        {campos.map((campo) => (
          <Campo
            key={campo.nome}
            classe={`carteira-${campo.nome}`}
            rotulo={campo.rotulo}
            obrigatorio={campo.nome !== 'enderecoSecundario'}
            erro={erros[campo.nome]}
          >
            {(id, erroId) => (
              <input
                id={id}
                name={campo.nome}
                type={campo.nome === 'email' ? 'email' : 'text'}
                defaultValue={
                  carteira?.[campo.nome] ??
                  (campo.nome === 'email'
                    ? perfil?.email
                    : campo.nome === 'nomePerfil'
                      ? perfil?.apelido
                      : '')
                }
                placeholder={
                  campo.nome === 'endereco'
                    ? 'Endereço 0x da carteira'
                    : campo.nome === 'enderecoSecundario'
                      ? 'ENS ou carteira secundária (opcional)'
                      : ''
                }
                aria-describedby={erroId}
                aria-invalid={Boolean(erros[campo.nome])}
              />
            )}
          </Campo>
        ))}
        <Campo classe="carteira-rede" rotulo="Rede da carteira" obrigatorio>
          {(id) => (
            <select id={id} name="rede" defaultValue={carteira?.rede ?? 'Ethereum'}>
              <option>Ethereum</option>
              <option>Polygon</option>
            </select>
          )}
        </Campo>
        <Campo classe="carteira-tipo" rotulo="Tipo de carteira" obrigatorio>
          {(id) => (
            <select id={id} name="tipo" defaultValue={carteira?.tipo ?? 'MetaMask'}>
              <option>MetaMask</option>
              <option>Coinbase Wallet</option>
              <option>WalletConnect</option>
            </select>
          )}
        </Campo>
        <Campo classe="carteira-ens" rotulo="Nome ENS" obrigatorio erro={erros.ens}>
          {(id, erroId) => (
            <EntradaEns
              id={id}
              valorInicial={carteira?.ens ?? perfil?.ens}
              erroId={erroId}
              invalido={Boolean(erros.ens)}
            />
          )}
        </Campo>
      </div>
      {!principal && (
        <label className="tornar-principal">
          <input type="checkbox" name="principal" defaultChecked={carteira?.principal} />
          Usar como carteira principal
        </label>
      )}
      <Button disabled={salvar.isPending}>Salvar carteira</Button>
      {salvar.isError && <Falha erro={salvar.error} />}
      {salvar.isSuccess && (
        <p role="status" className="mensagem">
          Carteira salva.
        </p>
      )}
    </form>
  );
}
/** Mantém uma principal e até uma secundária; os mesmos registros alimentam o pagamento. */
export function Carteiras() {
  const { perfil } = useSessao();
  const carteiras = useQuery({
    queryKey: ['carteiras', perfil?.id],
    queryFn: ({ signal }) => consultar('/carteiras', z.array(carteiraSchema), signal),
  });
  const [adicionando, definirAdicionando] = useState(false);
  const principal = carteiras.data?.find((item) => item.principal);
  const secundaria = carteiras.data?.find((item) => !item.principal);
  return (
    <>
      <NavegacaoConta />
      <div className="conteudo-conta conteudo-carteiras">
        <h1>Carteira principal</h1>
        <p className="descricao-carteiras">
          Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.
        </p>
        {carteiras.isPending ? (
          <Esqueleto />
        ) : carteiras.isError ? (
          <Falha erro={carteiras.error} tentar={() => void carteiras.refetch()} />
        ) : (
          <>
            <FormularioCarteira
              key={principal?.id ?? 'principal'}
              carteira={principal}
              principal
              concluir={() => definirAdicionando(false)}
            />
            <section className="carteira-secundaria">
              <div className="titulo-carteira-secundaria">
                <h2>Carteira secundária</h2>
                {!secundaria && (
                  <button type="button" onClick={() => definirAdicionando(!adicionando)}>
                    Adicionar carteira
                  </button>
                )}
              </div>
              {!secundaria && !adicionando && (
                <p>Você ainda não adicionou uma carteira secundária.</p>
              )}
              {(secundaria || adicionando) && (
                <FormularioCarteira
                  key={secundaria?.id ?? 'nova'}
                  carteira={secundaria}
                  concluir={() => definirAdicionando(false)}
                />
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}
/** O histórico abre os pedidos persistidos sem gerar outra tentativa de compra. */
export function MeusPedidos() {
  const { perfil } = useSessao();
  const pedidos = useQuery({
    queryKey: ['pedidos', perfil?.id],
    queryFn: ({ signal }) => consultar('/pedidos', z.array(pedidoSchema), signal),
  });
  return (
    <>
      <NavegacaoConta />
      <div className="conteudo-conta">
        <h1>Meus pedidos</h1>
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
      </div>
    </>
  );
}
