/** Entrega Brotli no preview, como uma hospedagem estática otimizada, mantendo os mesmos arquivos. */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { brotliCompress, constants } from 'node:zlib';
import { promisify } from 'node:util';
import type { Plugin } from 'vite';

const comprimir = promisify(brotliCompress);
const tamanhoMinimo = 1024;
/** Pré-comprime somente texto; imagens WebP e fontes WOFF2 já usam formatos comprimidos. */
async function comprimirDiretorio(diretorio: string): Promise<void> {
  for (const entrada of await readdir(diretorio, { withFileTypes: true })) {
    const caminho = resolve(diretorio, entrada.name);
    if (entrada.isDirectory()) {
      await comprimirDiretorio(caminho);
      continue;
    }
    if (!/\.(js|css|html|svg|json)$/.test(entrada.name)) continue;
    const conteudo = await readFile(caminho);
    if (conteudo.length < tamanhoMinimo) continue;
    const comprimido = await comprimir(conteudo, {
      params: { [constants.BROTLI_PARAM_QUALITY]: 9 },
    });
    await writeFile(`${caminho}.br`, comprimido);
  }
}
/** O fallback do Vite permanece responsável pelas rotas e por clientes sem suporte a Brotli. */
export function compressaoDoBuild(): Plugin {
  let diretorioBuild = resolve('dist');
  let compilando = false;
  return {
    name: 'vite-plugin-compressao-build',
    configResolved(configuracao) {
      diretorioBuild = resolve(configuracao.root, configuracao.build.outDir);
      compilando = configuracao.command === 'build';
    },
    async closeBundle() {
      if (compilando) await comprimirDiretorio(diretorioBuild);
    },
    configurePreviewServer(servidor) {
      servidor.middlewares.use(async (requisicao, resposta, proximo) => {
        if (
          !requisicao.headers['accept-encoding']?.includes('br') ||
          !['GET', 'HEAD'].includes(requisicao.method ?? '')
        ) {
          proximo();
          return;
        }
        const caminhoUrl = new URL(requisicao.url ?? '/', 'http://localhost').pathname;
        if (
          (!caminhoUrl.startsWith('/assets/') && caminhoUrl !== '/mockServiceWorker.js') ||
          !/\.(js|css)$/.test(caminhoUrl)
        ) {
          proximo();
          return;
        }
        const caminho = resolve(diretorioBuild, `.${decodeURIComponent(caminhoUrl)}`);
        if (!caminho.startsWith(`${diretorioBuild}${sep}`)) {
          proximo();
          return;
        }
        try {
          const conteudo = await readFile(`${caminho}.br`);
          resposta.setHeader('Content-Encoding', 'br');
          resposta.setHeader('Vary', 'Accept-Encoding');
          resposta.setHeader(
            'Content-Type',
            caminho.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/javascript; charset=utf-8',
          );
          resposta.setHeader('Content-Length', conteudo.length);
          resposta.setHeader(
            'Cache-Control',
            caminhoUrl.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
          );
          resposta.end(requisicao.method === 'HEAD' ? undefined : conteudo);
        } catch {
          proximo();
        }
      });
    },
  };
}
