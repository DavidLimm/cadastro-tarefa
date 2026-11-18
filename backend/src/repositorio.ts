import type { NovaTarefa, Tarefa } from '../../shared/contrato.js';

export interface TarefaRepositorio {
  /** Persiste a tarefa atribuindo o próximo id; devolve uma cópia. */
  salvar(nova: NovaTarefa): Tarefa;
  /** Devolve cópias das tarefas, em ordem de inserção. */
  listar(): Tarefa[];
}

export class TarefaRepositorioMemoria implements TarefaRepositorio {
  private readonly tarefas = new Map<number, Tarefa>();
  private ultimoId = 0;

  salvar(nova: NovaTarefa): Tarefa {
    this.ultimoId += 1;
    const tarefa: Tarefa = { id: this.ultimoId, ...nova, status: 'IDEALIZADO' };
    this.tarefas.set(tarefa.id, tarefa);
    return { ...tarefa };
  }

  listar(): Tarefa[] {
    return [...this.tarefas.values()].map((t) => ({ ...t }));
  }
}
