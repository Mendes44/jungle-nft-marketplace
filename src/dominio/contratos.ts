/** Contratos compartilhados pela API, simulação e interface. Zod valida cada fronteira de rede. */
import { z } from 'zod';

z.config(z.locales.pt());

export const ethSchema = z.string().regex(/^\d+(\.\d{1,18})?$/);
export const edicaoSchema = z.object({
  id: z.string(),
  nome: z.string(),
  disponivel: z.number().int().nonnegative(),
  preco: ethSchema,
});
export const nftSchema = z.object({
  id: z.string(),
  nome: z.string(),
  criador: z.string(),
  categoria: z.string(),
  rede: z.string(),
  imagem: z.string(),
  precoAnterior: ethSchema.optional(),
  raridade: z.enum(['comum', 'raro']).default('comum'),
  descricao: z.string(),
  colecao: z.string().default('Kurio Apes'),
  atributos: z.array(z.string()).default([]),
  contrato: z.string().default('0x7A42...19E8'),
  direitosAutorais: z.number().min(0).max(100).default(5),
  versao: z.number().int(),
  novo: z.boolean().default(false),
  emAlta: z.boolean().default(false),
  avaliacoes: z
    .object({ media: z.number().min(0).max(5), total: z.number().int().nonnegative() })
    .default({ media: 4.8, total: 19 }),
  edicoes: z.array(edicaoSchema),
});
export const itemSchema = z.object({
  nftId: z.string(),
  edicaoId: z.string(),
  quantidade: z.number().int().positive(),
});
export const linhaSchema = itemSchema.extend({
  nome: z.string(),
  edicao: z.string(),
  imagem: z.string(),
  preco: ethSchema,
  disponivel: z.number().int(),
});
export const carrinhoSchema = z.object({ itens: z.array(linhaSchema), cupom: z.string() });
export const cotacaoSchema = z.object({
  id: z.string(),
  itens: z.array(linhaSchema),
  cupom: z.string(),
  subtotal: ethSchema,
  desconto: ethSchema,
  taxa: ethSchema,
  total: ethSchema,
});
/** ENS e endereços auxiliares são validados sem consultar registros externos. */
export const ensSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9-]+\.eth$/, 'Informe um nome ENS terminado em .eth, como ana.eth.');
const enderecoAuxiliarSchema = z
  .string()
  .trim()
  .refine(
    (valor) => !valor || /^0x[a-fA-F0-9]{40}$/.test(valor) || /^[a-z0-9-]+\.eth$/i.test(valor),
    'Informe um endereço 0x válido ou um nome ENS terminado em .eth.',
  );
export const perfilSchema = z.object({
  id: z.string(),
  nome: z.string(),
  email: z.email(),
  apelido: z.string(),
  biografia: z.string(),
  avatar: z.string(),
  ens: z.union([ensSchema, z.literal('')]).default(''),
  nomeCarteira: z.string().default(''),
});
export const carteiraSchema = z.object({
  id: z.string(),
  nome: z.string().min(2),
  endereco: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Informe um endereço 0x com 40 caracteres hexadecimais.'),
  rede: z.enum(['Ethereum', 'Polygon']),
  tipo: z.enum(['MetaMask', 'Coinbase Wallet', 'WalletConnect']),
  principal: z.boolean(),
  apelido: z.string().default(''),
  nomePerfil: z.string().default(''),
  email: z.union([z.email('Informe um e-mail válido.'), z.literal('')]).default(''),
  ens: z.union([ensSchema, z.literal('')]).default(''),
  indicacao: z.string().default(''),
  enderecoSecundario: enderecoAuxiliarSchema.default(''),
});
/** O contrato de escrita exige os campos do formulário; snapshots antigos continuam legíveis. */
export const dadosCarteiraSchema = carteiraSchema.extend({
  apelido: z.string().min(2, 'Informe o apelido da carteira.'),
  nomePerfil: z.string().min(2, 'Informe o nome do perfil.'),
  email: z.email('Informe um e-mail válido.'),
  ens: ensSchema,
  indicacao: z.string().min(3, 'Informe o código de indicação.'),
});
export const colecionadorSchema = z.object({
  nome: z.string().min(3, 'Informe o nome de exibição.'),
  email: z.email('Informe um e-mail válido.'),
  apelido: z.string().min(2, 'Informe o nome de usuário.'),
  nomePerfil: z.string().min(2, 'Informe o nome de perfil.'),
  indicacao: z.string().min(3, 'Informe o código de indicação.'),
  ens: ensSchema,
  observacao: z.string().max(500),
  enderecoSecundario: enderecoAuxiliarSchema,
});
export const envioPedidoSchema = colecionadorSchema.extend({
  cotacaoId: z.string(),
  carteiraId: z.string(),
  rede: z.string(),
  provedor: carteiraSchema.shape.tipo.optional(),
  conectado: z.literal(true),
});
export const pedidoSchema = z.object({
  id: z.string(),
  usuarioId: z.string(),
  estado: z.enum(['pendente', 'confirmado', 'recusado']),
  versao: z.number().int(),
  cotacao: cotacaoSchema,
  transacao: z.string(),
  carteira: carteiraSchema,
  colecionador: colecionadorSchema,
  criadoEm: z.number(),
  finalizarEm: z.number(),
  recusar: z.boolean(),
});
export const eventoSchema = z.object({
  id: z.string(),
  recursoId: z.string(),
  versao: z.number().int(),
  usuarioId: z.string().optional(),
});
export const cadastroSchema = z.object({
  nome: z.string().min(3, 'Informe seu nome completo.'),
  email: z.email('Informe um e-mail válido.'),
  senha: z
    .string()
    .min(8, 'Use pelo menos 8 caracteres.')
    .regex(/[0-9]/, 'Inclua um número na senha.'),
});
export const dadosPerfilSchema = perfilSchema.omit({ id: true, avatar: true }).extend({
  nome: z.string().min(3),
  apelido: z.string().min(2),
  biografia: z.string().max(300),
  avatar: z.string().max(600000),
  ens: ensSchema,
  nomeCarteira: z.string().min(2, 'Informe o apelido da carteira.'),
});
export const filtrosSchema = z.object({
  aba: z.enum(['todos', 'novos', 'alta']).catch('todos'),
  busca: z.string().catch(''),
  categoria: z.string().catch(''),
  rede: z.string().catch(''),
  ordem: z.enum(['recentes', 'menor', 'maior']).catch('recentes'),
  pagina: z.coerce.number().int().min(1).catch(1),
  minimo: ethSchema.catch('0.02'),
  maximo: ethSchema.catch('12.30'),
});
export const facetasSchema = z.object({
  categorias: z.array(z.object({ nome: z.string(), total: z.number().int() })),
  redes: z.array(z.object({ nome: z.string(), total: z.number().int() })),
});
export const catalogoSchema = z.object({
  itens: z.array(nftSchema),
  total: z.number().int(),
  paginas: z.number().int(),
});
export type Nft = z.infer<typeof nftSchema>;
export type Item = z.infer<typeof itemSchema>;
export type Linha = z.infer<typeof linhaSchema>;
export type Cotacao = z.infer<typeof cotacaoSchema>;
export type Perfil = z.infer<typeof perfilSchema>;
export type Carteira = z.infer<typeof carteiraSchema>;
export type Pedido = z.infer<typeof pedidoSchema>;
export type Filtros = z.infer<typeof filtrosSchema>;
export type Evento = z.infer<typeof eventoSchema>;
