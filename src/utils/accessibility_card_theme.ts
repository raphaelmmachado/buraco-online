import type { Suit } from "../../common/types/card";

export interface AccessibilityCardTheme {
  background: string;
  text: string;
}

const ACCESSIBILITY_CARD_THEMES: Record<Suit["name"], AccessibilityCardTheme> =
  {
    copas: { background: "bg-red-600", text: "text-white" },
    ouro: { background: "bg-yellow-800", text: "text-white" },
    paus: { background: "bg-green-700", text: "text-white" },
    espadas: { background: "bg-blue-800", text: "text-white" },
    joker: { background: "bg-violet-900", text: "text-white" },
  };

export const getAccessibilityCardTheme = (
  suit: Suit["name"],
): AccessibilityCardTheme =>
  ACCESSIBILITY_CARD_THEMES[suit] ?? {
    background: "bg-slate-900",
    text: "text-white",
  };
