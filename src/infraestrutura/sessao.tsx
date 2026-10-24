/** Sessão compartilhada; troca e expiração desmontam imediatamente os recursos privados. */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { buscarSessao, obterToken, trocarSessao } from './api';
import type { Perfil } from '../dominio/contratos';

const ContextoSessao = createContext<{ perfil: Perfil | null; token: string; carregando: boolean }>(
  { perfil: null, token: '', carregando: true },
);
/** Reage a mudanças de credenciais sem compartilhar query keys entre usuários. */
export function ProvedorSessao({ children }: { children: ReactNode }) {
  const [token, definirToken] = useState(obterToken);
  const sessao = useQuery({
    queryKey: ['sessao', token],
    queryFn: buscarSessao,
    enabled: Boolean(token),
  });
  useEffect(() => {
    let expirando = false;
    /** Reflete a sessão persistida e força os consumidores a encerrar subscriptions antigas. */
    function atualizar() {
      definirToken(obterToken());
      if (obterToken()) expirando = false;
    }
    /** Preserva a URL atual antes de encaminhar ao login pelo evento da aplicação. */
    function expirar() {
      if (obterToken() && !expirando) {
        expirando = true;
        void trocarSessao('').then(() => window.dispatchEvent(new Event('kurio:autenticar')));
      }
    }
    window.addEventListener('kurio:sessao-alterada', atualizar);
    window.addEventListener('kurio:sessao-expirada', expirar);
    return () => {
      window.removeEventListener('kurio:sessao-alterada', atualizar);
      window.removeEventListener('kurio:sessao-expirada', expirar);
    };
  }, []);
  return (
    <ContextoSessao.Provider
      value={{ perfil: sessao.data ?? null, token, carregando: Boolean(token) && sessao.isPending }}
    >
      {children}
    </ContextoSessao.Provider>
  );
}
/** Fornece somente o perfil público autenticado. */
export function useSessao() {
  return useContext(ContextoSessao);
}
