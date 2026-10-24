/** Dados de uma requisição já identificada; nenhuma operação mantém cópias independentes do banco. */
import type { Banco, Usuario } from './banco';
export interface ContextoRequisicao {
  banco: Banco;
  requisicao: Request;
  url: URL;
  caminho: string;
  metodo: string;
  dono: string;
  usuario: Usuario | undefined;
  lerCorpo: () => Promise<unknown>;
  emitir: (nome: string, recursoId: string, versao: number, usuarioId?: string) => void;
}
