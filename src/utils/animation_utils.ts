export type ScreenDirection = "bottom" | "left" | "top" | "right";

/**
 * Determina a posição espacial de um jogador na tela relativa ao jogador local (Bottom).
 * Baseado na regra:
 * - 1v1: Oponente = Top
 * - 2v2: Sentido Horário (Eu -> Esq -> Parceiro -> Dir)
 *
 * @param targetId ID do jogador alvo
 * @param myId ID do jogador local
 * @param mode Modo de jogo ("1v1" ou "2v2")
 * @returns 'bottom' | 'left' | 'top' | 'right'
 */
export const getPlayerDirection = (
  targetId: number,
  myId: number,
  mode: "1v1" | "2v2"
): ScreenDirection => {
  if (targetId === myId) return "bottom";

  if (mode === "1v1") {
    return "top";
  }

  // 2v2 Logic
  // Normalizar IDs para 0-3 para facilitar a matemática modular
  // Assumindo IDs 1, 2, 3, 4
  const normalizedTarget = targetId - 1;
  const normalizedMy = myId - 1;

  // Calcular a distância relativa no sentido horário
  // Ex: Eu=0, Alvo=1 (Próximo) -> diff=1
  // Ex: Eu=0, Alvo=3 (Anterior) -> diff=3
  const diff = (normalizedTarget - normalizedMy + 4) % 4;

  switch (diff) {
    case 1:
      return "left"; // Próximo jogador (sentido horário)
    case 2:
      return "top"; // Parceiro
    case 3:
      return "right"; // Jogador anterior
    default:
      return "top"; // Fallback
  }
};

/**
 * Retorna as coordenadas iniciais para animação baseada na direção.
 * Útil para framer-motion `initial` prop.
 * Offset aumentado para garantir que a carta venha de fora da área visível (offscreen).
 */
export const getAnimationOrigin = (
  direction: ScreenDirection,
  offset = 1000
) => {
  switch (direction) {
    case "bottom":
      return { x: 0, y: offset };
    case "top":
      return { x: 0, y: -offset };
    case "left":
      return { x: -offset, y: 0 };
    case "right":
      return { x: offset, y: 0 };
  }
};
