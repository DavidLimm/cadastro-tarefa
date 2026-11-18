# Grill — kanban-status-v2

## Pedido
Ver pedido.md. Quadro por STATUS (idealizado, fazendo, concluído, abandonado/atrasado), cor no prazo e no nível, destaque para prioridade alta e para prazo perto de vencer, poder abrir o quadro para mexer e editar.

## Referências (ideias/)
`Copy-of-novo-funil-1-tela-menor-1.png` (kanban de CRM):
- Colunas lado a lado com título, contagem e total; rolagem horizontal e vertical por coluna.
- Cartão branco: título em negrito, subtítulo, valor. À direita, um selo quadrado colorido com ícone: verde + calendário (em dia), amarelo + triângulo de alerta (atenção), vermelho + alerta (problema). O estado do prazo é sinalizado por cor E ícone, sem borda berrante.
- Barra de topo com busca, Filtros, Ordenar e botão primário "Adicionar".
- Copiar: colunas, cartão com selo colorido+ícone, contagem por coluna. Adaptar: sem valor em R$, sem busca/filtros (fora da v2, salvo se David pedir). Arrastar não aparece na imagem (é estático), então "mexer" continua ambíguo.

## Suposições (fonte: MAPA/ADRs)
- S1: Stack segue (Fastify/TS, front TS puro, shared/). Só muda se persistência pedir.
- S2: v1 tinha editar/excluir/concluir fora do escopo; agora entram, exigindo novos métodos no repositório, rotas, api.ts, ações do quadro e campo `status` no contrato.
- S3: Conflito a registrar: ADR 0003 (memória) foi decisão para a v1; nova ADR substitui se persistência mudar.
- S4: Regra "prazo não anterior a hoje" da v1 vale só na criação; editar tarefa já vencida não deve ser bloqueado por ela (a decidir na spec).

## Rodada 1 — perguntas
(ver bloco PERGUNTAS devolvido ao vigia-tech; respostas serão gravadas abaixo)

1. Status e "abandonado (atrasado)": manual, automático ou os dois?
2. Status ao criar.
3. Como mexer: arrastar, botões "mover para", ou os dois.
4. Editar: campos, excluir, confirmação.
5. Cores e destaques: prioridade, prazo, N dias, formato do destaque.
6. Prioridade continua como campo? Ordem dentro da coluna.
7. Persistência.

### Respostas do David (rodada 1, 2026-11-18)
1. C (os dois): status manual + o sistema SUGERE quando vence. Interpretação do vigia-tech (arquiteto detalha na spec): o cartão nunca muda de coluna sozinho; vencida e não concluída/abandonada ganha destaque vermelho + atalho "Mover para Abandonado". Colunas fixas: Idealizado, Fazendo, Concluído, Abandonado. Atrasada em Concluído nunca conta como atrasada.
2. A: sempre nasce "Idealizado".
3. C: arrastar e soltar + menu "Mover para…" (teclado/acessível).
4. Recomendado: editar título, prioridade, prazo e status no mesmo diálogo (abre ao clicar no cartão); excluir entra, com confirmação.
5. "Ache o melhor encaixe" -> decisão do vigia-tech: N=3 dias; destaque = borda esquerda grossa colorida + selo com ícone e texto; Alta e perto de vencer juntos: dois selos, borda segue o mais urgente (vencido > vence hoje > Alta); cores sempre com texto/ícone.
6. "Ache o melhor encaixe" -> decisão do vigia-tech: prioridade continua como campo e selo; ordem na coluna = prazo, prioridade (Alta antes), id; sem reordenação manual na v2.
7. A: continua em memória (ADR 0003 vale). Dados somem ao reiniciar o back; aceito.
Suposições do arquiteto aceitas: ícones texto/emoji/SVG inline sem biblioteca; rolagem horizontal se não couber; contagem por coluna; sem busca/filtro/reordenar; atraso pela data local em texto YYYY-MM-DD.
