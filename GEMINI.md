# Projeto: Buraco Online (Engine Logic Focus)

## 1. Visão Geral

Este projeto é uma implementação web do jogo de cartas **Buraco** (variação popular no Brasil), com suporte para partidas **1v1** e **2v2** (duplas).
O foco atual está no desenvolvimento da **"Engrenagem do Jogo"** (Game Engine), priorizando a robustez das regras, validações lógicas e gerenciamento de estado, deixando a UI polida para uma etapa posterior.

## 2. Stack Tecnológica

- **Framework:** React (Vite)
- **Linguagem:** TypeScript
- **Gerenciamento de Estado:** Zustand
- **Estilização:** Tailwind CSS (Atualmente usado apenas para Debug UI)
- **Implementação Multiplayer** Socket.io (futuramente após eu terminar de encontrar bugs ou falhas)

## 3. Convenções de Código

- **Lógica Interna/Regras:** `snake_case` (ex: `player_hand`, `meld_cards`, `validate_sequence`).
- **Componentes React/Nativas:** `CamelCase` ou `PascalCase`.
- **Filosofia:** A Store (Zustand) deve conter toda a lógica de manipulação. A UI deve ser apenas uma representação visual do estado.

## 4. Estrutura de Arquivos Principal

### `src/store/useGameStore.ts` (O Cérebro)

Gerencia o estado global da partida.

- **State:** `hands` (mãos dinâmicas), `team_melds` (jogos na mesa por time), `deck`, `discard_pile`, `dead_piles` (mortos), `turn_phase`.
- **Actions:** `draw_card`, `discard_card`, `meld_cards`, `add_card_to_meld`, `pick_up_discard...`.
- **Lógica de Times:** Suporta 1v1 (2 players) e 2v2 (4 players). No 2v2, parceiros compartilham os jogos baixados (`team_melds`).

### `src/utils/rules_logic.ts` (O Juiz)

Contém a lógica pura de validação de regras do Buraco.

- Função principal: `validate_sequence(cards)`.
- **Regras Implementadas:**
  - Mínimo de 3 cartas.
  - Mesmo naipe.
  - Uso do "2" como coringa (pode limpar ou sujar a canastra).
  - Ás pode ser 1 ou 14 (ou ambos em canastras de 1000).
  - Impede sequências com buracos se não houver coringa físico na mão.

### `src/utils/scoring.ts` (O Placar)

Calcula a pontuação final.

- Soma pontos da mesa + Bônus (Batida, Canastra Limpa, Suja, Real).
- Subtrai penalidade das cartas que sobraram na mão (soma das mãos da dupla no 2v2).

### `src/utils/game_logic.ts` & `src/utils/sort_cards.ts`

- Criação de baralho (2 decks).
- Distribuição de cartas (Mãos + 2 Mortos).
- Ordenação de cartas (Lógica de peso para backend vs Lógica visual para frontend).

## 5. Regras de Negócio Específicas (Buraco Fechado/Padrão)

1.  **Compra do Lixo:** Só é permitida se a carta do topo justificar a compra (encaixar num jogo existente ou formar um novo jogo da mão).
2.  **Morto:** Existe um morto para cada lado. Se a mão acaba, o jogador pega o morto.
    - **Batida Direta:** Mão acaba baixando cartas -> Pega o morto e continua jogando.
    - **Batida Indireta:** Mão acaba descartando -> Pega o morto e passa a vez.
3.  **Coringas:** A carta "2" atua como coringa.
    - Canastra Limpa: Sem coringa (ou com 2 natural, sem substituir outra carta).
    - Canastra Suja: Com coringa.
4.  **Fim de Jogo:**
    - Se alguém bater final (tendo pego o morto e com canastra limpa - regra configurável).
    - Se o monte acabar e não houver morto para repor.

## 6. Estado Atual do Desenvolvimento

- **Backend/Lógica:** 98% Completo. Validações de sequência, turnos, lixo e pontuação estão funcionais e testadas.
- **Frontend:** Existe apenas um componente `DebugGame.tsx` usado para testar as mecânicas. Não há design final.
- **Bots:** Implementação básica ("Dummy Bots") que apenas compram e descartam para fazer o turno girar em testes locais.

## 7. Próximos Passos / Objetivo Final

1.  Refinar a interface visual (transformar o Debug em um Jogo bonito).
2.  Implementar animações de cartas.
3.  Preparar para Multiplayer Real (WebSockets) - Atualmente é simulação local.

## 8. Log de Decisões Técnicas Recentes (Jan 2026)

### Sistema de Pontuação (`scoring.ts`)

- **Cálculo Híbrido:** A função `calculate_score` foi refatorada para aceitar parâmetros opcionais (`hands_to_penalize`, `did_beat`).
  - **Uso em Tempo Real:** Chamada sem parâmetros opcionais para alimentar o HUD (apenas pontos positivos da mesa).
  - **Uso em Game Over:** Chamada com penalidades para calcular o resultado final.
- **Integração:** O scoring agora importa `validate_sequence` para determinar automaticamente se uma canastra é Limpa, Suja ou Real, garantindo consistência (Single Source of Truth).

### Interface (`DebugGame.tsx`)

- **Otimização de Espaço:** Substituição dos cabeçalhos grandes ("Jogos Time 1") por um componente compacto `GameInfoBar`.
- **GameInfoBar:** Exibe pontuação em tempo real, contagem de cartas no monte e status visual dos Mortos (slots vermelhos), liberando a área central para renderização dos jogos.
