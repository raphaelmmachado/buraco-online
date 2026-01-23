// src/utils/cardImageMap.ts

// 1. Carrega TODAS as imagens da pasta cards de uma vez
// { eager: true } garante que as imagens já estejam disponíveis na renderização
// { import: 'default' } traz direto o caminho da imagem (string)
const cardImages = import.meta.glob("../assets/stickers/*.webp", {
  eager: true,
  import: "default",
}) as Record<string, string>;

/**
 * Retorna o caminho da imagem baseado no valor e naipe.
 * Retorna undefined se a imagem não existir.
 */
export const getCardImageSrc = (
  value: string,
  suit: string,
): string | undefined => {
  // Constrói o caminho relativo exato onde o Vite espera encontrar o arquivo
  // Ajuste o caminho '../assets/cards/' se a estrutura de pastas for diferente
  const path = `../assets/stickers/${value}_${suit}.webp`;

  return cardImages[path];
};
