# Kurio — Marketplace de NFTs

Solução do [desafio Frontend da Jungle](https://github.com/junglegaming/frontend-challenge), com descoberta, compra e conta do colecionador em React e TypeScript. REST, autenticação, carteiras e pagamentos são simulados por MSW; as atualizações atravessam `socket.io-client` e o binding Socket.IO.

[Aplicação publicada](https://kurio-jungle.vercel.app) · [Código-fonte](https://github.com/Mendes44/jungle-nft-marketplace)

## Instalação e execução

Requisitos: Node.js 24 e npm 11. Instale as versões do lockfile:

```sh
npm ci
npx playwright install chromium
npm run dev
```

Para executar o build otimizado:

```sh
npm run build
npm run preview
```

Os mocks funcionam em desenvolvimento e na publicação. Nenhuma transação movimenta valores ou ativos reais.

## Configuração

Não é necessário criar arquivo de ambiente para a demonstração. `.env.example` contém as opções:

| Variável          | Padrão                      | Finalidade                                    |
| ----------------- | --------------------------- | --------------------------------------------- |
| `VITE_MOCKS`      | `true`                      | Use `false` somente com um backend compatível |
| `VITE_API_URL`    | `/api`                      | Base dos recursos REST                        |
| `VITE_SOCKET_URL` | Origem atual com `ws`/`wss` | Servidor Socket.IO na integração real         |

## Contas de demonstração

| Usuário      | E-mail              | Senha        |
| ------------ | ------------------- | ------------ |
| Ana Oliveira | `ana@exemplo.com`   | `Colecao123` |
| Bruno Santos | `bruno@exemplo.com` | `Colecao123` |

São dados fictícios. Cada conta possui favoritos, perfil, carteiras, carrinho e pedidos próprios. Também é possível criar uma conta. Não utilize senhas ou dados pessoais reais.

## Testar a compra

1. Escolha uma obra e uma edição; ajuste a quantidade e adicione ao carrinho.
2. Aplique `KURIO10` para obter 10% de desconto. `EXPIRADO` permite testar um cupom vencido.
3. Entre na conta. Os itens do visitante serão mesclados com seu carrinho, respeitando o estoque.
4. Preencha os dados do colecionador. Use `KURIO` no código de indicação e `ana.eth` no nome ENS. O ENS aceita maiúsculas e é normalizado para minúsculas; não consulta um registro real.
5. Escolha uma carteira cadastrada, confira a rede e clique em **Conectar carteira**.
6. Clique em **Revisar compra** e confira a cotação da API antes de **Confirmar compra**.
7. Aguarde o estado confirmado e o recibo. O histórico permite recuperar pedidos após refresh.

O nome ENS e o código de indicação são campos da demonstração. A rede acompanha a carteira selecionada. Quantidades compradas são removidas somente após confirmação; itens adicionados durante um pedido pendente são preservados.

## Cenários de avaliação

Abra **Simulação**, no rodapé. O painel utiliza endpoints REST para mudar cenários e emitir eventos através do transporte Socket.IO.

| Cenário ou ação                | Comportamento                                                                                              |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `padrao`                       | Respostas com 60 ms e compra confirmada                                                                    |
| `vazio`                        | Catálogo sem resultados                                                                                    |
| `lento`                        | Latência de 1,8 s para observar skeletons e shimmer                                                        |
| `variavel`                     | Busca curta com 1,2 s e buscas maiores com 80 ms; verifica descarte de respostas antigas                   |
| `sem-conexao`                  | Falha de transporte intencional; volte a `padrao` para recuperar                                           |
| `erro-500` / `erro-403`        | Indisponibilidade e falta de permissão                                                                     |
| `sessao-expirada`              | Invalida a sessão; volte a `padrao` antes de entrar novamente                                              |
| `favorito-falha`               | Erro de mutation com rollback do favorito                                                                  |
| `pagamento-recusado`           | Recusa preserva os itens e devolve a reserva de estoque                                                    |
| `timeout-pedido`               | Pedido criado, resposta de 5,5 s excede o timeout de 4 s; **Recuperar pedido** reutiliza a mesma tentativa |
| `pedido-lento`                 | Pedido pendente por 60 s; pode ser concluído pelo painel                                                   |
| Alterar preço / esgotar edição | Muda o NFT 1 e invalida a revisão antiga do checkout                                                       |
| Evento duplicado / antigo      | Verifica descarte por versão, sem regredir os dados                                                        |
| Interromper Socket.IO          | Reconexão relê os recursos ativos por REST                                                                 |
| Expirar sessão                 | Exige novo login e preserva o rascunho do checkout                                                         |
| Restaurar demonstração         | Restaura fixtures e limpa apenas dados fictícios desta aplicação                                           |

A simulação persiste neste navegador. Para repetir um cenário desde o início, utilize **Restaurar demonstração**. A retomada do service worker após inatividade é automática e não restaura nem apaga esses dados.

## Verificações e evidências

```sh
npm run typecheck
npm run lint
npm run format:check
npm run format
npm test
```

A suíte passou em 46 casos locais e 46 na publicação, sem testes ignorados ou instáveis. A revisão inclui 24 capturas, 40 combinações de tela/largura sem overflow e 22 arquivos publicados com hashes idênticos ao build local.

Playwright inicia o preview na porta 5174 e executa os cenários em Chromium desktop (1440×1000) e mobile (390×844). Mantenha a porta livre. O relatório fica em `playwright-report/index.html`, o resultado JSON em `relatorios/playwright/resultados.json` e as falhas preservam screenshots e traces em `test-results/`.

As baselines de início, detalhe, carrinho, pagamento, autenticação, perfil, carteiras, confirmação e páginas 404 estão em `tests/visual.spec.ts-snapshots/`: 24 capturas nos dois perfis. `npm run test:visual` atualiza essas referências e deve ser usado somente após revisar a alteração visual. As capturas foram feitas no Windows, também usado pelo CI; outros sistemas precisam de referências específicas devido a diferenças de renderização.

Para medir Lighthouse, mantenha `npm run preview` na porta 4173 e execute:

```sh
npm run audit
```

São três medições por página (início e detalhe) e perfil (mobile e desktop). Os 24 relatórios HTML/JSON e `relatorios/lighthouse/resumo.json` registram as categorias, medianas, LCP, CLS, TBT, versões e ambiente. A auditoria usa o mesmo build funcional, incluindo fontes, imagens e mocks. Execute sem outra suíte pesada simultânea. `URL_AUDITORIA` permite selecionar outra origem.

Medições do build entregue, com Lighthouse 13.5.0, Chromium 156 e throttling padrão de cada perfil:

| Página / perfil | Performance | Acessibilidade | Boas práticas | SEO |    LCP | CLS |   TBT |
| --------------- | ----------: | -------------: | ------------: | --: | -----: | --: | ----: |
| Início mobile   |          92 |            100 |           100 | 100 | 3,17 s |   0 | 85 ms |
| Início desktop  |         100 |            100 |           100 | 100 | 0,66 s |   0 |  0 ms |
| Detalhe mobile  |          91 |            100 |           100 | 100 | 3,34 s |   0 | 25 ms |
| Detalhe desktop |         100 |            100 |           100 | 100 | 0,71 s |   0 |  0 ms |

As medianas atingem as metas das quatro categorias. Os relatórios preservam as três execuções de cada combinação. As medições variam com o ambiente; o índice de CPU fica registrado para permitir essa análise. As substituições de assets e as diferenças de composição em relação ao Figma estão documentadas em `ARCHITECTURE.md`.

Para executar E2E na publicação, defina `URL_APLICACAO=https://kurio-jungle.vercel.app` antes de `npm test`. Os resultados são gravados em `relatorios/publicacao/`, preservando os locais. `node scripts/verificar-publicacao.mjs` compara hashes dos arquivos e o acesso direto às rotas; `node scripts/verificar-responsividade.mjs` verifica dez telas em 390, 768 e 1440 px e na largura CSS equivalente a 1440 px com zoom de 200%.

O workflow em `.github/workflows/verificar.yml` instala pelo lockfile e executa tipos, lint, formatação, build e testes. Os relatórios e traces são anexados à execução do GitHub Actions.

## Organização

- `src/dominio`: contratos Zod, tipos e cálculos ETH em wei com BigInt.
- `src/infraestrutura`: Axios, cache Query, sessão e reconciliação Socket.IO.
- `src/simulacao`: fixtures, persistência, handlers REST e transporte de eventos MSW.
- `src/funcionalidades`: catálogo, compra e conta.
- `src/componentes`: interface compartilhada e componentes shadcn/ui adaptados.
- `tests`: cenários funcionais, recuperação, acessibilidade e regressão visual.

[ARCHITECTURE.md](ARCHITECTURE.md) documenta contratos REST/eventos, sessão, cache, idempotência, limitações e decisões visuais. Os retratos originais do Figma são locais e suas versões WebP podem ser regeneradas com `node scripts/otimizar-imagens.mjs`. Fontes e ícones mantêm suas licenças e atribuições.

## Publicação

O projeto inclui configuração Vercel e Netlify com fallback SPA para acesso direto e refresh. Em uma conta Vercel autenticada, `vercel --prod` publica o build. O ambiente de demonstração não depende de serviços privados, blockchain, extensão de carteira ou gateway financeiro.
