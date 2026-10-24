# Revisão visual

Referência: `docs/referencia-figma.pdf`, exportada pelo menu do Figma em qualidade média sRGB. Foram renderizadas e inspecionadas as 15 páginas com Poppler. Os frames desktop têm largura de 1440 px; os móveis, 414 px. A regressão da aplicação usa 1440 e 390 px, com verificação adicional de overflow em 768 px.

| Página | Frame inspecionado  | Conferência e adaptação na aplicação                                                                                                                                           |
| ------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1      | Início desktop      | Destaque, filtros laterais, nove cartões, paginação e rodapé. Busca e filtros incluem labels e controles acessíveis. As seções editoriais foram reduzidas.                     |
| 2      | Detalhe desktop     | Miniaturas, imagem, informações, edição, quantidade, favorito e outras obras. As fixtures oferecem edição disponível e esgotada; avaliações fictícias não foram acrescentadas. |
| 3      | Carrinho desktop    | Linhas com arte, edição, quantidade, remoção, cupom e resumo. A taxa é calculada pela API simulada e não copiada do número estático do frame.                                  |
| 4      | Pagamento desktop   | Dados do coletor, observação, carteira/rede, NFTs e resumo. A revisão explícita antecede o envio.                                                                              |
| 5      | Confirmação desktop | Arte dos itens, referência de transação, carteira, rede, taxa e total. O resultado usa rota recuperável e snapshot real da simulação.                                          |
| 6      | Login desktop       | Campos e entrada/alternância para cadastro. A aplicação usa rota própria. Autenticação social não simula um serviço ausente.                                                   |
| 7      | Cadastro desktop    | Nome, e-mail, senha e confirmação, com validações e conflito da API. A aplicação usa rota própria.                                                                             |
| 8      | Perfil desktop      | Dados, avatar e senha; campos e organização foram adaptados aos contratos, incluindo biografia.                                                                                |
| 9      | Carteiras desktop   | Carteira principal e secundária, rede, endereço e tipo. A listagem e o formulário são persistidos pela API.                                                                    |
| 10     | Início mobile       | Destaque compacto com dois retratos, cartões em duas colunas e navegação inferior. Filtros ficam em painel expansível.                                                         |
| 11     | Detalhe mobile      | Arte principal, informações agrupadas e ações acessíveis. Miniaturas ficam abaixo da arte; conteúdo pode rolar sem corte.                                                      |
| 12     | Carrinho mobile     | Cartões arredondados, quantidade, remoção, cupom e resumo. Campos mantêm nomes acessíveis mesmo quando o label longo fica visualmente oculto.                                  |
| 13     | Pagamento mobile    | Carteiras cadastradas e rede, conexão e confirmação. Dados obrigatórios e revisão permanecem disponíveis por rolagem.                                                          |
| 14     | Login mobile        | Formulário em coluna, labels, validação e retorno ao fluxo.                                                                                                                    |
| 15     | Cadastro mobile     | Campos em coluna, confirmação de senha e alternância para login.                                                                                                               |

Também foram revisadas as oito screenshots finais da aplicação: início, detalhe, carrinho e pagamento, nos dois perfis. Os testes comparam a aplicação às próprias baselines; a revisão do Figma foi manual. Em capturas de página inteira, a barra móvel fixa aparece na posição do viewport no momento da captura, enquanto o restante da página é expandido pelo Playwright.

## Propriedades conferidas no arquivo

Fundo #140D0A; painel #241612; texto #F5F1EB; secundário #CFB28C; cobre #D28A4C. O estilo Display/43 Bold do título desktop tem peso 700, tamanho 43 px e entrelinha 70 px. Foram preservados os quatro retratos originais e o recorte quadrado da apresentação. A lista completa e as licenças estão em `docs/assets.md`.

A família aparece como `font/family`, sem valor resolvido na inspeção. IBM Plex Mono é a substituição local. A hierarquia e a composição foram adaptadas para os estados funcionais, de erro e de acessibilidade descritos em `ARCHITECTURE.md`. A entrega não declara igualdade pixel a pixel.
