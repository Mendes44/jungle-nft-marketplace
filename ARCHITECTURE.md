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

Desvios do Figma: nomes e descrições traduzidos; fonte IBM Plex Mono substitui a variável não resolvida `font/family`; informações de demonstração e conexão; seleção de rede vinculada à carteira cadastrada; histórico para recuperação. Login e cadastro usam rotas próprias, em vez do modal desktop da referência. Perfil inclui biografia; a organização dos formulários de conta e de revisão foi adaptada aos contratos. O recibo é uma rota recuperável. Seções editoriais fora do escopo são reduzidas, sem cadastro de newsletter ou autenticação social fictícios. A navegação e o rodapé usam destinos reais ou diálogos explicativos. Estas escolhas mantêm os fluxos completos, mas não representam reprodução pixel a pixel.

## Carregamento e entrega dos arquivos

O ponto de entrada inicia MSW e baixa a aplicação em paralelo, montando a árvore somente quando a interceptação está pronta. Compra e conta são carregadas por funcionalidade com `lazyRouteComponent`. Fontes WOFF2 e imagens WebP são locais; o destaque possui preload. As dimensões do detalhe e de seu skeleton coincidem para reduzir CLS.

O plugin local `configuracao/compressao.ts` pré-comprime texto em Brotli no build e serve os arquivos comprimidos no preview quando o navegador aceita esse encoding. O fallback continua com o Vite. Isso reproduz uma entrega estática comprimida, também oferecida pela hospedagem, sem retirar mocks ou conteúdo das auditorias. O cabeçalho Vary evita compartilhar uma resposta comprimida com clientes incompatíveis.

## Verificação e publicação

Playwright usa contextos isolados, relógio estável em screenshots e ações de cenário via interface/REST. O socket observado é o cliente Socket.IO real interceptado. O build auditado é o mesmo build funcional, sem remoção de fonte, imagem ou mock para a medição.

Vercel e Netlify possuem fallback SPA. MSW é ativado por configuração e incluído no build padrão. A origem WebSocket acompanha HTTP/HTTPS da implantação, permitindo funcionamento estático sem um backend privado.

Resultados, limites da referência visual e endereços publicados estão em `docs/validacao.md`. A matriz de requisitos diferencia comportamento implementado de pendências visuais e evidências realmente executadas.
