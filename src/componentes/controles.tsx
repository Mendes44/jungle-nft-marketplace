/** Controles de quantidade e navegação reutilizados nos fluxos com a apresentação do Figma. */
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Minus, Plus, Eye } from 'lucide-react';

/** Mantém edição direta, teclado e botões incrementais dentro dos limites informados pela API. */
export function ControleQuantidade({
  valor,
  maximo,
  alterar,
  rotulo,
  desabilitado = false,
}: {
  valor: number;
  maximo: number;
  alterar: (quantidade: number) => void;
  rotulo: string;
  desabilitado?: boolean;
}) {
  return (
    <div className="controle-quantidade">
      <button
        type="button"
        aria-label={`Diminuir ${rotulo.toLowerCase()}`}
        disabled={desabilitado || valor <= 1}
        onClick={() => alterar(valor - 1)}
      >
        <Minus size={16} />
      </button>
      <input
        type="number"
        aria-label={rotulo}
        min="1"
        max={Math.max(maximo, valor)}
        value={valor}
        disabled={desabilitado}
        onChange={(evento) => {
          const quantidade = evento.target.valueAsNumber;
          if (Number.isInteger(quantidade) && quantidade > 0) alterar(quantidade);
        }}
      />
      <button
        type="button"
        aria-label={`Aumentar ${rotulo.toLowerCase()}`}
        disabled={desabilitado || valor >= maximo}
        onClick={() => alterar(valor + 1)}
      >
        <Plus size={16} />
      </button>
    </div>
  );
}

/** O retorno móvel preserva um destino útil mesmo em acessos diretos sem histórico de navegação. */
export function VoltarAoMercado() {
  return (
    <Link className="voltar-movel" to="/" aria-label="Voltar ao mercado">
      <img src="/icones/voltar.svg" width="12" height="18" alt="" />
    </Link>
  );
}

/** O domínio permanece explícito e o valor completo é normalizado antes de chegar ao contrato REST. */
export function EntradaEns({
  id,
  nome = 'ens',
  valorInicial = '',
  erroId,
  invalido = false,
  aoAlterar,
}: {
  id: string;
  nome?: string;
  valorInicial?: string;
  erroId?: string;
  invalido?: boolean;
  aoAlterar?: () => void;
}) {
  return (
    <div className="entrada-ens">
      <select aria-label="Domínio do ENS" defaultValue=".eth">
        <option>.eth</option>
      </select>
      <input
        id={id}
        name={nome}
        defaultValue={valorInicial.replace(/\.eth$/i, '')}
        aria-invalid={invalido}
        aria-describedby={erroId}
        onChange={aoAlterar}
      />
    </div>
  );
}

/** Mostrar ou ocultar a senha não altera seu valor nem o atributo de preenchimento automático. */
export function EntradaSenha({
  id,
  nome,
  rotulo,
  placeholder = 'Senha',
  erroId,
  invalido = false,
  autocomplete = 'current-password',
}: {
  id: string;
  nome: string;
  rotulo: string;
  placeholder?: string;
  erroId?: string;
  invalido?: boolean;
  autocomplete?: string;
}) {
  const [visivel, definirVisivel] = useState(false);
  return (
    <div className="entrada-senha">
      <input
        id={id}
        name={nome}
        type={visivel ? 'text' : 'password'}
        placeholder={placeholder}
        autoComplete={autocomplete}
        aria-invalid={invalido}
        aria-describedby={erroId}
      />
      <button
        type="button"
        aria-label={`${visivel ? 'Ocultar' : 'Mostrar'} ${rotulo.toLowerCase()}`}
        aria-pressed={visivel}
        onClick={() => definirVisivel(!visivel)}
      >
        {visivel ? (
          <Eye size={18} />
        ) : (
          <img src="/icones/senha-oculta.svg" width="20" height="20" alt="" />
        )}
      </button>
    </div>
  );
}
