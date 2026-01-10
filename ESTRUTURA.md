# Estrutura do Projeto e Fluxo de Dados - Buraco Online

Este documento descreve a arquitetura do projeto, como os dados fluem entre o cliente e o servidor, e serve como um guia para desenvolvedores que desejam modificar ou corrigir regras do jogo.

## 1. Visão Geral da Arquitetura

O projeto é dividido em três partes principais:

1.  **`common/` (Núcleo Compartilhado):** Contém toda a lógica de negócios, regras, tipos e constantes. É a "fonte da verdade" usada tanto pelo servidor quanto pelo cliente (para validação local e organização visual).
2.  **`server/` (Backend):** Um servidor Node.js com Socket.IO. Ele mantém o estado autoritativo do jogo (`games`), recebe ações dos clientes, valida-as (usando `common/`) e emite o novo estado para todos na sala.
3.  **`src/` (Frontend):** Uma aplicação React (Vite). Utiliza Zustand para gerenciar o estado local, que é uma réplica do estado que vem do servidor. A UI apenas reflete esse estado e envia intenções de ação (eventos) para o servidor.

---

## 2. Fluxo de Dados (Data Flow)

O fluxo de dados é **unidirecional** e **autoritativo no servidor**.

1.  **Ação do Usuário:**
    *   O jogador interage na UI (ex: clica em "Baixar Jogo" no `GameScreen.tsx`).
    *   A store (`src/store/useGameStore.ts`) é chamada. **Ela não muda o estado localmente.**
    *   A store emite um evento via Socket.IO para o servidor (ex: `socket.emit("action_meld", ...)`).

2.  **Processamento no Servidor:**
    *   O servidor (`server/index.ts`) recebe o evento.
    *   **Validação de Turno:** Verifica se é a vez do jogador (`validateTurn`).
    *   **Validação de Regra:** Utiliza as funções puras de `common/utils/rules_logic.ts` (ex: `validate_sequence`) para checar se a jogada é legal.
    *   **Atualização de Estado:** Se válido, o servidor modifica o objeto `game` na memória (remove cartas da mão, adiciona à mesa, etc.).
    *   **Broadcast:** O servidor emite o evento `game_update` com o objeto `game` inteiro e atualizado para todos na sala (`io.to(roomId).emit(...)`).
    *   **Erro:** Se inválido, emite `error_msg` apenas para o socket que tentou a ação.

3.  **Atualização da UI:**
    *   O cliente recebe o evento `game_update`.
    *   A store (`useGameStore.ts`) atualiza seu estado interno (`set_server_state`).
    *   Os componentes React reagem à mudança de estado e renderizam a nova tela.

---

## 3. Guia de Manutenção e Evolução

### Otimizações de Performance (UI)

Para garantir fluidez, especialmente em dispositivos móveis, foram implementadas as seguintes otimizações:

*   **Renderização de Jogos (Melds):** Utilizamos o componente `MeldDisplay.tsx` que é memoizado (`React.memo`). Ele garante que a lógica pesada de ordenação visual (`organize_meld`) e recálculo de DOM só ocorra quando as cartas daquele jogo específico mudarem, e não a cada render da tela principal.
*   **Listeners de Eventos:** Listeners globais (como `resize` para detectar mobile) são centralizados no componente pai (`GameScreen.tsx`) e passados via props para componentes filhos (`HandCard.tsx`), evitando a criação de dezenas de listeners duplicados.

### Como Alterar uma Regra do Jogo?

Toda a lógica de regras reside em `common/`. **Nunca altere regras no Frontend (`src/`) ou diretamente dentro dos handlers do Backend (`server/`) se for lógica de validação de cartas.**

**Cenário: "Quero permitir trincas (3 cartas de naipes diferentes)."**

1.  **Vá para:** `common/utils/rules_logic.ts`.
2.  **Edite:** A função `get_sequence_details`. Atualmente ela bloqueia naipes diferentes. Você modificaria a lógica para aceitar esse padrão.
3.  **Impacto:** Como o Backend e o Frontend importam esse mesmo arquivo, a validação mudará automaticamente em ambos.
    *   O Servidor passará a aceitar a jogada.
    *   A função de organizar visualmente (`organize_meld` em `sort_cards.ts`) pode precisar de ajuste se depender da lógica de sequência.

### Como Alterar Pontuações?

1.  **Vá para:** `common/types/card.ts`.
2.  **Edite:** Os objetos `CARD_DEFINITIONS` (pontos por carta) ou `MELD_POINTS` (bônus de canastra).
3.  **Impacto:** A função `calculate_score` em `common/utils/scoring.ts` usará os novos valores automaticamente.

### Como Corrigir um Bug Visual (Ex: Carta fora de ordem na mesa)?

1.  **Entenda:** A ordem visual é definida por `organize_meld` em `common/utils/sort_cards.ts`. O Backend apenas guarda arrays de cartas; o Frontend usa essa função para decidir onde desenhar cada uma.
2.  **Vá para:** `common/utils/sort_cards.ts`.
3.  **Edite:** A lógica de `organize_meld`. Essa função usa o "Solver" de `rules_logic.ts` para entender qual carta é qual (ex: qual 2 é curinga) e retorna o array ordenado para renderização.

### Como Adicionar uma Nova Mecânica (Ex: "Coringa Vermelho")?

1.  **Tipos:** Adicione a definição em `common/types/card.ts`.
2.  **Regras:** Atualize `rules_logic.ts` para tratar esse novo tipo de carta (ex: na função `is_wildcard_usage`).
3.  **Frontend:** Atualize `src/components/Card.tsx` para renderizar o visual novo.
4.  **Backend:** Provavelmente não precisará de mudanças se a lógica estiver encapsulada em `rules_logic.ts`, a menos que haja uma ação de jogo nova específica para essa carta.

---

## 4. Mapa de Arquivos Importantes

| Caminho | Responsabilidade |
| :--- | :--- |
| **`common/types/card.ts`** | **CONSTANTES GLOBAIS.** Pontos, valores, regras estáticas (quantas cartas por mão, etc). |
| **`common/utils/rules_logic.ts`** | **VALIDAÇÃO.** O "cérebro" que diz se um jogo é válido ou não. Contém o Solver recursivo. |
| **`common/utils/game_logic.ts`** | **SETUP.** Criação do baralho e distribuição inicial. |
| **`common/utils/scoring.ts`** | **PONTUAÇÃO.** Calcula o placar final e parcial. |
| **`server/index.ts`** | **ORQUESTRADOR.** Recebe eventos, chama `common/` e guarda o estado. |
| **`src/store/useGameStore.ts`** | **CLIENTE.** Recebe dados do servidor e disponibiliza para o React. |
| **`src/components/online/GameScreen.tsx`** | **INTERFACE.** Renderiza o jogo. Centraliza estado de UI. |
| **`src/components/game-ui/MeldDisplay.tsx`** | **COMPONENTE.** Renderiza um jogo na mesa de forma otimizada (memoizada). |

## 5. Dicas de Debugging

*   **Console do Navegador:** Veja os logs do Socket.IO para saber se eventos estão sendo emitidos.
*   **Console do Servidor:** O `server/index.ts` tem logs para cada conexão e erro de validação (`[VALIDATION FAIL]`).
*   **Estado Redux/Zustand:** Use a extensão do navegador para ver o estado atual da store. Se o estado mudou mas a tela não, é erro de componente React. Se o estado não mudou, o servidor não enviou o update (provavelmente a jogada foi inválida).