/** Inicializa os mocks antes de permitir que qualquer consulta da aplicação seja executada. */
import './estilos.css';

/** A mesma configuração ativa MSW no desenvolvimento e no build público de demonstração. */
async function iniciar() {
  // Baixa a interface enquanto o worker inicializa, sem antecipar nenhuma chamada REST.
  const interfacePronta = import('./aplicacao');
  if (import.meta.env.VITE_MOCKS !== 'false') {
    const { trabalhador } = await import('./simulacao/rede');
    await trabalhador.start({ onUnhandledRequest: 'bypass', quiet: true });
  }
  const { montarAplicacao } = await interfacePronta;
  montarAplicacao();
}
void iniciar().catch(() => {
  const raiz = document.getElementById('root');
  if (raiz)
    raiz.textContent =
      'Não foi possível iniciar a aplicação. Recarregue a página para tentar novamente.';
});
