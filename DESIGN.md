# DESIGN DE GAMESCREEN

_PORCENTAGEM DE OCUPAÇÃO DA TELA_

## DESIGN DESKTOP

:--------------------------------------------------:
| AREA DO ADVERSARIO(37.5%) |
:--------------------------------------------------:
| SEPARADOR [DE QUEM É A VEZ - NOME DO JOGADOR ] |
| - QUANTAS CARTAS TEM NA MÃO (5%) :
:--------------------------------------------------:
| AREA DO SEU JOGO(37.5%) |
:--------------------------------------------------:
| [MONTE] [MÃO] [LIXO](20%) |
:--------------------------------------------------:

## DESIGN MOBILE

:--------------------------------------------------:
| AREA DO ADVERSARIO(37.5%) |
:--------------------------------------------------:
| [MONTE] SEPARADOR [LIXO](5%)
:--------------------------------------------------:
| AREA DO SEU JOGO(37.5%) |
:--------------------------------------------------:
| [MÃO] (20%) |
:--------------------------------------------------:

## CONTAINER MESA

### Parte Superior da MESA

A PARTE SUPERIOR SERÁ SEMPRE DO TIME ADVERSÁRIO, NÃO IMPORTA EM QUE TIME ESTÁ
o jogo vai checar qual seu time é.

Será exibido Sequencias, canastras limpas ou sujas do adversário.

### Parte do meio da MESA

Essa seção tem que ser pensada em ocupar menos espaço vertical. pensando principalmente para os mobiles.
Monte de cartas para comprar, Monte do lixo, Mortos disponíveis na mesa, UI com informaçoes como: Vez de <nome do jogador>, estado do jogo, exemplo: sua vez de comprar ou jogue carta fora para finalizar jogada, pontuação seu time, pontuação do time adversário.

### Parte Inferior da MESA

ESSA PARTE SEMPRE SERÁ DO SEU TIME, NÃO IMPORTA EM QUE TIME ESTÁ.
Será exibido Sequencias, canastras limpas ou sujas do seu time
abaixo de dessa parte - cartas da mão do jogador na parte inferior da tela.

## MÃO DO JOGADOR

Seja criativo
Um stack de cartas, uma por cima da outra, com leve deslocamento só pra aparecer o número.
Elas são destacadas quando interagidas

## Experiencia de Usuario

Adicione Drag and Drop. Animações com cartas.
Evite botões, seja criativo e simule jogadas como se fosse baralho físico.
Um botão para organizar cartas

Se estiver na vez do jogador e estiver na fase de compras, ele tem opção de comprar do monte ou do lixo. Ao invés de criar botões para essas ações. Faça com que ao clicar no monte, ele compra do monte. E clicando no lixo, ele seleciona a carta do lixo, ele pode criar um novo jogo baixado ou adicionar em um jogo baixado existente, ele também combinar com cartas da mão em um jogo existente.

Se ele comprou e está na vez de jogar, ele pode selecionar as cartas desejadas e clicar na mesa ou arrastando com drag and drop para criar um jogo.

Mesma coisa para jogar carta fora, ele pode selecionar as cartas desejadas e clicar na lixo ou arrastando drag and drop.

### PARA MOBILES

Faça com que as cartas sejam facilmente tocadas para touch screen.
Desde que a tela do mobile é menor, vamos fazer o design diferente.
