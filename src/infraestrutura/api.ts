/** Cliente REST único. Tokens fictícios são persistidos apenas para a sessão da demonstração. */
import axios from 'axios';
import { QueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { perfilSchema } from '../dominio/contratos';

const mensagemApiSchema = z.object({ mensagem: z.string() });

export const cache = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 15000, retry: false, refetchOnWindowFocus: true },
    mutations: { retry: false },
  },
});
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api', timeout: 4000 });
let prepararTransporte: (() => Promise<void>) | undefined;
/** Permite ao bootstrap aguardar o transporte sem colocar regras da simulação no cliente HTTP. */
export function definirPreparacaoTransporte(preparar: () => Promise<void>): void {
  prepararTransporte = preparar;
}
/** Retorna a credencial fictícia atual sem acessar qualquer serviço real. */
export function obterToken(): string {
  return localStorage.getItem('kurio.token') ?? '';
}
/** Mantém um identificador de visitante independente das contas autenticadas. */
function obterVisitante(): string {
  let visitante = localStorage.getItem('kurio.visitante');
  if (!visitante) {
    visitante = crypto.randomUUID();
    localStorage.setItem('kurio.visitante', visitante);
  }
  return visitante;
}
api.interceptors.request.use(async (configuracao) => {
  // Captura a identidade antes de aguardar: uma troca de conta não pode reatribuir esta operação.
  const token = obterToken();
  if (token) configuracao.headers.Authorization = `Bearer ${token}`;
  configuracao.headers['X-Visitante'] = obterVisitante();
  await prepararTransporte?.();
  return configuracao;
});
api.interceptors.response.use(
  (resposta) => resposta,
  (erro: unknown) => {
    if (axios.isAxiosError(erro) && erro.response?.status === 401)
      window.dispatchEvent(new Event('kurio:sessao-expirada'));
    return Promise.reject(erro);
  },
);

/** Toda resposta externa é unknown até ser validada pelo schema correspondente. */
export async function consultar<T>(
  caminho: string,
  esquema: z.ZodType<T>,
  sinal?: AbortSignal,
): Promise<T> {
  // O worker pode parar entre o handshake e o fetch. Só leituras repetem uma resposta da hospedagem.
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    try {
      const resposta = await api.get<unknown>(caminho, { signal: sinal });
      if (
        prepararTransporte &&
        tentativa === 0 &&
        typeof resposta.data === 'string' &&
        /^\s*</.test(resposta.data)
      )
        continue;
      return esquema.parse(resposta.data);
    } catch (erro) {
      if (
        prepararTransporte &&
        tentativa === 0 &&
        axios.isAxiosError(erro) &&
        erro.response?.status === 404 &&
        !mensagemApiSchema.safeParse(erro.response.data).success
      )
        continue;
      throw erro;
    }
  }
  throw new Error('Não foi possível retomar a consulta. Tente novamente.');
}
/** Centraliza mutations HTTP sem fornecer dados fictícios ao chamador. */
export async function alterar<T>(
  metodo: 'POST' | 'PATCH' | 'DELETE',
  caminho: string,
  dados: unknown,
  esquema: z.ZodType<T>,
  chave?: string,
): Promise<T> {
  const resposta = await api.request<unknown>({
    method: metodo,
    url: caminho,
    data: dados,
    headers: chave ? { 'Idempotency-Key': chave } : undefined,
  });
  return esquema.parse(resposta.data);
}
/** Mantém a sessão coerente e cancela respostas privadas antes de limpar o cache. */
export async function trocarSessao(token: string): Promise<void> {
  await cache.cancelQueries();
  cache.clear();
  if (token) localStorage.setItem('kurio.token', token);
  else {
    localStorage.removeItem('kurio.token');
    localStorage.setItem('kurio.visitante', crypto.randomUUID());
  }
  window.dispatchEvent(new Event('kurio:sessao-alterada'));
}
/** Recupera a sessão na proteção das rotas e na inicialização da interface. */
export async function buscarSessao() {
  return obterToken() ? consultar('/sessao', perfilSchema) : null;
}
/** Extrai somente mensagens estruturadas da API; falhas de transporte recebem orientação útil. */
export function mensagemErro(erro: unknown): string {
  if (erro instanceof z.ZodError)
    return 'A resposta recebida não pôde ser validada. Tente novamente.';
  if (axios.isAxiosError(erro)) {
    const resultado = mensagemApiSchema.safeParse(erro.response?.data);
    if (resultado.success) return resultado.data.mensagem;
    if (erro.response)
      return `O serviço retornou um erro HTTP ${erro.response.status}. Tente novamente.`;
    return erro.code === 'ECONNABORTED'
      ? 'A resposta demorou. Você pode tentar novamente com segurança.'
      : 'Não foi possível conectar. Verifique a conexão e tente novamente.';
  }
  return erro instanceof Error ? erro.message : 'Não foi possível concluir a operação.';
}
