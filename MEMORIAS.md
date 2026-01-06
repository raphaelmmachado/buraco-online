Ok o jogo está organizando as cartas quase perfeitamente.

Agora que as cartas tem mais de um peso. Para organizar basta priorizar o primeiro peso.

Por exemplo: Em um jogo 5-6-7 (copas) e eu adiciono 2-9 (copas), o jogo vai checar o valor do 2 checando validação da sequencia.
O valor do 2 é 8, pois é a única combinação válida. Ficando 5-6-7-2-9.
Depois se eu adicionar 8 (copas), o 2 deve priorizar os primeiros valores, ficando 2-5-6-7-8-9.
Eu posso ir limpando ele até chegar ao seu valor natural que é "2", adicionando 3-4. Ficando 2-3-4-5-6-7-8-9 (canastra limpa).
Eu posso sujar essa canastra de novo se eu quiser, adicionando J ficando 3-4-5-6-7-8-9-2-J.

Parece que você já implementou essa lógica.

Vou pedir para implementar outra lógica:
Na parte onde checa coringas, proiba dois '2' do mesmo naipe em uma sequência.
