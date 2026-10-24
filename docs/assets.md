# Origem dos assets

Os quatro retratos foram exportados da propriedade de imagem no Figma do desafio. Os nomes de arquivo locais correspondem à ordem abaixo. A arte permanece sob os direitos de seus autores; não se atribui sua criação ao implementador da aplicação.

| Original local                   | Retrato                             | Identificador no Figma                     |
| -------------------------------- | ----------------------------------- | ------------------------------------------ |
| `assets/originais/colecao-0.png` | Macaco com óculos e jaqueta verde   | `8459204731e6eba9d474cbc8ebc37071360d3ba5` |
| `assets/originais/colecao-1.png` | Macaco com chapéu e moletom violeta | `2986a7cb16d09de8970824d2dd58bf0bb021702c` |
| `assets/originais/colecao-2.png` | Macaco de paletó claro              | `9df2ff42dd27ba657621c304557d1a855a4be6a5` |
| `assets/originais/colecao-3.png` | Macaco dourado com fones            | `87580f2def9af0ce13f4b6f6ce17bb2449bcfc16` |

As derivações em `public/imagens/colecao-0.webp` a `colecao-3.webp` têm largura de 640 px e qualidade 85, geradas por `node scripts/otimizar-imagens.mjs`. A composição não foi alterada. O Figma reutiliza esses retratos em vários NFTs; as fixtures fazem o mesmo.

`docs/referencia-figma.pdf`: exportação dos 15 frames, em qualidade média sRGB, obtida no menu oficial do Figma. Os frames foram renderizados com Poppler e revisados. Este arquivo é a referência, separado do guia técnico autoral.

`public/fontes`: IBM Plex Mono, obtida de `@fontsource/ibm-plex-mono`, pesos 400 e 700, servida localmente. Licença SIL OFL em `public/fontes/OFL.txt`. O painel de propriedades expõe a família como a variável `font/family`, sem resolução. IBM Plex Mono conserva a intenção monoespaçada e permanece uma substituição declarada. O estilo Display/43 Bold, peso 700, tamanho 43 px e entrelinha de 70 px foi conferido para o título desktop.

Ícones: Lucide, licença ISC, por pacote instalado. Componentes Button e composição Dialog: padrão shadcn/ui/Radix, licença MIT, com tokens adaptados. O favicon vetorial com a letra K é autoral.

Os nomes de criadores das fixtures são fictícios e não constituem créditos de autoria das imagens.
