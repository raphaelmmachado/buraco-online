# Projeto: Buraco Online (Buraco Fechado)

## 1. Visão Geral

Este projeto é uma implementação web do jogo de cartas **Buraco Fechado** (variante STBL simplificada), com uma arquitetura robusta que suporta tanto partidas locais contra bots quanto um modo multiplayer online completo.

O design do projeto separa de forma clara a **lógica do jogo** (motor de regras), o **gerenciamento de estado** e a **interface do usuário**, permitindo testes e desenvolvimento modulares.

## 2. Stack Tecnológica

- **Framework:** React (Vite)
- **Linguagem:** TypeScript
- **Gerenciamento de Estado:** Zustand
- **Estilização:** Tailwind CSS
- **Multiplayer:** Node.js + Socket.IO

## 3. Convenções de Código

- **Lógica Interna/Regras (`common/`):** `snake_case` (ex: `validate_sequence`, `calculate_score`).
- **Componentes React/Nomes de Arquivo (`src/`):** `PascalCase` (ex: `DebugGame.tsx`, `CardComponent.tsx`).
- **Filosofia:** A lógica pura do jogo reside em `common/`, enquanto as stores do Zustand orquestram o estado e as ações. A UI é uma representação reativa do estado atual.

## 4. Estrutura de Arquivos Principal

### `common/` (O Cérebro / Motor do Jogo)
Contém toda a lógica pura e sem estado do Buraco. É o núcleo do projeto, reutilizado tanto pelo modo local quanto pelo servidor multiplayer.
- **`utils/rules_logic.ts`**: Valida sequências, checa regras de coringas e duplicatas.
- **`utils/scoring.ts`**: Calcula a pontuação final da partida.
- **`utils/game_logic.ts`**: Cria e distribui o baralho.
- **`utils/sort_cards.ts`**: Contém a lógica para organizar visualmente os jogos na mesa.
- **`types/card.ts`**: Define os tipos, constantes de regras (pontos, cartas por mão) e bônus.

### `src/store/` (O Gerenciamento de Estado)
Uma das partes mais importantes da arquitetura, implementando duas stores Zustand para dois modos de jogo distintos.
- **`useGameStoreBots.ts` (Store "Gorda"):** Usada para o jogo local contra bots. Contém toda a lógica do jogo (o "loop" do jogo), importando e utilizando as funções de `common/utils/` para manipular o estado diretamente. É o que o `DebugGame.tsx` utiliza.
- **`useGameStore.ts` (Store "Magra"):** Usada para o modo multiplayer online. As ações nesta store não contêm lógica de jogo; elas apenas emitem eventos para o servidor via Socket.IO (`socket.emit(...)`) e recebem o estado atualizado do backend.

### `src/components/` (A Interface do Usuário)
- **`DebugGame.tsx`**: O componente principal para o modo de teste local. Renderiza o estado do jogo a partir da `useGameStoreBots` e permite que o jogador humano interaja.
- **`online/`**: Contém os componentes para a interface do modo multiplayer (atualmente inativo).

### `server/` (O Backend Multiplayer)
- **`index.ts`**: Um servidor Node.js completo que gerencia as salas de jogo e atua como a autoridade central para as partidas online. Ele utiliza as mesmas funções de `common/utils/` para garantir que as regras sejam consistentes com o modo local.

## 5. Regras de Negócio Implementadas (Buraco Fechado STBL)
As regras foram atualizadas para seguir o `RULES.md` mais recente.
- **Cartas:** 11 por mão, 2 mortos de 11 cartas.
- **Curingas:** Apenas os "2"s. **Máximo 1 "2" pode ser usado como curinga** em um mesmo jogo.
- **Jogos:** Apenas sequências do mesmo naipe. Não são permitidas trincas/lavadeiras.
- **Pontuação:** Canastra Limpa vale 400, Ás vale 20.
- **Validação:** O sistema impede jogos com mais de 14 cartas ou com cartas duplicadas (exceto o Ás em canastras de 1000 pontos).

## 6. Estado Atual do Desenvolvimento
- **Lógica do Jogo (`common/`):** Robusta e alinhada com o `RULES.md`. As funções de validação e organização visual foram recentemente corrigidas.
- **Modo de Teste Local:** Totalmente funcional. O `DebugGame.tsx` permite jogar uma partida completa (1v1 ou 2v2) contra bots com IA simples (compram e descartam).
- **Modo Multiplayer:** A arquitetura está completa e pronta. Tanto o cliente (`useGameStore.ts` e componentes de `online/`) quanto o servidor (`server/index.ts`) estão codificados. Para ativá-lo, basta alterar o componente renderizado em `src/App.tsx`.

## 7. Próximos Passos
1.  **Refinar a Interface:** Transformar o `DebugGame` ou usar os componentes de `online/` para criar uma interface de usuário final polida e com animações.
2.  **Melhorar a IA dos Bots:** Evoluir a estratégia dos bots para além de "comprar e descartar".
3.  **Ativar e Testar o Multiplayer:** Mudar a renderização em `App.tsx` para o componente `<OnlineGame />` e iniciar os testes em ambiente cliente-servidor.