/** Inicializa os mocks antes de permitir que qualquer consulta da aplicação seja executada. */
import './estilos.css';
import { criarPreparacaoTransporte } from './simulacao/retomada';

/** A mesma configuração ativa MSW no desenvolvimento e no build público de demonstração. */
async function iniciar() {
  // Baixa a interface enquanto o worker inicializa, sem antecipar nenhuma chamada REST.
  const interfacePronta = import('./aplicacao');
  let prepararTransporte: (() => Promise<void>) | undefined;
  if (import.meta.env.VITE_MOCKS !== 'false') {
    const { trabalhador } = await import('./simulacao/rede');
    const registro = await trabalhador.start({ onUnhandledRequest: 'bypass', quiet: true });
    if (registro) {
      prepararTransporte = criarPreparacaoTransporte(registro);
    }
  }
  const { montarAplicacao } = await interfacePronta;
  montarAplicacao(prepararTransporte);
}
void iniciar().catch(() => {
  const raiz = document.getElementById('root');
  if (raiz)
    raiz.textContent =
      'Não foi possível iniciar a aplicação. Recarregue a página para tentar novamente.';
});
