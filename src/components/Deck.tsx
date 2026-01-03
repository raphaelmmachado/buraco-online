import Card from "./Card";
import Pile from "./Pile";
export default function Deck() {
  return (
    <div>
      <Pile />
      {/* {deck.map((card, i) => (
        <Card
          key={i}
          id={card.id}
          symbol={card.symbol}
          value={card.value}
          color={card.color}
          isJoker={card.isJoker}
          deckIndex={card.deckIndex}
        />
      ))} */}
    </div>
  );
}
