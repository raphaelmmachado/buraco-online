# Roadmap de Desenvolvimento: Buraco Online

Este documento organiza as tarefas pendentes, priorizando a estabilidade e a experiência do usuário antes de expandir para funcionalidades complexas.

---

## INTELIGENCIA DOS BOTS

Os BOTS estão muito burros, parece que ficaram mais burros após as alterações de ontem. Eles simplesmente criam qualquer jogo que tiver na │
│ mão. │
│ Eles devem evitar criar varios jogos do mesmo naipes se as cartas forem muito próximas. por exemplo: │
│ - Ele cria 3-4-5 e 7-8-9 do mesmo naipe. Ele deveria ser inteligente de segurar essas cartas. │
│ - O BOT deve saber que existem coringas limpáveis. por exemplo seria OK ele criar 3-4-5-2-7-8-9 se o coringa for do mesmo naipe. │
│ - Ele pode sujar o jogo para pontuar se ja há varios jogos do mesmo naipe na mesa, se ele sabe que a carta que ele precisa já foram │
│ usadas,por exemplo ele pode criar 2_paus-9-10-J-Q-K-A-copas se os dois 8_copas já foram usados (qualquer um pode ver as cartas baixadas). │
│ Criar qualquer jogo para ir para o morto deveria ser um ato de desespero, se o time dele não consegue criar nada, ou não está pontuando.

## ✅ Concluído Recentemente

- [x] **Estabilidade Online:** Impedir múltiplas salas por host e corrigir botão de encerrar sessão.
- [x] **Gestão de Salas:** Sistema de Kick e Troca de Times (2v2).
- [x] **Reconexão Inteligente:** Bot assume ao cair, jogador retoma ao voltar.
- [x] **IA Defensiva:** Bot protege canastras limpas e evita descartes óbvios.

---

## 1. Prioridade Alta: UX & Polimento (O "Juice")

_Foco: Melhorar a sensação de jogar e o feedback visual._

- [ ] **Event Ticker (Log de Ações na Barra Central)**

- [ ] **Menu de Contexto & Marcadores Táticos**

  - **Objetivo:** Abrir menu customizado (botão direito / long press) para colocar marcadores visuais nas cartas (icones ou uma fita na carta) (ex: "Lixo" ou "amarela", "Carta para o Amigo" ou "azul","Perigosa" ou "vermelha").
  - **Complexidade:** Baixa.
  - **Tempo Estimado:** 2 horas.
  - **Objetivo:** Informar o jogador sobre o que aconteceu ("Oponente pegou o lixo", "Parceiro pegou o morto") sem usar pop-ups intrusivos.

  - **Complexidade:** Baixa.
  - **Tempo Estimado:** 2 - 3 horas.
  - **Sugestão:** Usar a barra divisória central para exibir mensagens temporárias com transição suave.

- [ ] **Animações de Cartas (Básico)**
  - **Objetivo:** Evitar o "teletransporte" de cartas.
  - **Complexidade:** Média.
  - **Tempo Estimado:** 4 horas.
  - **Sugestão:** Usar `framer-motion` para animar a compra (Deck -> Mão) e o descarte (Mão -> Lixo).

---

## 2. Prioridade Média: Mecânicas de Jogo

_Foco: Tornar a partida mais interessante e estratégica._

- [ ] **Modo Campeonato (Condições de Vitória)**

  - **Objetivo:** Permitir configurar "Vence quem fizer 3000 pontos" ou "Melhor de 3 rodadas".
  - **Complexidade:** Média.
  - **Tempo Estimado:** 4 - 5 horas.
  - **Detalhes:** Exige criar um estado persistente de `cumulative_score` no servidor que não zera ao fim da rodada (`handle_empty_hand`), apenas reseta o baralho.

- [ ] **IA v2: Máquina de Estados (Bot Estratégico)**
  - **Objetivo:** Fazer o bot parar de ser apenas "ganancioso".
  - **Complexidade:** Alta.
  - **Tempo Estimado:** 6 - 8 horas.
  - **Estrutura Proposta:**
    1.  _Early Game:_ Foco total em pegar o morto (baixa tudo).
    2.  _Mid Game:_ Foco em limpar canastras e segurar jogo na mão.
    3.  _End Game:_ Foco em bater se tiver canastra limpa.

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
