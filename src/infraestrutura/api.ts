/** Cliente REST único. Tokens fictícios são persistidos apenas para a sessão da demonstração. */
import axios from 'axios';
import { QueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { perfilSchema } from '../dominio/contratos';

export const cache = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 15000, retry: false, refetchOnWindowFocus: true },
    mutations: { retry: false },
  },
});
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api', timeout: 4000 });
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
api.interceptors.request.use((configuracao) => {
  const token = obterToken();
  if (token) configuracao.headers.Authorization = `Bearer ${token}`;
  configuracao.headers['X-Visitante'] = obterVisitante();
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
  const resposta = await api.get<unknown>(caminho, { signal: sinal });
  return esquema.parse(resposta.data);
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
  if (axios.isAxiosError(erro)) {
    const resultado = z.object({ mensagem: z.string() }).safeParse(erro.response?.data);
    if (resultado.success) return resultado.data.mensagem;
    return erro.code === 'ECONNABORTED'
      ? 'A resposta demorou. Você pode tentar novamente com segurança.'
      : 'Não foi possível conectar. Verifique a conexão e tente novamente.';
  }
  return erro instanceof Error ? erro.message : 'Não foi possível concluir a operação.';
}
