# Arquitetura e decisões

## Limites de responsabilidade

O domínio define schemas e operações monetárias. A infraestrutura lê e escreve HTTP exclusivamente pelo Axios. Query mantém dados remotos, Router mantém a URL e a proteção das rotas. Componentes mantêm apenas estado de apresentação, campos editáveis, revisão e conexão devolvida pela API.

A simulação é um backend local interceptado na camada de rede. `rede.ts` registra MSW, aplica latência/falhas e despacha os recursos para `operacoes-conta.ts`, `operacoes-catalogo.ts` e `operacoes-compra.ts`. `banco.ts` contém fixtures, persistência, cotação, merge de carrinhos e liquidação. Não há respostas fictícias em componentes ou no cliente HTTP.

Os controles de demonstração são rotas REST próprias. Alterar preço e estoque persiste o catálogo antes de emitir `nft.updated`. As telas recebem a alteração pelo cliente Socket.IO, invalidam as consultas e leem os novos valores por REST.

## Precisão de valores

ETH é string decimal com até 18 casas em contratos e armazenamento. `paraWei` converte para `bigint`; `deWei` serializa sem perda. Subtotal é soma de preço em wei × quantidade inteira. O desconto de 10% trunca somente a fração inferior a um wei. A taxa de rede simulada é 0,005 ETH para um carrinho não vazio.

Não há conversão financeira por `Number`, `parseFloat` ou arredondamento de apresentação. A cotação inclui itens, edição, disponibilidade, cupom e valores. Seu identificador é uma representação determinística desse conteúdo. É um mecanismo de detecção de alteração na simulação, não uma assinatura de segurança.

## Compra e concorrência

Uma revisão busca cotação atual na API. O pedido só pode ser enviado com a carteira conectada e com essa cotação. O servidor recalcula tudo e recusa conteúdo desatualizado com 409. A interface exige nova revisão.

Antes da primeira mutation, a aplicação grava chave UUID e corpo validado em `sessionStorage`, por usuário. Timeout preserva ambos. Reenvio usa exatamente a mesma chave e corpo. A API procura a tentativa antes de revalidar estoque: retorna o mesmo pedido, inclusive se já confirmado. A mesma chave com outro conteúdo gera conflito.

A seção crítica de criação não contém `await` entre consulta da tentativa, reserva de estoque e persistência. Dentro de uma instância da simulação, cliques concorrentes não geram pedidos duplicados. O estoque é reservado ao criar o pedido pendente; a recusa o devolve. A confirmação desconta somente as linhas/quantidades efetivamente compradas do carrinho atual, preservando adições posteriores. Estados confirmado e recusado são terminais.

O snapshot de cotação, coletor e carteira é copiado com `structuredClone`. O recibo lê o pedido persistido e nunca consulta preços atuais para reconstruir valores históricos. Recarregar ou reconectar liquida pedidos vencidos por meio da API/temporizador, sem criar outro pedido.

## Sessão e dados privados

Token UUID fictício em `localStorage`; TTL de uma hora na simulação. A API valida token e validade em operações autenticadas. O Router consulta a sessão antes de abrir pagamento, perfil, carteiras ou pedidos. A interceptação Axios de 401 limpa a sessão e preserva o endereço de retorno.

Troca de sessão cancela queries, limpa o QueryClient e dispara novo ciclo do provedor. As query keys privadas incluem identidade/token. O efeito Socket.IO depende da sessão; cleanup remove listeners, encerra o socket e impede callbacks antigos com uma flag de ciclo. Eventos privados só são publicados às conexões do proprietário e são validados novamente no cliente.

Senhas fictícias são SHA-256 com prefixo fixo. Isso evita texto claro no armazenamento solicitado, mas não é uma estratégia de autenticação de produção. Um backend real deve usar hashing lento com salt individual, sessão protegida e autorização no servidor. Nenhum dado real deve ser cadastrado neste ambiente.

O carrinho de visitante tem identificador UUID próprio. Login mescla cada chave NFT+edição com o carrinho da conta e limita ao estoque disponível. Logout rotaciona o identificador de visitante; o próximo visitante não herda o carrinho privado. Os dados fictícios das contas continuam no banco local para demonstrar persistência.

Rascunhos e tentativas de checkout ficam na aba, separados por usuário. A tela só os recupera depois de resolver a identidade. Expiração permite retomar campos após login. O reset elimina banco, sessões, sequência, rascunhos e tentativas do namespace Kurio.

O painel de simulação encerra seu ciclo ao mudar de rota. Se uma ação expira a sessão, ele é desmontado antes da interação com o login, evitando dois modais sobrepostos. O teste de expiração verifica que apenas a autenticação permanece e que o rascunho retorna após entrar novamente.

## Cache, cancelamento e erros

Query usa `staleTime` de 15 segundos, atualização ao focar a janela e retry automático desativado. Mutations também não têm retry automático; o usuário recebe retorno explícito e pode tentar novamente. O timeout Axios é de 4 segundos. GETs recebem o `AbortSignal` da query, evitando que respostas obsoletas ocupem o estado da busca atual.

O cache do catálogo inclui todos os parâmetros da URL. Favoritos usam optimistic update: cancelam a leitura em curso, guardam snapshot, alteram a lista e fazem rollback quando a API falha. As queries são invalidadas após a mutation para reconciliar o estado definitivo.

Mutations de carrinho invalidam carrinho e cotação. Perfil invalida perfil/sessão. Carteiras invalidam a lista da conta. Pedidos têm polling de recuperação enquanto pendentes, além de eventos. Erros REST são `{ mensagem }`; validação, ausência de sessão, permissão, inexistência, conflito e indisponibilidade têm status distintos.

## Socket.IO e MSW

O transporte usa WebSocket com o namespace padrão. O binding publicado `@mswjs/socket.io-binding@0.2.0` exige MSW 2, por isso o lockfile utiliza MSW 2.15.0. A documentação da branch principal do binding descreve uma API posterior; a implementação foi conferida também no código e nas declarações da versão instalada.

MSW 2 remove `/socket.io/` ao comparar a URL, portanto `ws.link` recebe a origem. O cliente é importado depois da inicialização MSW, pois captura o construtor WebSocket durante o carregamento. A simulação envia o heartbeat Engine.IO e limpa seus timers quando a conexão fecha.

Eventos contêm `id`, `recursoId`, `versao` e, quando privado, `usuarioId`. O cliente mantém a maior versão por tipo/recurso e descarta eventos duplicados ou antigos. Eventos não substituem snapshots de cache com valores arbitrários; invalidam consultas que são reconciliadas por REST. Reconectar invalida os recursos ativos. Assim, uma sequência antiga não regride preço ou estado terminal de pedido.

Limites do mock: namespace padrão, eventos textuais, sem rooms distribuídas, anexos binários ou servidor Socket.IO remoto. Não há transporte long-polling de fallback. A persistência é do navegador, não um banco compartilhado entre computadores. Várias abas simultâneas não têm lock transacional distribuído; a seção crítica garante consistência dentro da instância avaliada.

## Interface e acessibilidade

Componentes Button e Dialog seguem a composição shadcn/ui com Radix, CVA, clsx e tailwind-merge. O Dialog usa foco preso, Escape, título, descrição e restauração do foco. A identidade visual é adaptada por tokens e CSS/Tailwind. Os nomes oficiais dos componentes de terceiros foram preservados.

Há labels associados, mensagens `aria-describedby`, `aria-invalid`, skip link, foco visível, regiões de feedback e alternativas textuais. O contraste dos links em botões cobre foi ajustado para manter texto escuro. Shimmer e transições respeitam `prefers-reduced-motion`. Inputs e grades têm limites para evitar overflow.

As telas de confirmação, perfil e carteiras funcionam em mobile por adaptação da grade. O menu mobile usa diálogo acessível. Ações editoriais fora do escopo explicam seu contexto e não simulam sucesso de um recurso inexistente.

Os 15 frames foram exportados, renderizados e revisados. Os quatro retratos originais são reutilizados entre NFTs, como no catálogo da referência. A paleta usa fundo #140D0A, painel #241612, texto #F5F1EB, texto secundário #CFB28C e cobre #D28A4C. O destaque desktop usa 43 px e entrelinha de 70 px; mobile usa escala menor e composição compacta. O menu inferior e os filtros expansíveis preservam acesso aos recursos em telas estreitas.

Textos, nomes de NFTs e ícones preservam os originais. A composição desktop usa conteúdo de 1200 px em um frame de 1440 px; os frames móveis têm 414×896 px. Cabeçalho, busca, abas, filtros, cartões, galeria, quantidades, tabelas, formulários, autenticação, recibo, seções editoriais e rodapé foram alinhados à referência. Vetores originais são servidos localmente em `public/icones/`. A busca desktop se revela pelo ícone do cabeçalho; no celular, filtros e ordenação se expandem pelo controle ao lado da busca.

Ajustes funcionais e de acessibilidade: carteira e rede vêm dos registros da conta; números, contagens e valores vêm da API. Os frames ilustrativos apresentam variações de imagens e dados entre telas; a aplicação mantém uma identidade consistente para cada NFT, sem trocar a imagem ou o total de uma obra entre etapas. A taxa simulada permanece 0,005 ETH, calculada na API. O recibo informa explicitamente que a transação é simulada. Estados de sessão, estoque, erro, carregamento e confirmação são dinâmicos, enquanto os frames mostram apenas exemplos estáticos. O controle da simulação continua acessível em todas as telas necessárias à avaliação.

A revisão da compra é um diálogo acessível com cotação revalidada. No celular, os dados do colecionador precedem a seleção de carteira; voltar preserva o formulário. A carteira escolhida também permanece no rascunho após refresh, e a conexão precisa ser revalidada. Perfil, carteiras e recibo possuem adaptação móvel. A biografia é editável em uma seção recolhida. Os provedores sociais, newsletter e páginas editoriais fora do escopo explicam sua indisponibilidade, sem aparentar sucesso. Labels de autenticação continuam associados aos inputs, embora estejam visualmente ocultos como no frame. Campos de senha permitem alternar a visibilidade. Os indicadores de recomendações têm área clicável mínima de 24×24 px. Botões e mensagens adicionais garantem teclado, recuperação e feedback acessível. O recorte externo arredondado do dispositivo não é aplicado como máscara fixa à página, para preservar a rolagem e o conteúdo. Essas diferenças de estado, dados e renderização do navegador impedem afirmar identidade literal de todos os pixels.

## Carregamento e entrega dos arquivos

O ponto de entrada inicia MSW e baixa a aplicação em paralelo, montando a árvore somente quando a interceptação está pronta. Compra e conta são carregadas por funcionalidade com `lazyRouteComponent`. Fontes WOFF2 e imagens WebP são locais; o destaque possui preload, incluindo suas camadas de fundo com media query móvel. O controle de filtros usa o vetor original sobre gradiente CSS para manter nitidez em telas de alta densidade. As dimensões do detalhe e de seu skeleton coincidem para reduzir CLS.

O plugin local `configuracao/compressao.ts` pré-comprime texto em Brotli no build e serve os arquivos comprimidos no preview quando o navegador aceita esse encoding. O fallback continua com o Vite. Isso reproduz uma entrega estática comprimida, também oferecida pela hospedagem, sem retirar mocks ou conteúdo das auditorias. O cabeçalho Vary evita compartilhar uma resposta comprimida com clientes incompatíveis.

## Verificação e publicação

Playwright usa contextos isolados, relógio estável em screenshots e ações de cenário via interface/REST. O socket observado é o cliente Socket.IO real interceptado. O build auditado é o mesmo build funcional, sem remoção de fonte, imagem ou mock para a medição.

Vercel e Netlify possuem fallback SPA. MSW é ativado por configuração e incluído no build padrão. A origem WebSocket acompanha HTTP/HTTPS da implantação, permitindo funcionamento estático sem um backend privado.

Os resultados executados estão nos relatórios Playwright e Lighthouse; as URLs e instruções de reprodução estão no README.

### Requisitos e verificação

| Requisito                          | Implementação                                                    | Verificação                                                                                  |
| ---------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Catálogo, URL, filtros e histórico | `catalogo.tsx`, Router e consultas Axios canceláveis             | `fluxos.spec.ts`: filtros combinados e respostas obsoletas                                   |
| Detalhe, estoque e inexistência    | Edições por NFT e páginas 404 compartilhadas                     | `fluxos.spec.ts` e `recuperacao.spec.ts`: acesso direto, esgotamento e 404/503               |
| Conta, sessão e isolamento         | API autenticada, cache por identidade e limpeza de subscriptions | `fluxos.spec.ts`, `consistencia.spec.ts` e `recuperacao.spec.ts`: troca de conta e expiração |
| Carrinho e precisão ETH            | Persistência, merge e cálculo em wei com BigInt                  | `fluxos.spec.ts`: 18 casas, cupom, quantidades e refresh                                     |
| Compra, idempotência e recibo      | Cotação revalidada, reserva, snapshot e tentativa persistida     | `fluxos.spec.ts` e `recuperacao.spec.ts`: recusa, timeout e chave com conteúdo diferente     |
| Perfil, avatar, senha e carteiras  | Mutations validadas e persistidas pela simulação                 | `fluxos.spec.ts` e `consistencia.spec.ts`: edição, validação e refresh                       |
| Tempo real e reconciliação         | Cliente Socket.IO, binding MSW, versões e releitura REST         | `fluxos.spec.ts`: preço, duplicatas, eventos antigos e pedido após desconexão                |
| Falhas e retomada do transporte    | Cenários REST e handshake do worker antes do Axios               | `recuperacao.spec.ts`: encerramento real do worker e pedido preservado                       |
| Acessibilidade e responsividade    | Labels, foco, Radix, shimmer reduzido e grades adaptáveis        | E2E com axe/teclado, 24 capturas e `verificar-responsividade.mjs`                            |
| Desempenho e entrega               | Build com assets locais, Lighthouse e fallback SPA               | 12 auditorias, comparação de hashes e E2E na publicação                                      |

A matriz relaciona comportamentos verificáveis. A comparação visual com o Figma continua sujeita aos desvios declarados acima.

## Retomada após inatividade

O navegador pode encerrar um service worker e perder sua lista de clientes ativos. Antes de cada requisição Axios, a demonstração envia MOCK_ACTIVATE e aguarda MOCKING_ENABLED, sem reiniciar handlers, banco ou Socket.IO. Requisições simultâneas compartilham o handshake; há prazo de dois segundos e limpeza dos listeners. A preparação não repete mutations e não altera a chave de idempotência. As credenciais são capturadas antes da espera para que uma troca de conta não reatribua a operação.

Um teste Chromium encerra o worker pelo protocolo do navegador e consulta o catálogo novamente. Outro faz a retomada com um pedido pendente e confirma que há somente uma transação. Expiração da sessão tem mensagem própria no login; respostas HTTP não estruturadas informam seu status, em vez de aparecerem como falta de conexão.

Na corrida em que o worker para entre a confirmação do handshake e o envio da consulta, somente um GET pode ser repetido, uma vez, se receber HTML da hospedagem ou um 404 sem o contrato JSON da API. Erros de negócio estruturados, falhas intencionais de conexão e mutations não recebem essa repetição automática.

A Vercel também pode devolver seu 404 em JSON. A distinção utiliza o contrato `{ mensagem: string }` da API, em vez de presumir que toda resposta JSON veio do mock. O teste do pedido interrompe o worker durante a navegação e verifica a retomada da mesma transação na publicação.

## Recursos inexistentes

Rotas desconhecidas, NFTs ausentes e pedidos inexistentes apresentam páginas 404 com retorno ao início e ao catálogo. A classificação exige status 404 da API: erros 403 e 503 continuam visíveis como falhas de permissão ou indisponibilidade. Uma hospedagem SPA retorna o documento de entrada; o estado 404 da tela é tratado pelo Router e a API simulada retorna o status correspondente.

## Contratos de integração

Os schemas executáveis ficam em `src/dominio/contratos.ts`.

### Regras comuns

- `Authorization: Bearer <token>` nas operações autenticadas. Token ausente/expirado retorna 401.
- `X-Visitante: <uuid>` identifica o carrinho público antes de login. A sessão autenticada sempre prevalece sobre esse header.
- Resposta de erro: `{ "mensagem": "Texto em português" }`.
- ETH: string decimal positiva com até 18 casas. Quantidade: inteiro positivo. Versões: inteiros.
- Status: 400 identificação inválida, 401 sessão inválida, 403 proprietário/permissão, 404 recurso ausente, 409 conflito, 422 validação, 503 falha transitória.
- Os POSTs de pedido exigem `Idempotency-Key`; a chave é escopada pelo usuário.

### Recursos

| Método / caminho           | Entrada                                                    | Resposta                                                                                                                               |
| -------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| POST `/cadastro`           | nome, email, senha                                         | token e perfil público; 409 se e-mail existe                                                                                           |
| POST `/login`              | email, senha                                               | token e perfil; 422 para credenciais inválidas                                                                                         |
| GET `/sessao`              | token                                                      | perfil público da sessão                                                                                                               |
| POST `/logout`             | token                                                      | `{ sucesso: true }`; token revogado                                                                                                    |
| GET `/nfts`                | aba, busca, categoria, rede, ordem, pagina, minimo, maximo | itens, total, paginas; nove itens por página                                                                                           |
| GET `/facetas`             | sem parâmetros                                             | contagens reais por categoria e rede                                                                                                   |
| GET `/nfts/:id`            | identificador                                              | NFT com edições e versão; 404 se ausente                                                                                               |
| GET `/favoritos`           | token                                                      | lista de identificadores                                                                                                               |
| POST / DELETE `/favoritos` | nftId                                                      | lista atualizada; exige sessão                                                                                                         |
| GET `/carrinho`            | visitante ou sessão                                        | itens com preço/estoque atuais e cupom                                                                                                 |
| POST `/carrinho`           | nftId, edicaoId, quantidade                                | soma à linha existente, respeitando estoque                                                                                            |
| PATCH `/carrinho`          | nftId, edicaoId, quantidade                                | substitui quantidade; 409 se indisponível                                                                                              |
| DELETE `/carrinho`         | nftId, edicaoId                                            | remove a linha composta                                                                                                                |
| GET `/cotacao`             | visitante ou sessão                                        | id, itens, cupom, subtotal, desconto, taxa, total                                                                                      |
| POST `/cotacao`            | cupom, string vazia para remover                           | valida e retorna cotação atual; 422 se inválido/expirado                                                                               |
| GET / PATCH `/perfil`      | dados públicos/avatar na alteração                         | perfil persistido; e-mail em conflito retorna 409                                                                                      |
| PATCH `/senha`             | atual, nova                                                | sucesso; valida hash atual e complexidade                                                                                              |
| GET `/carteiras`           | token                                                      | até duas carteiras da conta                                                                                                            |
| POST / PATCH `/carteiras`  | id, nome, endereco, rede, tipo, principal                  | lista atualizada; endereço 0x de 40 caracteres; apelido, nomePerfil, email, ens, indicacao e enderecoSecundario também são persistidos |
| POST `/conexao`            | carteiraId, acao: conectar/recusar/desconectar             | estado e carteiraId; conexão é registrada na sessão                                                                                    |
| GET `/pedidos`             | token                                                      | pedidos somente da conta atual                                                                                                         |
| POST `/pedidos`            | corpo abaixo + Idempotency-Key                             | pedido pendente (201), replay do mesmo pedido (200), 409 para chave reutilizada com outro corpo                                        |
| GET `/pedidos/:id`         | token                                                      | estado e snapshot; 403 se pertence a outra conta                                                                                       |
| GET / POST `/simulacao`    | cenário e/ou ação                                          | cenário atual; apenas disponível com os mocks                                                                                          |

```json
{
  "cotacaoId": "identificador determinístico retornado pela API",
  "carteiraId": "ana-principal",
  "rede": "Ethereum",
  "conectado": true,
  "nome": "Ana Oliveira",
  "email": "ana@exemplo.com",
  "apelido": "ana.arte",
  "nomePerfil": "ana.arte",
  "indicacao": "KURIO",
  "ens": "ana.eth",
  "observacao": "",
  "enderecoSecundario": ""
}
```

A API exige que a carteira pertença à conta, corresponda à rede e esteja conectada na sessão. Ela recalcula a cotação antes de reservar estoque. `conectado: true` enviado isoladamente não substitui essa verificação.

Perfil também persiste ENS e apelido da carteira. Os campos obrigatórios dos formulários de conta são validados na interface e na API, enquanto os contratos de leitura mantêm compatibilidade com snapshots anteriores. A migração de catálogo atualiza nomes e metadados das fixtures sem apagar contas, carrinhos, estoque ou pedidos históricos.

Um NFT inclui id, nome, criador, categoria, rede, imagem local, descrição, versão, coleção, atributos, contrato ilustrativo, royalties, raridade, preço anterior opcional, flags de lançamento/alta, avaliação agregada e edições com id, nome, disponibilidade e preço. As abas filtram as flags na API. Uma linha tem chave NFT+edição e quantidade. O pedido inclui usuário, estado, versão, snapshot da cotação, coletor, carteira, referência de transação e tempos da simulação.

### Eventos Socket.IO

Origem da aplicação com transporte `websocket`, path `/socket.io/` e namespace `/`. Token fictício na query do handshake; não usar essa estratégia para segredos de produção.

```json
{
  "id": "nft.updated:1:2",
  "recursoId": "1",
  "versao": 2
}
```

| Evento          | Escopo e reação                                                                   |
| --------------- | --------------------------------------------------------------------------------- |
| `nft.updated`   | Público; invalida catálogo, detalhe, carrinho e cotação                           |
| `order.updated` | Privado; inclui usuarioId e invalida pedido, histórico e carrinho do proprietário |

Identidade é estável para tipo+recurso+versão. O cliente rejeita versões menores ou iguais à já observada. Reconnect relê recursos ativos. Pedidos terminais nunca voltam a pendente. Os eventos não são aplicados diretamente a setters ou usados como substituto do transporte.

### Referências técnicas

- [TanStack Router — Search Params](https://tanstack.com/router/latest/docs/framework/react/guide/search-params)
- [TanStack Query — Optimistic Updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)
- [Axios — Cancellation](https://axios.rest/pages/advanced/cancellation)
- [Socket.IO — Client Options](https://socket.io/docs/v4/client-options/)
- [Binding MSW Socket.IO](https://github.com/mswjs/socket.io-binding) e declarações da versão 0.2.0 instalada
- [shadcn/ui — Button](https://ui.shadcn.com/docs/components/button)
- [Playwright — Visual Comparisons](https://playwright.dev/docs/test-snapshots)
- [Lighthouse — Performance Scoring](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring)

## Assets e atribuições

Os quatro retratos em `assets/originais/` foram exportados do Figma do desafio e convertidos para WebP em `public/imagens/`, com largura de 640 px e qualidade 85. As três camadas PNG do destaque móvel e os vetores em `public/icones/` também foram exportados da referência. A autoria das artes permanece com seus autores. Os criadores e colecionadores das fixtures são fictícios e não constituem créditos das imagens.

Roboto Mono é servida localmente como WOFF2 nos pesos 400 e 700, sob a licença SIL OFL em `public/fontes/OFL.txt`. A família foi identificada pela comparação dos contornos e métricas dos glifos exportados com os da fonte oficial; o Figma expõe apenas o alias `font/family`. A versão local deriva do [repositório Google Fonts](https://github.com/google/fonts/tree/main/ofl/robotomono), com subconjunto latino. Os dois pesos somam cerca de 24 KB; a redução mantém os contornos, métricas e caracteres necessários aos textos em português. Os ícones exportados do Figma ficam em `public/icones/`; Lucide (ISC) complementa controles e estados sem vetor próprio. Button e Dialog seguem shadcn/ui/Radix, sob MIT, com os tokens do marketplace.
