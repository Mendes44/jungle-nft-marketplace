/** Operações REST de conta; regras e persistência ficam na camada de simulação. */
import { HttpResponse } from 'msw';
import { z } from 'zod';
import { cadastroSchema, carteiraSchema, dadosPerfilSchema } from '../dominio/contratos';
import { FalhaApi, hashSenha, mesclarVisitante, perfilPublico, salvarBanco } from './banco';
import type { ContextoRequisicao } from './contexto';
/** Autentica credenciais ou cria uma conta e mescla o carrinho visitante. */
export async function autenticarConta(contexto: ContextoRequisicao): Promise<Response> {
  const { banco, requisicao, caminho, lerCorpo } = contexto;

  const dados =
    caminho === '/cadastro'
      ? cadastroSchema.parse(await lerCorpo())
      : z.object({ email: z.email(), senha: z.string().min(1) }).parse(await lerCorpo());
  let usuario = banco.usuarios.find(
    (usuario) => usuario.email.toLowerCase() === dados.email.toLowerCase(),
  );
  const senhaHash = await hashSenha(dados.senha);
  if (caminho === '/cadastro') {
    if (usuario) throw new FalhaApi(409, 'Este e-mail já possui uma conta.');
    const cadastro = cadastroSchema.parse(dados);
    usuario = {
      id: crypto.randomUUID(),
      nome: cadastro.nome,
      email: cadastro.email.toLowerCase(),
      apelido: cadastro.nome.split(' ')[0],
      biografia: '',
      avatar: '/imagens/colecao-0.webp',
      senhaHash,
    };
    banco.usuarios.push(usuario);
  } else if (!usuario || usuario.senhaHash !== senhaHash)
    throw new FalhaApi(422, 'E-mail ou senha incorretos.');
  if (!usuario) throw new FalhaApi(422, 'Conta inválida.');
  const token = crypto.randomUUID();
  banco.sessoes[token] = { usuarioId: usuario.id, expiraEm: Date.now() + 60 * 60 * 1000 };
  mesclarVisitante(banco, requisicao.headers.get('X-Visitante') ?? '', usuario.id);
  salvarBanco(banco);
  return HttpResponse.json({ token, perfil: perfilPublico(usuario) });
}

/** Simula conexão, recusa ou desconexão de uma carteira pertencente à sessão. */
export async function alterarConexao(contexto: ContextoRequisicao): Promise<Response> {
  const { banco, requisicao, dono, lerCorpo } = contexto;

  const dados = z
    .object({ carteiraId: z.string(), acao: z.enum(['conectar', 'recusar', 'desconectar']) })
    .parse(await lerCorpo());
  const token = requisicao.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  const sessao = banco.sessoes[token];
  if (!sessao || !banco.carteiras[dono]?.some((carteira) => carteira.id === dados.carteiraId))
    throw new FalhaApi(422, 'Selecione uma carteira cadastrada.');
  sessao.carteiraId = dados.acao === 'conectar' ? dados.carteiraId : undefined;
  salvarBanco(banco);
  return HttpResponse.json({
    estado:
      dados.acao === 'conectar'
        ? 'conectada'
        : dados.acao === 'recusar'
          ? 'recusada'
          : 'desconectada',
    carteiraId: dados.carteiraId,
  });
}

/** Retorna exclusivamente os dados públicos da sessão válida. */
export async function consultarSessao(contexto: ContextoRequisicao): Promise<Response> {
  const { usuario } = contexto;

  if (!usuario) throw new FalhaApi(401, 'Sessão inválida.');
  return HttpResponse.json(perfilPublico(usuario));
}

/** Revoga o token atual na API simulada. */
export async function encerrarSessao(contexto: ContextoRequisicao): Promise<Response> {
  const { banco, requisicao } = contexto;

  const token = requisicao.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  delete banco.sessoes[token];
  salvarBanco(banco);
  return HttpResponse.json({ sucesso: true });
}

/** Valida dados e avatar, verifica conflitos e persiste o perfil. */
export async function alterarPerfil(contexto: ContextoRequisicao): Promise<Response> {
  const { banco, metodo, dono, usuario, lerCorpo } = contexto;
  if (!usuario) throw new FalhaApi(401, 'Sessão inválida.');

  if (metodo === 'PATCH') {
    const dados = dadosPerfilSchema.parse(await lerCorpo());
    if (banco.usuarios.some((outro) => outro.id !== dono && outro.email === dados.email))
      throw new FalhaApi(409, 'Este e-mail já está em uso.');
    if (
      dados.avatar &&
      !/^\/imagens\/[\w-]+\.(svg|webp)$|^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(
        dados.avatar,
      )
    )
      throw new FalhaApi(422, 'Avatar inválido. Use PNG, JPEG ou WebP.');
    Object.assign(usuario, dados);
    salvarBanco(banco);
  }
  return HttpResponse.json(perfilPublico(usuario));
}

/** Confere o hash atual e grava somente o hash da nova senha fictícia. */
export async function alterarSenha(contexto: ContextoRequisicao): Promise<Response> {
  const { banco, usuario, lerCorpo } = contexto;
  if (!usuario) throw new FalhaApi(401, 'Sessão inválida.');

  const dados = z
    .object({ atual: z.string(), nova: cadastroSchema.shape.senha })
    .parse(await lerCorpo());
  if ((await hashSenha(dados.atual)) !== usuario.senhaHash)
    throw new FalhaApi(422, 'A senha atual está incorreta.');
  usuario.senhaHash = await hashSenha(dados.nova);
  salvarBanco(banco);
  return HttpResponse.json({ sucesso: true });
}

/** Mantém até duas carteiras com endereço único e uma principal. */
export async function alterarCarteiras(contexto: ContextoRequisicao): Promise<Response> {
  const { banco, metodo, dono, lerCorpo } = contexto;

  const carteiras = (banco.carteiras[dono] ??= []);
  if (metodo === 'POST' || metodo === 'PATCH') {
    const carteira = carteiraSchema.parse(await lerCorpo());
    const existente = carteiras.findIndex((item) => item.id === carteira.id);
    if (
      carteiras.some(
        (item) =>
          item.endereco.toLowerCase() === carteira.endereco.toLowerCase() &&
          item.id !== carteira.id,
      )
    )
      throw new FalhaApi(409, 'Esta carteira já está cadastrada.');
    if (existente < 0 && carteiras.length >= 2)
      throw new FalhaApi(409, 'Você pode cadastrar uma carteira principal e uma secundária.');
    if (carteira.principal) for (const item of carteiras) item.principal = false;
    if (existente >= 0) carteiras[existente] = carteira;
    else carteiras.push({ ...carteira, principal: carteiras.length === 0 || carteira.principal });
    if (!carteiras.some((item) => item.principal)) carteiras[0].principal = true;
    salvarBanco(banco);
  }
  return HttpResponse.json(carteiras);
}
