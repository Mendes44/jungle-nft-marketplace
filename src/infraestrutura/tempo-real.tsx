/** Reconciliação Socket.IO -> REST; eventos nunca carregam valores aceitos sem validação. */
import { useCallback, useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { eventoSchema } from '../dominio/contratos';
import { cache } from './api';
import { useSessao } from './sessao';
import { origemSocket } from './configuracao';

/** Escuta apenas a sessão ativa e elimina listeners, timers e conexão no cleanup. */
export function useTempoReal() {
  const { token, perfil } = useSessao();
  const [conectado, definirConectado] = useState(false);
  const [aviso, definirAviso] = useState<{ mensagem: string; id: number } | null>(null);
  const dispensarAviso = useCallback(() => definirAviso(null), []);
  useEffect(() => {
    let ativo = true;
    const versoes = new Map<string, number>();
    let socket: Socket | undefined;
    /** Conectar e reconectar exigem nova leitura dos recursos ativos pela API autoritativa. */
    function reconciliar() {
      if (ativo) {
        definirConectado(true);
        void cache.invalidateQueries();
      }
    }
    /** Invalida apenas eventos novos e do usuário correto; duplicatas não reaplicam efeitos. */
    function receber(nome: 'nft.updated' | 'order.updated', dados: unknown) {
      const resultado = eventoSchema.safeParse(dados);
      if (!ativo || !resultado.success) return;
      const evento = resultado.data;
      if (evento.usuarioId && evento.usuarioId !== perfil?.id) return;
      const chave = `${nome}:${evento.recursoId}`;
      if (evento.versao <= (versoes.get(chave) ?? 0)) return;
      versoes.set(chave, evento.versao);
      if (nome === 'nft.updated') {
        definirAviso({
          mensagem: 'Preço ou disponibilidade atualizado. Confira os valores antes de comprar.',
          id: Date.now(),
        });
        for (const recurso of ['catalogo', 'nft', 'carrinho', 'cotacao'])
          void cache.invalidateQueries({ queryKey: [recurso] });
      } else {
        void cache.invalidateQueries({ queryKey: ['pedido'] });
        void cache.invalidateQueries({ queryKey: ['pedidos'] });
        void cache.invalidateQueries({ queryKey: ['carrinho'] });
      }
    }
    /** A importação tardia captura o WebSocket já interceptado pelo MSW e permite startup paralelo. */
    async function iniciarSocket() {
      const { io } = await import('socket.io-client');
      if (!ativo) return;
      socket = io(origemSocket, {
        transports: ['websocket'],
        query: { token },
        reconnectionDelay: 800,
      });
      socket.on('connect', reconciliar);
      socket.on('disconnect', () => {
        if (ativo) definirConectado(false);
      });
      socket.on('nft.updated', (dados: unknown) => receber('nft.updated', dados));
      socket.on('order.updated', (dados: unknown) => receber('order.updated', dados));
    }
    void iniciarSocket();
    return () => {
      ativo = false;
      socket?.removeAllListeners();
      socket?.disconnect();
    };
  }, [token, perfil?.id]);
  return { conectado, aviso, dispensarAviso };
}
