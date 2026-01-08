# TODO

Quando o monte acabar, checar se há mortos, se tiver mortos, as cartas do primeiro index das arrays de morto vão para o monte.

Se as cartas do monte acabarem e não tiver mortos disponíveis, finalizar o jogo.

explique esse bloco. Seria ele o vilão?
linha 370 em server/index.ts

```typescript
if (game.deck.length === 0) {
  socket.emit("error_msg", "O monte acabou!");

  return;
}
```

Se está na sua vez e for fase de compras, e se houver cartas no lixo, ao passar o mouse sobre um jogo baixado, acender bordas nesse jogo e na carta do lixo. Indicando que você pode comprar lixo com o jogo baixado.

Deixe as cartas da mesa um pouquinho menores. Esse componente de cartas está ficando muito complexo, sinta-se a vontade se precisar criar componente para cada tipo de cartas.
Exemplo: componente para carta da mão, componente para cartas de sequencia, componente para cartas do monte, componente para carta do lixo.
