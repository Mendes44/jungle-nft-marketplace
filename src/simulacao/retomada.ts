/** Reativa o cliente MSW quando o navegador reinicia um service worker sem seu estado em memória. */

/** Compartilha o handshake entre requisições concorrentes e mantém os handlers e o banco intactos. */
export function criarPreparacaoTransporte(
  registro: ServiceWorkerRegistration,
): () => Promise<void> {
  let preparacao: Promise<void> | undefined;
  return () => {
    if (preparacao) return preparacao;
    const trabalhador = registro.active ?? navigator.serviceWorker.controller;
    if (!trabalhador)
      return Promise.reject(
        new Error('A demonstração ainda não está pronta. Recarregue a página.'),
      );
    preparacao = new Promise<void>((concluir, rejeitar) => {
      /** Libera listener e prazo tanto no sucesso quanto na falha do transporte. */
      function limpar() {
        navigator.serviceWorker.removeEventListener('message', receber);
        window.clearTimeout(prazo);
      }
      /** O protocolo público do worker confirma que esta aba voltou à lista de clientes ativos. */
      function receber(evento: MessageEvent<unknown>) {
        if (evento.source !== trabalhador || !evento.data || typeof evento.data !== 'object')
          return;
        if (!('type' in evento.data) || evento.data.type !== 'MOCKING_ENABLED') return;
        limpar();
        concluir();
      }
      const prazo = window.setTimeout(() => {
        limpar();
        rejeitar(new Error('A demonstração não respondeu. Tente novamente para reconectar.'));
      }, 2000);
      navigator.serviceWorker.addEventListener('message', receber);
      try {
        // Repetir MOCK_ACTIVATE é idempotente: não reinicia fixtures, sockets ou pedidos.
        trabalhador.postMessage('MOCK_ACTIVATE');
      } catch (erro) {
        limpar();
        rejeitar(erro);
      }
    }).finally(() => {
      preparacao = undefined;
    });
    return preparacao;
  };
}
