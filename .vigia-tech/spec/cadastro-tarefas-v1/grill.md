# Grill: cadastro-tarefas-v1

Pedido: "sistema de cadastro de tarefas, básico, apenas cadastrar a tarefa com prioridade e prazo".
Referências (ideias/): pasta inexistente/vazia, nada a copiar. licoes.md: vazio.
Projeto greenfield, sem MAPA.

## Suposições (resolvidas sem o David)
- Versões de stack só serão escolhidas após a resposta P1/P2 (checar fim de suporte na web então).
- Campos mínimos: título, prioridade, prazo (de "apenas cadastrar com prioridade e prazo").

## Rodada 1 (perguntas)
1. Interface: CLI, web ou desktop? (recomendo CLI)
2. Persistência: memória, arquivo JSON/SQLite, banco servidor? (recomendo SQLite ou JSON)
3. Escopo: só cadastrar ou também listar/editar/excluir? (recomendo cadastrar + listar)
4. Prioridade: níveis fixos (baixa/média/alta) ou número? Prazo: só data ou data+hora; pode ser passado?
5. Linguagem: preferência/objetivo de aprendizado? (recomendo Python ou TypeScript conforme P1)
6. Usuários/login e onde roda?

## Respostas
(vigia-tech grava aqui)

## Rodada 2 (arquiteto, 2026-11-18)
Sem novas perguntas: fronteira vazia. Imagem de referência analisada; suposições listadas no topo da
spec.md; 4 ADRs criados em .vigia-tech/adr/. Resultado: SPEC_PRONTA.

### Respostas do David (rodada 1, 2026-11-18)
1. Web (b).
2. Só memória (a) — "é um teste". Dados somem ao reiniciar o servidor; aceito.
3. Cadastrar + listar (b).
4. Recomendado: prioridade baixa/média/alta; prazo só data; rejeitar prazo no passado; título obrigatório, máx 100; sem descrição.
5. Back em Java, front em TypeScript ("é teste e eu sei mais" Java).
6. Um usuário, sem login, local (a).
7. Adicionou referência visual: ideias/Copy-of-novo-funil-1-tela-menor-1.png (arquiteto deve olhar e dizer o que copiar/adaptar).
