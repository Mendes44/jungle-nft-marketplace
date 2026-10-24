# Kurio — Marketplace de NFTs

Aplicação React/TypeScript para o [desafio da Jungle](https://github.com/junglegaming/frontend-challenge). Catálogo, conta, carteiras e compras usam uma API REST simulada por MSW. Os eventos passam por `socket.io-client` e pelo binding Socket.IO do MSW. Nenhuma operação movimenta dinheiro ou ativos reais.

[Aplicação publicada](https://kurio-jungle.vercel.app) · [Repositório](https://github.com/Mendes44/jungle-nft-marketplace) · [Resultados da validação](docs/validacao.md) · [Guia técnico em PDF](output/pdf/guia-tecnico-kurio.pdf)

## Executar

Requisitos: Node.js 24 e npm 11. O lockfile fixa as versões instaladas.

```sh
npm ci
npx playwright install chromium
npm run dev
```

Abra o endereço mostrado pelo Vite. Para avaliar a versão otimizada:

```sh
npm run build
npm run preview
```

O build inclui os mocks por padrão. Não é necessário criar `.env`. As opções disponíveis estão em `.env.example`: `VITE_MOCKS=false` desativa MSW para integração com um backend compatível; `VITE_API_URL` e `VITE_SOCKET_URL` podem definir as origens REST e Socket.IO. Nunca configure credenciais reais na demonstração.

## Contas fictícias

| Conta        | E-mail            | Senha      |
| ------------ | ----------------- | ---------- |
| Ana Oliveira | ana@exemplo.com   | Colecao123 |
| Bruno Santos | bruno@exemplo.com | Colecao123 |

Cada conta possui perfil, favoritos, carrinho, carteiras e pedidos próprios. Cadastro também funciona. Somente hashes das senhas fictícias são persistidos. O algoritmo da demonstração não substitui um serviço de identidade de produção.

## Avaliar a compra

1. Explore o catálogo; combine busca, categoria, rede, faixa de preço e ordenação. Os parâmetros ficam na URL.
2. Abra uma obra, escolha a edição e a quantidade e adicione ao carrinho.
3. Aplique `KURIO10` para desconto de 10%. `EXPIRADO` e qualquer outro código inválido mostram erros distintos.
4. Entre com Ana. Itens adicionados como visitante são incorporados ao carrinho da conta, respeitando estoque.
5. Em pagamento, confira os dados, preencha código de indicação (por exemplo `KURIO`) e nome ENS (por exemplo `ana.eth`). Os nomes e o e-mail são preenchidos pelo perfil.
6. Selecione uma carteira cadastrada, conecte-a na simulação e clique em **Revisar compra**. A cotação vem novamente da API.
7. Confirme e acompanhe o estado pendente até o recibo confirmado. Os valores do recibo são um snapshot e não mudam com o catálogo.

O nome ENS e o código de indicação reproduzem campos obrigatórios do layout. Seus valores são validados na simulação, sem consulta a registros externos. O endereço e o tipo de carteira vêm do cadastro da conta. A escolha de outra rede é feita selecionando uma carteira cadastrada nessa rede.

## Cenários reproduzíveis

Use **Simulação**, no rodapé, em desenvolvimento e no build publicado. O painel envia requisições REST aos handlers; não chama setters de negócio nem atualiza o cache como substituto do socket.

| Cenário/ação                   | Como avaliar                                                                                                                       |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `padrao`                       | Respostas com 60 ms, pagamento confirmado                                                                                          |
| `vazio`                        | Catálogo sem resultados                                                                                                            |
| `lento`                        | 1,8 s de latência; observe os skeletons                                                                                            |
| `variavel`                     | Busca com um caractere demora 1,2 s; buscas maiores, 80 ms; digite rapidamente                                                     |
| `sem-conexao`                  | Falha de transporte simulada com `HttpResponse.error()`                                                                            |
| `erro-500`                     | Resposta HTTP 503 recuperável                                                                                                      |
| `erro-403`                     | Resposta de permissão insuficiente                                                                                                 |
| `sessao-expirada`              | Sessões invalidadas ao consultar a API; volte a `padrao` para entrar novamente                                                     |
| `favorito-falha`               | Mutation de favorito retorna 503 e restaura o estado anterior                                                                      |
| `pagamento-recusado`           | Pedido termina recusado; estoque e itens são preservados                                                                           |
| `timeout-pedido`               | Pedido é persistido, mas a resposta demora 5,5 s e excede o timeout Axios de 4 s; use **Recuperar pedido**, inclusive após refresh |
| `pedido-lento`                 | Pedido fica pendente por 60 s; **Concluir pedidos pendentes** permite avanço determinístico                                        |
| Alterar preço / esgotar edição | Coloque NFT 1 no carrinho e revise a compra; dispare a ação e observe o bloqueio da cotação antiga                                 |
| Evento duplicado / antigo      | Reemite a versão atual ou uma anterior; não deve haver regressão                                                                   |
| Interromper Socket.IO          | Fecha o transporte; a reconexão invalida os recursos ativos e os relê por REST                                                     |
| Expirar sessão                 | Expira imediatamente; uma nova autenticação retoma a rota e o rascunho do checkout                                                 |
| Restaurar demonstração         | Recria fixtures, sessões e sequências; limpa tentativas e rascunhos desta aplicação                                                |

O banco fictício é local ao navegador. Para repetir uma avaliação desde o início, use o reset. Não é necessário limpar dados de outros sites.

## Verificações

```sh
npm run typecheck
npm run lint
npm run format:check
npm run format
npm test
npm run test:visual
```

`npm test` executa Chromium em 1440×1000 e 390×844. O servidor de testes usa a porta 5174 e é criado pelo Playwright; deixe essa porta livre. As baselines ficam em `tests/visual.spec.ts-snapshots`. `test:visual` atualiza as imagens de referência e deve ser usado somente depois de revisar mudanças visuais. O relatório HTML fica em `playwright-report/index.html`; falhas geram screenshot e trace em `test-results/`.

As regressões visuais comparam o aplicativo às próprias baselines aprovadas. Elas não constituem uma comparação automática com o arquivo Figma. A cobertura de 768 px e a verificação de overflow estão na suíte funcional.

As baselines foram capturadas no Windows, também utilizado no workflow de CI. Playwright diferencia referências por sistema operacional; outro sistema precisa de baselines próprias revisadas, pois a renderização pode variar.

Para executar a mesma suíte contra a publicação, defina `URL_APLICACAO=https://kurio-jungle.vercel.app` no ambiente antes de `npm test`. Nesse modo, Playwright usa a origem pública e grava o relatório em `relatorios/publicacao/`, preservando o relatório local. Cada teste continua em um contexto de navegador isolado.

Para Lighthouse, execute o build e o preview na porta padrão 4173 e, em outro terminal:

```sh
npm run audit
```

São feitas três medições para início e detalhe nos perfis mobile e desktop, com os mocks padrão e os assets completos da entrega. Os 24 arquivos HTML/JSON e o resumo com medianas, LCP, CLS, TBT e ambiente ficam em `relatorios/lighthouse/`. `URL_AUDITORIA` pode selecionar outra origem. Execute a auditoria sem outros testes ou tarefas pesadas simultâneas.

## Organização e decisões

- `src/dominio`: contratos Zod, tipos e precisão ETH.
- `src/infraestrutura`: Axios, QueryClient, sessão e reconciliação Socket.IO.
- `src/simulacao`: fixtures persistidas, handlers REST por domínio e transporte dos eventos.
- `src/funcionalidades`: catálogo/detalhe, compra e conta.
- `src/componentes`: estrutura compartilhada, formulários e componentes adaptados do shadcn/ui.
- `tests`: cenários E2E e regressão visual.
- `scripts`: auditoria, otimização de imagens e geração do guia em PDF.

Veja `ARCHITECTURE.md`, `docs/contratos.md`, `docs/matriz-requisitos.md` e `docs/validacao.md`. O guia de entrevista fica em `output/pdf/guia-tecnico-kurio.pdf`.

## Referência visual e assets

O arquivo Figma foi aberto e o início, detalhe, carrinho e pagamento foram inspecionados visualmente. Foram conferidos o fundo `#140D0A`, o frame desktop de 1440 px, margens de 120 px, raio de 24 px da arte principal e os campos do pagamento. A identidade visível usa a marca **Kurio**, embora a página do arquivo se chame GreenMint.

Os quatro retratos originais foram exportados, preservados em `assets/originais/` e otimizados para WebP local. Os 15 frames foram exportados em `docs/referencia-figma.pdf`, renderizados e revisados. A paleta, a composição em duas colunas e a tipografia de destaque desktop (43 px, entrelinha 70 px) foram conferidas no painel de propriedades. O catálogo tem nove obras por página.

A família tipográfica aparece no Figma como a variável `font/family`, sem valor resolvido na inspeção disponível. IBM Plex Mono permanece uma substituição local documentada em `docs/assets.md`. A aplicação mantém diferenças de composição para acomodar filtros acessíveis, campos obrigatórios, revisão de compra e feedback da simulação. Os desvios estão em `ARCHITECTURE.md`; não se afirma igualdade pixel a pixel.

## Publicação

As configurações Vercel e Netlify incluem fallback de rotas para acesso direto e refresh. O projeto não depende de backend privado. Em um ambiente Vercel autenticado, `vercel --prod` publica o build de demonstração. Os endereços verificados da entrega são registrados em `docs/validacao.md`.

Após publicar, `node scripts/verificar-publicacao.mjs` compara SHA-256 de arquivos estáticos com o build local e confere o fallback das rotas. O teste funcional público verifica o funcionamento de MSW, Socket.IO e das operações autenticadas no navegador.

`node scripts/verificar-responsividade.mjs` percorre as dez telas em 390, 768 e 1440 px, além da largura CSS equivalente a 1440 px com zoom de 200%. O resultado de overflow fica em `relatorios/publicacao/responsividade.json`. Os dois scripts aceitam `URL_APLICACAO` para selecionar outra origem.

O guia em PDF é produzido por `scripts/gerar-guia.py` a partir do texto em `docs/guia-entrevista.md` e dos relatórios reais. Sua regeneração requer Python com ReportLab e as fontes Segoe UI do Windows; isso não é necessário para executar a aplicação. Os retratos WebP podem ser regenerados com `node scripts/otimizar-imagens.mjs`.

## Evidências visuais

A revisão manual dos 15 frames e das oito capturas da aplicação está em `docs/revisao-visual.md`. Além da fonte substituta, a matriz registra as adaptações de composição que permanecem em relação à referência.
