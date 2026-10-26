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
2. Aplique `KURIO10` para obter 10% de desconto (aceita espaços nas extremidades e letras minúsculas). Use `KURIO!` para **Cupom inválido**, `NAOEXISTE` para **Cupom não existe** e `EXPIRADO` para um cupom vencido. Uma tentativa recusada preserva o desconto já aplicado; **Remover cupom** restaura os totais sem desconto.
3. Entre na conta. Os itens do visitante serão mesclados com seu carrinho, respeitando o estoque.
4. Preencha os dados do colecionador. Use `KURIO` no código de indicação e `ana.eth` no nome ENS. O ENS aceita maiúsculas e é normalizado para minúsculas; não consulta um registro real.
5. No celular, clique em **Continuar** para abrir as carteiras. Escolha uma carteira cadastrada e clique no seu provedor (por exemplo, **MetaMask**) para conectar. No desktop, **Usar outra carteira?** oferece seleção, conexão, recusa e desconexão.
6. Clique em **Confirmar compra** para abrir a revisão. Confira os dados e a cotação da API; confirme no diálogo para enviar o pedido.
7. Aguarde o estado confirmado e o recibo. O histórico permite recuperar pedidos após refresh.

O nome ENS e o código de indicação são campos da demonstração. A carteira cadastrada fornece endereço e valores iniciais. Escolha Ethereum ou Polygon e conecte com WalletConnect, MetaMask ou Coinbase Wallet. Trocar carteira, rede ou provedor exige nova conexão; o recibo registra a escolha confirmada. ENS e indicação usam os dados salvos como valor inicial; alterações permanecem no rascunho da conta neste navegador, inclusive em outra aba ou após uma compra. Quantidades compradas são removidas somente após confirmação; itens adicionados durante um pedido pendente são preservados.

## Cenários de avaliação

Abra **Simulação**, no rodapé desktop ou no botão central da navegação móvel. O painel utiliza endpoints REST para mudar cenários e emitir eventos através do transporte Socket.IO.

| Cenário ou ação                        | Comportamento                                                                                                            |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `padrao`                               | Respostas com 60 ms e compra confirmada                                                                                  |
| `vazio`                                | Catálogo sem resultados                                                                                                  |
| `lento`                                | Latência de 1,8 s para observar skeletons e shimmer                                                                      |
| `variavel`                             | Busca curta com 1,2 s e buscas maiores com 80 ms; verifica descarte de respostas antigas                                 |
| `sem-conexao`                          | Falha de transporte intencional; volte a `padrao` para recuperar                                                         |
| `erro-500` / `erro-403`                | Indisponibilidade e falta de permissão                                                                                   |
| `sessao-expirada`                      | Invalida a sessão; volte a `padrao` antes de entrar novamente                                                            |
| `favorito-falha`                       | Erro de mutation com rollback do favorito                                                                                |
| `pagamento-recusado`                   | Recusa preserva os itens e devolve a reserva de estoque                                                                  |
| `timeout-pedido`                       | Pedido criado, resposta de 5,5 s excede o timeout de 4 s; **Recuperar pedido** reutiliza a mesma tentativa               |
| `pedido-lento`                         | Pedido pendente por 60 s; pode ser concluído pelo painel                                                                 |
| `cupom-invalido` / `cupom-inexistente` | Recusa a aplicação de códigos não vazios com a mensagem correspondente; mantém a cotação atual e permite remover o cupom |
| Alterar preço / esgotar edição         | Muda o NFT 1 e invalida a revisão antiga do checkout                                                                     |
| Evento duplicado / antigo              | Verifica descarte por versão, sem regredir os dados                                                                      |
| Interromper Socket.IO                  | Reconexão relê os recursos ativos por REST                                                                               |
| Expirar sessão                         | Exige novo login e preserva o rascunho do checkout                                                                       |
| Restaurar demonstração                 | Restaura fixtures e limpa apenas dados fictícios desta aplicação                                                         |

O destaque inicial alterna automaticamente entre três obras a cada oito segundos no desktop e no mobile. Somente as fotos mudam; texto e imagem permanecem lado a lado, inclusive em 320 px. Os indicadores, o teclado e o gesto horizontal permitem navegação manual; o link da imagem abre a obra selecionada. O controle permite pausar ou retomar a reprodução, e o foco dentro do carrossel pausa a troca durante a navegação. Com preferência por movimento reduzido, a reprodução inicia pausada. No mobile, abrir os filtros leva a rolagem e o foco até o painel.

Os avisos informativos de atualização desaparecem após três segundos. Também podem ser fechados pelo botão **X** ou por um gesto horizontal no celular. Erros de validação e revisões de preço permanecem visíveis até a correção.

A simulação persiste neste navegador. Para repetir um cenário desde o início, utilize **Restaurar demonstração**. A retomada do service worker após inatividade é automática e não restaura nem apaga esses dados.

## Verificações e evidências

```sh
npm run typecheck
npm run lint
npm run format:check
npm run format
npm test
```

A suíte passou em 68 casos locais e 68 na publicação, sem testes ignorados ou instáveis. A revisão inclui 24 capturas, 70 combinações de tela/largura sem overflow e 81 arquivos publicados com hashes idênticos ao build local.

Playwright inicia o preview na porta 5174 e executa os cenários em Chromium desktop (1440×1000) e mobile (414×896). Mantenha a porta livre. O relatório fica em `playwright-report/index.html`, o resultado JSON em `relatorios/playwright/resultados.json` e as falhas preservam screenshots e traces em `test-results/`.

As baselines de início, detalhe, carrinho, pagamento, autenticação, perfil, carteiras, confirmação e páginas 404 estão em `tests/visual.spec.ts-snapshots/`: 24 capturas nos dois perfis. `npm run test:visual` atualiza essas referências e deve ser usado somente após revisar a alteração visual. As capturas foram feitas no Windows, também usado pelo CI; outros sistemas precisam de referências específicas devido a diferenças de renderização.

Os testes adicionais cobrem reprodução automática e pausa, controles, teclado e gesto do carrossel; rolagem e foco dos filtros; troca de rede e provedor com reconexão; rascunho por conta em novas abas e após compra; cupons inválidos, inexistentes e expirados; descarte dos avisos; texto e imagem sem sobreposição; e cotação com 18 casas decimais em telas estreitas.

O identificador aleatório da transação é mascarado no recibo durante a comparação visual; itens, valores, taxas e estado do pedido continuam sendo comparados.

Para medir Lighthouse, mantenha `npm run preview` na porta 4173 e execute:

```sh
npm run audit
```

São três medições por página (início e detalhe) e perfil (mobile e desktop). Os 24 relatórios HTML/JSON e `relatorios/lighthouse/resumo.json` registram as categorias, medianas, LCP, CLS, TBT, versões e ambiente. A auditoria usa o mesmo build funcional, incluindo fontes, imagens e mocks. Execute sem outra suíte pesada simultânea. `URL_AUDITORIA` permite selecionar outra origem.

Medições do build entregue, com Lighthouse 13.5.0, Chromium 156 e throttling padrão de cada perfil:

| Página / perfil | Performance | Acessibilidade | Boas práticas | SEO |    LCP |   CLS |   TBT |
| --------------- | ----------: | -------------: | ------------: | --: | -----: | ----: | ----: |
| Início mobile   |          92 |            100 |           100 | 100 | 3,18 s |     0 | 47 ms |
| Início desktop  |          99 |            100 |           100 | 100 | 0,83 s |     0 |  0 ms |
| Detalhe mobile  |          90 |            100 |           100 | 100 | 3,41 s |     0 | 50 ms |
| Detalhe desktop |         100 |            100 |           100 | 100 | 0,79 s | 0,026 |  0 ms |

As medianas atingem as metas das quatro categorias. Os relatórios preservam as três execuções de cada combinação. As medições variam com o ambiente; o índice de CPU fica registrado para permitir essa análise. As atribuições dos assets e os ajustes funcionais em relação ao Figma estão documentadas em `ARCHITECTURE.md`.

Para executar E2E na publicação, defina `URL_APLICACAO=https://kurio-jungle.vercel.app` antes de `npm test`. Os resultados são gravados em `relatorios/publicacao/`, preservando os locais. `node scripts/verificar-publicacao.mjs` compara hashes dos arquivos e o acesso direto às rotas; `node scripts/verificar-responsividade.mjs` verifica dez telas em 320, 360, 390, 414, 768 e 1440 px e na largura CSS equivalente a 1440 px com zoom de 200%.

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
