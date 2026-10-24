/** Confere o conteúdo estático publicado contra o build local e registra acesso direto às rotas. */
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';

const origem = process.env.URL_APLICACAO || 'https://kurio-jungle.vercel.app';
const htmlLocal = await readFile('dist/index.html', 'utf8');
const entradas = Array.from(
  htmlLocal.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g),
  (resultado) => resultado[1],
);
const arquivosDoBuild = (await readdir('dist/assets')).filter((nome) => /\.(js|css)$/.test(nome));
const caminhos = [
  ...new Set([
    ...entradas,
    ...arquivosDoBuild.map((nome) => `/assets/${nome}`),
    '/imagens/colecao-0.webp',
    '/imagens/colecao-1.webp',
    '/imagens/colecao-2.webp',
    '/imagens/colecao-3.webp',
    '/fontes/ibm-plex-mono-latin.woff2',
    '/fontes/ibm-plex-mono-negrito.woff2',
    '/mockServiceWorker.js',
  ]),
];
/** O hash compara os bytes após descompressão HTTP, independentemente do encoding da hospedagem. */
function resumir(conteudo) {
  return createHash('sha256').update(conteudo).digest('hex');
}
const arquivos = [];
for (const caminho of caminhos) {
  const resposta = await fetch(`${origem}${caminho}`);
  if (!resposta.ok) throw new Error(`Arquivo indisponível: ${caminho} (${resposta.status}).`);
  const remoto = Buffer.from(await resposta.arrayBuffer());
  const local = await readFile(`dist${caminho}`);
  const igual = resumir(local) === resumir(remoto);
  arquivos.push({ caminho, igual, sha256: resumir(remoto) });
  if (!igual) throw new Error(`O arquivo publicado difere do build local: ${caminho}.`);
}
const rotas = [];
for (const caminho of [
  '/',
  '/nft/1',
  '/carrinho',
  '/pagamento',
  '/login',
  '/cadastro',
  '/perfil',
  '/carteiras',
  '/pedidos',
  '/pedido/KUR-00001',
]) {
  const resposta = await fetch(`${origem}${caminho}`);
  const html = await resposta.text();
  const possuiEntrada =
    html.includes('id="root"') && entradas.every((caminho) => html.includes(caminho));
  rotas.push({ caminho, status: resposta.status, possuiEntrada });
  if (!resposta.ok || !possuiEntrada) throw new Error(`O fallback SPA não atendeu ${caminho}.`);
}
await mkdir('relatorios/publicacao', { recursive: true });
await writeFile(
  'relatorios/publicacao/arquivos.json',
  JSON.stringify({ origem, verificadoEm: new Date().toISOString(), arquivos, rotas }, null, 2),
);
process.stdout.write(
  `${arquivos.length} arquivos idênticos ao build local; ${rotas.length} rotas acessíveis.\n`,
);
