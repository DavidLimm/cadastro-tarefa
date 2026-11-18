import type { EdicaoTarefa, NovaTarefa, Tarefa } from '../../shared/contrato.js';

export interface TarefaRepositorio {
  /** Persiste a tarefa atribuindo o próximo id; devolve uma cópia. */
  salvar(nova: NovaTarefa): Tarefa;
  /** Devolve cópias das tarefas, em ordem de inserção. */
  listar(): Tarefa[];
  /** Devolve uma cópia da tarefa ou undefined se não existe. */
  obter(id: number): Tarefa | undefined;
  /** Aplica as mudanças (o id nunca muda); devolve cópia da tarefa ou undefined se não existe. */
  atualizar(id: number, mudancas: Partial<EdicaoTarefa>): Tarefa | undefined;
  /** Remove a tarefa; true se existia. O id nunca é reaproveitado. */
  excluir(id: number): boolean;
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

  obter(id: number): Tarefa | undefined {
    const tarefa = this.tarefas.get(id);
    return tarefa && { ...tarefa };
  }

  atualizar(id: number, mudancas: Partial<EdicaoTarefa>): Tarefa | undefined {
    const atual = this.tarefas.get(id);
    if (!atual) return undefined;
    const nova: Tarefa = { ...atual, ...mudancas, id: atual.id };
    this.tarefas.set(id, nova);
    return { ...nova };
  }

  excluir(id: number): boolean {
    return this.tarefas.delete(id);
  }
}
