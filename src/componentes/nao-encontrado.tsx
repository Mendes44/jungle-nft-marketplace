/** Páginas de ausência mantêm contexto e caminhos de retorno sem tratar falhas transitórias como 404. */
import { Link } from '@tanstack/react-router';
import { SearchX, Home, ShoppingBag } from 'lucide-react';
import { Button } from './ui/button';

/** Exibe uma rota, obra ou pedido inexistente com a identidade visual do marketplace. */
export function NaoEncontrado({ recurso }: { recurso?: 'NFT' | 'pedido' }) {
  const titulo =
    recurso === 'NFT'
      ? 'NFT não encontrado.'
      : recurso === 'pedido'
        ? 'Pedido não encontrado.'
        : 'Esta página não foi encontrada.';
  return (
    <section
      className="nao-encontrado"
      aria-labelledby="titulo-ausente"
      role={recurso ? 'alert' : undefined}
    >
      <div className="emblema-ausente" aria-hidden="true">
        <SearchX size={44} strokeWidth={1.4} />
      </div>
      <p className="sobretitulo">ERRO 404</p>
      <h1 id="titulo-ausente">{titulo}</h1>
      <p>
        {recurso
          ? `${recurso === 'NFT' ? 'A obra' : 'O pedido'} pode ter sido removido ou o endereço informado está incorreto.`
          : 'O endereço pode ter mudado. Você pode voltar ao início ou continuar explorando as obras.'}
      </p>
      <div className="acoes-ausente">
        <Button asChild>
          <Link to="/">
            <Home size={17} aria-hidden="true" />
            Voltar ao início
          </Link>
        </Button>
        <Button asChild variant="outline">
          <a href="/#catalogo">
            <ShoppingBag size={17} aria-hidden="true" />
            Explorar catálogo
          </a>
        </Button>
      </div>
    </section>
  );
}
