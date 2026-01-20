# Roadmap de Desenvolvimento: Buraco Online

Este documento organiza as tarefas pendentes, priorizando a estabilidade e a experiência do usuário antes de expandir para funcionalidades complexas.

---

## [x] INTELIGENCIA DOS BOTS

## ✅ Concluído Recentemente

---

## 1. Prioridade Alta: UX & Polimento (O "Juice")

_Foco: Melhorar a sensação de jogar e o feedback visual._

- [x] **Event Ticker (Log de Ações na Barra Central)**

## 2. Prioridade Média: Mecânicas de Jogo

_Foco: Tornar a partida mais interessante e estratégica._

- [ ] **Modo Campeonato (Condições de Vitória)**
  - **Objetivo:** Permitir configurar "Vence quem fizer 3000 pontos" ou "Melhor de 3 rodadas".
  - **Complexidade:** Média.
  - **Tempo Estimado:** 4 - 5 horas.
  - **Detalhes:** Exige criar um estado persistente de `cumulative_score` no servidor que não zera ao fim da rodada (`handle_empty_hand`), apenas reseta o baralho.

---

## 3. Redesign Visual Radical (Estilo Balatro) 🎨

_Ideia para transformar a estética do jogo com visual CRT/Retro/Pixel Art._

- [ ] **CRT Overlay & Shaders**
  - **Objetivo:** Criar camada global de pós-processamento simulando TV de tubo (Scanlines, Aberração Cromática, Curvatura).
  - **Complexidade:** Média (CSS avançado ou WebGL).

- [ ] **Física "Jelly" (Gelatina)**
  - **Objetivo:** Cartas que balançam e esticam ao serem arrastadas, com tilt 3D e brilho holográfico.
  - **Complexidade:** Alta (exige `react-spring` ou `framer-motion` pesado).

- [ ] **Pixel Art & Juice**
  - **Objetivo:** Substituir vetores por pixel art, fontes monoespaçadas bold, e partículas explosivas ao pontuar.

---

## 4. Zona de Perigo ⚠️ (Ideias Futuras / Alto Risco)

_Estas ideias exigem refatoração profunda do núcleo (`common/`) ou da infraestrutura. Risco alto de introduzir bugs ou quebrar a lógica existente._

- [ ] **Motor de Regras Customizáveis (House Rules)**
  - **A ideia:** Permitir opções no Lobby como "Vale Trinca", "Sem Morto", "Curinga vale na Real".
  - **O Perigo:** Exige reescrever `rules_logic.ts` (o cérebro do jogo) para aceitar parâmetros dinâmicos em vez de regras fixas. Um erro aqui quebra a validação de todo o jogo.
  - **Complexidade:** Muito Alta.

- [ ] **Persistência em Banco de Dados (Redis/Postgres)**
  - **A ideia:** Salvar o estado do jogo em banco real, não na memória RAM.
  - **O Benefício:** Se o servidor reiniciar, as salas não morrem.
  - **O Custo:** Adiciona uma camada de infraestrutura (Docker/DB) que complica o deploy e o desenvolvimento local.
  - **Complexidade:** Alta (Infraestrutura).

- [ ] **Interação por Arrastar (Drag and Drop)**
  - **A ideia:** Implementar arrastar para abaixar cartas, descartar. Seleção múltipla com "clicar e segurar".
  - **O Risco:** Embora pareça intuitivo, pode tornar a gameplay lenta e cansativa para jogadores experientes com o passar do tempo. Manter apenas como uma possibilidade de UX secundária.
  - **Complexidade:** Alta (Manipulação de Pointer Events e estados de Ghost).
