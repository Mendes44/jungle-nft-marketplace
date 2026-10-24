# Validação da entrega

Verificações executadas em 24/10/2026. A matriz revisada está em `docs/matriz-requisitos.md`.

## Publicação e correspondência

- Aplicação: https://kurio-jungle.vercel.app
- Repositório: https://github.com/Mendes44/jungle-nft-marketplace
- Implantação verificada: https://kurio-jungle-ersngcxjv-marcosmendes-projects.vercel.app
- Inspeção Vercel: https://vercel.com/marcosmendes-projects/kurio-jungle/85LbWib3u13zEgRgTn3Pd5s8NgRb

O comando `node scripts/verificar-publicacao.mjs` comparou SHA-256 dos **22 arquivos** de JavaScript/CSS, worker, fontes e imagens publicados com o build local: todos idênticos. As **dez rotas** retornaram a entrada SPA no acesso direto. A evidência está em `relatorios/publicacao/arquivos.json`.

O SHA-256 do `dist/index.html` auditado é `af7e414f620f728b9fedec32bdb40cf29c0a255f9e644607c9ce2ef7b8d2bcda`. O conteúdo completo da aplicação foi mantido nos testes e auditorias, incluindo MSW, fontes, imagens e Socket.IO.

## Tipos, código e dependências

`npm run typecheck`, `npm run lint`, `npm run format:check` e `npm run build` passaram. `npm audit --omit=dev` retornou **zero vulnerabilidades** de produção. O lockfile é versionado e a instalação/build da hospedagem foi concluída. O workflow Windows em `.github/workflows/verificar.yml` executa `npm ci`, tipos, lint, formatação, build e testes em cada push; seu estado é exibido no GitHub.

Uma cópia limpa do índice Git foi exportada sem `node_modules`. Nela, **`npm ci` e `npm run build` passaram**: 397 pacotes instalados, auditoria de 398 pacotes com zero vulnerabilidades. O build gerou os mesmos nomes de arquivos estáticos da versão publicada, sem depender de backend ou credenciais privadas.

## Playwright

A suíte completa passou com **36 aprovados, zero falhas, zero instáveis e zero ignorados**, tanto no preview local quanto na URL pública. São 18 cenários em dois projetos: Chromium desktop 1440×1000 e mobile 390×844. Os testes públicos comparam as mesmas baselines, sem atualização de snapshots.

| Evidência                          | Localização                                                           |
| ---------------------------------- | --------------------------------------------------------------------- |
| Relatório HTML local               | `playwright-report/index.html`                                        |
| Resultado JSON local               | `relatorios/playwright/resultados.json`                               |
| Relatório HTML publicado           | `relatorios/publicacao/playwright-html/index.html`                    |
| Resultado JSON publicado           | `relatorios/publicacao/resultados.json`                               |
| Oito baselines revisadas           | `tests/visual.spec.ts-snapshots/`                                     |
| Capturas e traces em caso de falha | `test-results/`, gerados por `retain-on-failure` e publicados pelo CI |

Os cenários cobrem os 12 grupos do enunciado, precisão monetária e continuidade de sessão/carrinho. As chamadas passam pelos handlers MSW; os eventos atravessam o cliente Socket.IO. O teste de acessibilidade executou Axe sem violações, verificou teclado, fechamento/restauração de foco do diálogo e overflow em 390/768/1440 px. As screenshots de início, detalhe, carrinho e pagamento foram revisadas manualmente nos dois perfis.

Não houve falha na execução final, portanto não foi produzido trace de falha nessa execução. A configuração preserva traces e screenshots quando uma falha ocorre.

`node scripts/verificar-responsividade.mjs` percorreu as dez telas na origem pública, em 390, 768 e 1440 px e em uma largura CSS de 720 px, equivalente a 1440 px com zoom de 200%. As **40 combinações passaram sem overflow horizontal**, incluindo perfil, carteiras e recibo confirmado. O caso equivalente de zoom não automatiza o atalho do navegador. A evidência está em `relatorios/publicacao/responsividade.json`.

## Lighthouse

Foram executadas **12 medições**: três para início e detalhe em cada perfil, no build otimizado com cenário padrão. A tabela apresenta as medianas; cada medição está preservada em HTML e JSON.

| Página / perfil   | Performance | Acessibilidade | Boas práticas | SEO | LCP (ms) | CLS | TBT (ms) |
| ----------------- | ----------: | -------------: | ------------: | --: | -------: | --: | -------: |
| Início / mobile   |          92 |            100 |           100 | 100 |     3167 |   0 |       51 |
| Início / desktop  |         100 |            100 |           100 | 100 |      665 |   0 |        0 |
| Detalhe / mobile  |          91 |            100 |           100 | 100 |     3324 |   0 |       36 |
| Detalhe / desktop |         100 |            100 |           100 | 100 |      678 |   0 |        0 |

Todas as metas do enunciado foram atingidas: performance ≥90, acessibilidade ≥95, boas práticas ≥95 e SEO ≥90. O mobile ainda tem LCP de aproximadamente 3,2–3,3 segundos sob o throttling de laboratório. A inicialização do worker e o JavaScript da demonstração contribuem para esse custo. Divisão de rotas, imagens WebP, fontes locais, preload, skeletons de dimensões equivalentes e compressão Brotli foram mantidos no build funcional.

Ambiente: Windows `10.0.26200`, Intel Core i5-1235U, 16 GB de RAM, Node 24.18.1, npm 11.16, Playwright 1.64.1, Chromium 156.0.8078.4, Lighthouse 13.5.0 e Vite 8.3.5. Origem `http://127.0.0.1:4173`; preview com Brotli a clientes compatíveis; navegador limpo em cada medição e throttling padrão de cada perfil. Nenhuma suíte E2E foi executada simultaneamente às medições finais.

`relatorios/lighthouse/` contém os 24 relatórios individuais e `resumo.json`, incluindo valores sem arredondamento, user agent e ambiente. `relatorios/diagnostico/` preserva resultados anteriores às correções; eles não são os resultados finais da tabela.

## Referência visual e limitações

Os 15 frames do Figma foram exportados, renderizados e inspecionados. Os quatro retratos originais estão disponíveis localmente. A conferência por frame está em `docs/revisao-visual.md` e a origem/licença dos assets em `docs/assets.md`.

A fonte exata permanece sem confirmação: o Figma expõe a variável `font/family`. IBM Plex Mono é a substituição documentada. Existem adaptações de composição em login, conta, revisão e seções editoriais, descritas em `ARCHITECTURE.md`. A matriz marca fidelidade visual como parcial; não há alegação de igualdade pixel a pixel.

O banco e as sessões são fictícios, locais ao navegador; não existe sincronização entre computadores ou transação distribuída entre várias abas. Essa limitação não impede os fluxos de demonstração avaliados. Nenhuma integração real de blockchain ou pagamento foi implementada, conforme o escopo.

O guia de entrevista está em `output/pdf/guia-tecnico-kurio.pdf`, com arquitetura, regras, roteiro de demonstração e resultados lidos dos relatórios. As oito páginas foram renderizadas e revisadas para conferir texto, tabelas, margens e paginação.
