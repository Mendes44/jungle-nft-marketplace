/** Valores monetários usam wei: nenhuma operação financeira passa por ponto flutuante. */
const escalaWei = 10n ** 18n;

/** Converte uma string decimal já validada para a unidade inteira mínima de ETH. */
export function paraWei(valor: string): bigint {
  if (!/^\d+(\.\d{1,18})?$/.test(valor)) throw new Error('Valor ETH inválido.');
  const [inteiro, fracao = ''] = valor.split('.');
  return BigInt(inteiro) * escalaWei + BigInt(fracao.padEnd(18, '0'));
}
/** Serializa wei sem perder casas decimais e sem zeros supérfluos. */
export function deWei(valor: bigint): string {
  const fracao = (valor % escalaWei).toString().padStart(18, '0').replace(/0+$/, '');
  return `${valor / escalaWei}${fracao ? `.${fracao}` : ''}`;
}
/** Apresenta o valor integral com o separador decimal do Figma, sem arredondamentos ocultos. */
export function exibirEth(valor: string): string {
  return `${valor} ETH`;
}
