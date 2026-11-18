# ADR 0001: Backend em Java 25 + Spring Boot 4.1 + Maven

Status: Substituído por 0005 (David pediu back em TypeScript/Node, 2026-11-18). Mantido só como histórico.
Data: 2026-11-18

## Contexto
David pediu back em Java (é a linguagem que ele domina; projeto de teste). Precisamos de uma API HTTP
pequena, com validação, testes e zero infraestrutura extra.

## Opções consideradas
1. **Spring Boot 4.1.x, Java 25, Maven (wrapper)**. Prós: validação (Bean Validation), JSON, testes
   (MockMvc) e erros padronizados (ProblemDetail) prontos; é o que o mercado usa, bom para aprender.
   Contras: mais "mágica" e mais pesado que o necessário para 2 endpoints.
2. **Javalin/Spark (micro-framework) + Maven**. Prós: pouquíssima mágica, o fluxo da requisição fica
   visível. Contras: validação e testes feitos à mão; aprende-se menos do que o mercado pede.
3. **Spring Boot 4.0.x**. Contra decisivo: suporte open source termina em 31/12/2026, daqui a ~6 semanas.
4. **Spring Boot 3.5.x**. Descartado: suporte OSS terminou em 30/06/2026.
- Build: **Gradle** em vez de Maven? Gradle é mais flexível, mas o XML do Maven é declarativo e mais
  fácil de ler para quem está começando. Maven 4 ainda está em release candidate; usar **Maven 3.9.x**
  via Maven Wrapper (`mvnw`), assim ninguém precisa instalar Maven.

## Decisão
Opção 1: Java 25 (LTS), Spring Boot 4.1.x (última estável vista: 4.1.2), Maven 3.9.x via wrapper.
Dependências mínimas: `spring-boot-starter-web` (nome exato do starter em Boot 4 deve ser confirmado
na criação do projeto, pois o Boot 4 modularizou starters), `spring-boot-starter-validation`,
`spring-boot-starter-test`. Sem JPA, sem banco, sem Lombok.

## Datas de suporte (fontes, consultadas em 2026-11-18)
- Java 25 LTS: Oracle, atualizações gratuitas até set/2028; OpenJDK planeja set/2030.
  (adoptium.net/support; javaalmanac.io/jdk/25)
- Spring Boot 4.1: suporte OSS até 31/07/2027 (ecorpit.com, herodevs.com; confirmar em spring.io/projects/spring-boot).
  Boot 4.2 previsto para 19/11/2026 (OSS até 31/12/2027): pode-se começar nele se já estiver GA.
- Maven 3.9.x: linha estável atual (3.9.16 em mai/2026); Maven 4 ainda em RC.

## Consequências
- Quem for implementar precisa de JDK 25 instalado (ou 21 como plano B: Boot 4.1 aceita Java 17+; se
  o JDK 25 atrapalhar, registrar nova ADR, não mudar em silêncio).
- Em ~jul/2027 será preciso subir de minor (4.1 -> 4.2+), pois cada minor tem só 13 meses de OSS.
- Spring traz mais conceitos que o necessário; aceito porque é o objetivo de aprendizado.
