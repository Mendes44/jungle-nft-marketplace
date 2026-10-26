/** Executa as 12 auditorias exigidas no build real, com relatório HTML/JSON por medição. */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { setTimeout as aguardar } from 'node:timers/promises';
import os from 'node:os';
import lighthouse from 'lighthouse';
import { chromium } from '@playwright/test';
import configuracaoDesktop from 'lighthouse/core/config/desktop-config.js';
import { ReportGenerator } from 'lighthouse/report/generator/report-generator.js';

const diretorio = 'relatorios/lighthouse';
await mkdir(diretorio, { recursive: true });
const resultados = [];
const origem = process.env.URL_AUDITORIA || 'http://127.0.0.1:4173';
const identificadorBuild = createHash('sha256')
  .update(await readFile('dist/index.html'))
  .digest('hex');
/** Reserva uma porta efêmera para não interferir em depuradores ou navegadores do usuário. */
async function obterPortaLivre() {
  const servidor = createServer();
  await new Promise((concluir, rejeitar) => {
    servidor.once('error', rejeitar);
    servidor.listen(0, '127.0.0.1', concluir);
  });
  const endereco = servidor.address();
  await new Promise((concluir) => servidor.close(concluir));
  if (!endereco || typeof endereco === 'string')
    throw new Error('Não foi possível reservar uma porta para a auditoria.');
  return endereco.port;
}
/** Mediana de três execuções reduz ruído sem ocultar qualquer resultado individual. */
function mediana(valores) {
  return [...valores].sort((primeiro, segundo) => primeiro - segundo)[1];
}
for (const [pagina, caminho] of [
  ['inicio', '/'],
  ['detalhe', '/nft/1'],
]) {
  for (const perfil of ['mobile', 'desktop']) {
    const medicoes = [];
    for (let numero = 1; numero <= 3; numero++) {
      // Evita sobrepor o encerramento de um navegador à próxima medição no mesmo computador.
      await aguardar(5000);
      // Playwright inicia o Chromium já verificado neste ambiente Windows.
      const porta = await obterPortaLivre();
      const navegador = await chromium.launch({ args: [`--remote-debugging-port=${porta}`] });
      try {
        const resultado = await lighthouse(
          `${origem}${caminho}`,
          {
            port: porta,
            output: ['html', 'json'],
            logLevel: 'error',
            onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
          },
          perfil === 'desktop' ? configuracaoDesktop : undefined,
        );
        if (!resultado) throw new Error('Lighthouse não retornou uma medição.');
        if (resultado.lhr.runtimeError)
          throw new Error(
            `Lighthouse não carregou a página: ${resultado.lhr.runtimeError.message}`,
          );
        const nome = `${pagina}-${perfil}-${numero}`;
        // Mantém apenas grupos referenciados pelas quatro categorias solicitadas, sem alterar métricas.
        const gruposUtilizados = new Set(
          Object.values(resultado.lhr.categories).flatMap((categoria) =>
            categoria.auditRefs.map((referencia) => referencia.group),
          ),
        );
        resultado.lhr.categoryGroups = Object.fromEntries(
          Object.entries(resultado.lhr.categoryGroups).filter(([grupo]) =>
            gruposUtilizados.has(grupo),
          ),
        );
        await writeFile(
          `${diretorio}/${nome}.html`,
          ReportGenerator.generateReportHtml(resultado.lhr),
        );
        await writeFile(`${diretorio}/${nome}.json`, JSON.stringify(resultado.lhr, null, 2));
        const auditorias = resultado.lhr.audits;
        const medicao = {
          nome,
          versao: resultado.lhr.lighthouseVersion,
          navegador: resultado.lhr.userAgent,
          indiceCpu: resultado.lhr.environment.benchmarkIndex,
          categorias: Object.fromEntries(
            Object.entries(resultado.lhr.categories).map(([nome, categoria]) => [
              nome,
              Math.round((categoria.score ?? 0) * 100),
            ]),
          ),
          lcp: auditorias['largest-contentful-paint'].numericValue,
          cls: auditorias['cumulative-layout-shift'].numericValue,
          tbt: auditorias['total-blocking-time'].numericValue,
        };
        medicoes.push(medicao);
        process.stdout.write(`${nome}: ${JSON.stringify(medicao.categorias)}\n`);
      } finally {
        await navegador.close();
      }
    }
    resultados.push({
      pagina,
      perfil,
      medicoes,
      medianas: {
        ...Object.fromEntries(
          ['performance', 'accessibility', 'best-practices', 'seo'].map((categoria) => [
            categoria,
            mediana(medicoes.map((medicao) => medicao.categorias[categoria])),
          ]),
        ),
        lcp: mediana(medicoes.map((medicao) => medicao.lcp)),
        cls: mediana(medicoes.map((medicao) => medicao.cls)),
        tbt: mediana(medicoes.map((medicao) => medicao.tbt)),
      },
    });
    await writeFile(
      `${diretorio}/resumo.json`,
      JSON.stringify(
        {
          ambiente: {
            plataforma: os.platform(),
            versao: os.release(),
            processador: os.cpus()[0].model,
            memoriaGB: Math.round(os.totalmem() / 2 ** 30),
            node: process.version,
            identificadorBuild,
            origem,
            condicoes:
              'Build Vite otimizado, MSW padrão, fontes e imagens locais, throttling padrão Lighthouse por perfil, navegador limpo por medição e intervalo de 5 s entre navegadores.',
          },
          resultados,
        },
        null,
        2,
      ),
    );
  }
}
