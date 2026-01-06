# DESIGN DE GAMESCREEN

Design responsivo, para telas mobile e desktop

> Atenção não exiba informações sensíveis como: cartas da mão do adversário, nem do seu amigo.

## DESIGN MOBILE

Faça com que as cartas sejam facilmente tocadas para touch screen.
Desde que a tela do mobile é menor, vamos fazer o design diferente.

### Parte Superior

Barra com informaçoes como pontuação, nome do jogador que deve jogar.

### Seção Montes

Essa seção mostra o Monte(cartas viradas para baixo - quantas cartas possuem) e o Lixo (ultima carta exibida)

### Seção Area de Sequencias ou Canastras

Aqui estou pensando em uma mecanica diferente da versão desktop
Como padrão, essa seção exibirá um container com as informações completas das sequencias do seu time em leque, se são canastras e estão: limpas (borda verde), sujas (borda amarela), 500 (borda azul), 1000 (borda roxa).
Acima desse container uma pequena barra com informações minimalistas em textos do jogos baixados do time adversário, por exemplo em textos Copas:[4,5,6] - Espadas:[10,J,Q,K,A]. A mecanica seria movimento de swipe ou scrollar para alternar a exibição entre suas informações e as do adversário.

### Seção Inferior

Aqui é a mão do jogador com as cartas fazendo um leque

## DESIGN DESKTOP

### Parte Superior da tela

Sequencias, canastras limpas ou sujas do time oponente

### Parte do meio da tela

Essa parte será um barra larga e servirá para separar o jogo do oponente com o seu jogo - Monte de cartas para comprar, Monte do lixo, Mortos disponíveis na mesa, UI com informaçoes como: Vez de <nome do jogador>, estado do jogo, pontuação seu time, pontuação do time adversário.

### Parte inferior - Sequencias, canastras limpas ou sujas do seu time

abaixo de dessa parte - cartas da mão do jogador na parte inferior da tela.

## Experiencia de Usuario

Adicione Drag and Drop. Animações com cartas.
Evite botões, seja criativo e simule jogadas como se fosse baralho físico.
Um botão para organizar cartas

Se estiver na vez do jogador e estiver na fase de compras, ele tem opção de comprar do monte ou do lixo. Ao invés de criar botões para essas ações. Faça com que ao clicar no monte, ele compra do monte. E clicando no lixo, ele seleciona a carta do lixo, ele pode criar um novo jogo baixado ou adicionar em um jogo baixado existente, ele também combinar com cartas da mão em um jogo existente.

Se ele comprou e está na vez de jogar, ele pode selecionar as cartas desejadas e clicar na mesa ou arrastando com drag and drop para criar um jogo.

Mesma coisa para jogar carta fora, ele pode selecionar as cartas desejadas e clicar na lixo ou arrastando drag and drop.
