/** Elementos de formulário, estados assíncronos e diálogo acessível usados nos fluxos. */
import { useId, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { mensagemErro } from '../infraestrutura/api';

/** Associa label e erro ao controle sem depender apenas da cor para validação. */
export function Campo({
  rotulo,
  erro,
  children,
}: {
  rotulo: string;
  erro?: string;
  children: (id: string, erroId: string | undefined) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="campo">
      <label htmlFor={id}>{rotulo}</label>
      {children(id, erro ? `${id}-erro` : undefined)}
      {erro && (
        <small className="erro" id={`${id}-erro`}>
          {erro}
        </small>
      )}
    </div>
  );
}
/** Shimmer com dimensões reservadas e preferência de movimento respeitada por CSS. */
export function Esqueleto({ detalhe = false }: { detalhe?: boolean }) {
  return (
    <div
      role="status"
      aria-label="Carregando conteúdo"
      className={detalhe ? 'esqueleto detalhe-esqueleto' : 'esqueleto'}
    >
      <span className="sr-only">Carregando…</span>
    </div>
  );
}
/** Reserva a mesma grade do detalhe para evitar salto do conteúdo e do rodapé. */
export function EsqueletoDoNft() {
  return (
    <div role="status" aria-label="Carregando conteúdo" className="nft-carregando">
      <span className="sr-only">Carregando obra…</span>
      <div className="caminho">
        <div className="esqueleto linha-carregando" />
      </div>
      <div className="detalhe-layout">
        <div className="galeria">
          <div className="miniaturas">
            {[1, 2, 3].map((indice) => (
              <div className="esqueleto miniatura-carregando" key={indice} />
            ))}
          </div>
          <div className="esqueleto arte-carregando" />
        </div>
        <div className="informacoes-carregando">
          <div className="esqueleto linha-carregando" />
          <div className="esqueleto titulo-carregando" />
          <div className="esqueleto texto-carregando" />
          <div className="esqueleto texto-carregando" />
        </div>
      </div>
      <div className="detalhes-editoriais">
        <div className="esqueleto texto-carregando" />
      </div>
    </div>
  );
}
/** Exibe falha da API com uma recuperação explícita quando disponível. */
export function Falha({ erro, tentar }: { erro: unknown; tentar?: () => void }) {
  return (
    <div role="alert" className="mensagem erro">
      <p>{mensagemErro(erro)}</p>
      {tentar && (
        <Button variant="outline" onClick={tentar}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
/** Dialog shadcn/Radix com foco preso, Escape e retorno ao elemento disparador. */
export function Dialogo({
  titulo,
  descricao,
  gatilho,
  children,
}: {
  titulo: string;
  descricao: string;
  gatilho: ReactNode;
  children: ReactNode;
}) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>{gatilho}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialogo-fundo" />
        <Dialog.Content className="dialogo-conteudo">
          <Dialog.Title className="text-xl font-bold">{titulo}</Dialog.Title>
          <Dialog.Description className="text-sm text-[var(--suave)]">
            {descricao}
          </Dialog.Description>
          {children}
          <Dialog.Close asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Fechar diálogo"
              className="dialogo-fechar"
            >
              <X size={18} />
            </Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
