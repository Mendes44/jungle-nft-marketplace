/** Conversão do campo composto do layout para o nome ENS completo enviado à API. */
export function completarEns(texto: string): string {
  const nome = texto.trim();
  return nome && !nome.includes('.') ? `${nome}.eth` : nome;
}
