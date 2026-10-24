# Contratos REST e eventos

Base `/api`. Todas as chamadas da aplicação usam Axios. O transporte é interceptado por MSW no modo padrão. Os schemas completos e executáveis estão em `src/dominio/contratos.ts`.

## Regras comuns

- `Authorization: Bearer <token>` nas operações autenticadas. Token ausente/expirado retorna 401.
- `X-Visitante: <uuid>` identifica o carrinho público antes de login. A sessão autenticada sempre prevalece sobre esse header.
- Resposta de erro: `{ "mensagem": "Texto em português" }`.
- ETH: string decimal positiva com até 18 casas. Quantidade: inteiro positivo. Versões: inteiros.
- Status: 400 identificação inválida, 401 sessão inválida, 403 proprietário/permissão, 404 recurso ausente, 409 conflito, 422 validação, 503 falha transitória.
- Os POSTs de pedido exigem `Idempotency-Key`; a chave é escopada pelo usuário.

## Recursos

| Método / caminho           | Entrada                                               | Resposta                                                                                        |
| -------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| POST `/cadastro`           | nome, email, senha                                    | token e perfil público; 409 se e-mail existe                                                    |
| POST `/login`              | email, senha                                          | token e perfil; 422 para credenciais inválidas                                                  |
| GET `/sessao`              | token                                                 | perfil público da sessão                                                                        |
| POST `/logout`             | token                                                 | `{ sucesso: true }`; token revogado                                                             |
| GET `/nfts`                | busca, categoria, rede, ordem, pagina, minimo, maximo | itens, total, paginas; nove itens por página                                                    |
| GET `/nfts/:id`            | identificador                                         | NFT com edições e versão; 404 se ausente                                                        |
| GET `/favoritos`           | token                                                 | lista de identificadores                                                                        |
| POST / DELETE `/favoritos` | nftId                                                 | lista atualizada; exige sessão                                                                  |
| GET `/carrinho`            | visitante ou sessão                                   | itens com preço/estoque atuais e cupom                                                          |
| POST `/carrinho`           | nftId, edicaoId, quantidade                           | soma à linha existente, respeitando estoque                                                     |
| PATCH `/carrinho`          | nftId, edicaoId, quantidade                           | substitui quantidade; 409 se indisponível                                                       |
| DELETE `/carrinho`         | nftId, edicaoId                                       | remove a linha composta                                                                         |
| GET `/cotacao`             | visitante ou sessão                                   | id, itens, cupom, subtotal, desconto, taxa, total                                               |
| POST `/cotacao`            | cupom, string vazia para remover                      | valida e retorna cotação atual; 422 se inválido/expirado                                        |
| GET / PATCH `/perfil`      | dados públicos/avatar na alteração                    | perfil persistido; e-mail em conflito retorna 409                                               |
| PATCH `/senha`             | atual, nova                                           | sucesso; valida hash atual e complexidade                                                       |
| GET `/carteiras`           | token                                                 | até duas carteiras da conta                                                                     |
| POST / PATCH `/carteiras`  | id, nome, endereco, rede, tipo, principal             | lista atualizada; endereço hexadecimal 0x de 40 caracteres                                      |
| POST `/conexao`            | carteiraId, acao: conectar/recusar/desconectar        | estado e carteiraId; conexão é registrada na sessão                                             |
| GET `/pedidos`             | token                                                 | pedidos somente da conta atual                                                                  |
| POST `/pedidos`            | corpo abaixo + Idempotency-Key                        | pedido pendente (201), replay do mesmo pedido (200), 409 para chave reutilizada com outro corpo |
| GET `/pedidos/:id`         | token                                                 | estado e snapshot; 403 se pertence a outra conta                                                |
| GET / POST `/simulacao`    | cenário e/ou ação                                     | cenário atual; apenas disponível com os mocks                                                   |

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

Um NFT inclui id, nome, criador, categoria, rede, imagem local, descrição, versão e edições com id, nome, disponibilidade e preço. Uma linha tem chave NFT+edição e quantidade. O pedido inclui usuário, estado, versão, snapshot da cotação, coletor, carteira, referência de transação e tempos da simulação.

## Eventos Socket.IO

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

## Referências técnicas consultadas

- [TanStack Router — Search Params](https://tanstack.com/router/latest/docs/framework/react/guide/search-params)
- [TanStack Query — Optimistic Updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)
- [Axios — Cancellation](https://axios.rest/pages/advanced/cancellation)
- [Socket.IO — Client Options](https://socket.io/docs/v4/client-options/)
- [Binding MSW Socket.IO](https://github.com/mswjs/socket.io-binding) e declarações da versão 0.2.0 instalada
- [shadcn/ui — Button](https://ui.shadcn.com/docs/components/button)
- [Playwright — Visual Comparisons](https://playwright.dev/docs/test-snapshots)
- [Lighthouse — Performance Scoring](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring)
