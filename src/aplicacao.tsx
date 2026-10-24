/** Montagem da árvore; seu download ocorre em paralelo ao MSW, mas as consultas só iniciam depois. */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { cache } from './infraestrutura/api';
import { ProvedorSessao } from './infraestrutura/sessao';
import { roteador } from './rotas';

/** Conecta os provedores depois que a rede simulada está pronta. */
export function montarAplicacao() {
  const raiz = document.getElementById('root');
  if (!raiz) throw new Error('Raiz da aplicação não encontrada.');
  ReactDOM.createRoot(raiz).render(
    <React.StrictMode>
      <QueryClientProvider client={cache}>
        <ProvedorSessao>
          <RouterProvider router={roteador} />
        </ProvedorSessao>
      </QueryClientProvider>
    </React.StrictMode>,
  );
}
