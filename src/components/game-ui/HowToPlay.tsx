import { X, Trophy, Swords, Shield, Star, Crown } from "lucide-react";

interface HowToPlayProps {
  onClose: () => void;
}

const SectionTitle = ({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
}) => (
  <div className="flex items-center gap-3 mt-8 mb-4">
    <div className="text-cyan-400">{icon}</div>
    <h3 className="text-xl font-bold text-cyan-400 tracking-wide">
      {children}
    </h3>
    <div className="flex-grow h-px bg-cyan-400/20"></div>
  </div>
);

const InfoItem = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="bg-white/5 p-4 rounded-lg border border-white/10 mt-2">
    <strong className="font-bold text-slate-100">{title}:</strong>
    <p className="text-slate-400 text-sm mt-1">{children}</p>
  </div>
);

export const HowToPlay = ({ onClose }: HowToPlayProps) => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] animate-fade-in font-sans">
      <div className="bg-gray-900/80 backdrop-blur-2xl border-2 border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl m-4">
        <header className="p-6 flex items-center justify-between border-b border-white/10 shrink-0">
          <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 via-yellow-500 to-orange-600">
            Como Jogar Buraco
          </h2>
          <button
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-red-500/20 rounded-full text-white hover:text-red-300 transition-all"
          >
            <X size={22} />
          </button>
        </header>

        <div className="overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <SectionTitle icon={<Trophy size={24} />}>
            O Objetivo do Jogo
          </SectionTitle>
          <p className="text-slate-300 leading-relaxed">
            O objetivo principal no Buraco é fazer mais pontos que a dupla
            adversária. Os pontos são somados através da criação de{" "}
            <strong className="text-yellow-400">"jogos"</strong> (sequências) e{" "}
            <strong className="text-yellow-400">"canastras"</strong>. O jogo
            termina quando uma dupla "bate" (fica sem cartas) após já ter pego o
            "morto" ou quando acabam as cartas.
          </p>

          <SectionTitle icon={<Swords size={24} />}>
            O Fluxo de um Turno
          </SectionTitle>
          <ol className="relative border-l-2 border-cyan-400/20 ml-3 space-y-8">
            <li className="ml-8">
              <span className="absolute -left-4 flex items-center justify-center w-8 h-8 bg-cyan-900 rounded-full ring-4 ring-gray-800 font-black text-cyan-300">
                1
              </span>
              <h4 className="font-bold text-lg text-slate-100">
                Comprar uma carta (ou pegar lixo)
              </h4>
              <p className="text-slate-400 text-sm">
                Você começa clicando no monte de compras à esquerda.
              </p>
            </li>
            <li className="ml-8">
              <span className="absolute -left-4 flex items-center justify-center w-8 h-8 bg-cyan-900 rounded-full ring-4 ring-gray-800 font-black text-cyan-300">
                2
              </span>
              <h4 className="font-bold text-lg text-slate-100">
                Baixar ou Adicionar (Opcional)
              </h4>
              <p className="text-slate-400 text-sm">
                Selecione no mínimo 3 cartas (sequência válida). Você pode
                clicar no campo amarelo para criar um jogo ou clicar no jogo já
                criado onde deseja adicionar.
              </p>
            </li>
            <li className="ml-8">
              <span className="absolute -left-4 flex items-center justify-center w-8 h-8 bg-cyan-900 rounded-full ring-4 ring-gray-800 font-black text-cyan-300">
                3
              </span>
              <h4 className="font-bold text-lg text-slate-100">
                Descartar uma carta
              </h4>
              <p className="text-slate-400 text-sm">
                Selecione a carta que deseja jogar fora e clique no lixo.
              </p>
            </li>
          </ol>

          <SectionTitle icon={<Shield size={24} />}>
            Conceitos Importantes
          </SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem title="Jogos (Sequências)">
              Sequências de 3+ cartas do mesmo naipe. ordem das cartas: <br />
              <span className="font-mono uppercase tracking-widest">
                {" A-2-3-4-5-6-7-8-9-10-J-Q-K-A"}
              </span>
            </InfoItem>
            <InfoItem title="Naipes">
              Ouro ♦️, Copas ♥️, Paus ♣️, Espadas ♠️
            </InfoItem>
            <InfoItem title="Curinga">
              Carta '2' Substitui qualquer carta em um jogo. Apenas um por jogo
              é permitido. '2' Não é curinga quando está na sua posição natural.
              Proibido usar dois (ou mais) '2' do mesmo naipe, mesmo que um
              deles seja natural.
            </InfoItem>
            <InfoItem title="Limpar Jogo">
              Empurrar o curinga para sua posição natural. Exemplo: 4-5-6-2-8-9.
              Você pode adicionar 7 e 3 para limpar esse jogo. Ficando
              2-3-4-5-6-7-8-9
            </InfoItem>
            <InfoItem title="Sujar Jogo">
              Adicionar curinga em um jogo promissor. Exemplo: Um jogo 4-5-6-7.
              Depois você adiciona 4-5-6-7-2-9-10. Não é sempre que seu time vai
              conseguir limpar. É da sua escolha: esperar vir o 8 ou sujar.
            </InfoItem>
            <InfoItem title="Pegar o Lixo">
              Em vez de comprar, você pode pegar a carta do topo do lixo. Você
              pode pegar se ela encaixa em algum jogo criado ou se você possui
              duas cartas que com esta, forma uma sequência de no mínimo 3
              cartas. Criando novo jogo.
            </InfoItem>
            <InfoItem title="Bater">
              Zerar as cartas da mão após já ter pegado o morto.
            </InfoItem>
            <InfoItem title="Morto">
              Um monte de 11 cartas reserva que você pode pegar quando fica sem
              cartas na mão. Há dois por jogo. Cada time só pode pegar um. Ele
              está identificado como um ícone de uma caveira abaixo do monte.
            </InfoItem>
            <InfoItem title="Canastra">
              Um jogo com 7 ou mais cartas. Vale muitos pontos!
            </InfoItem>
          </div>

          <SectionTitle icon={<Star size={24} />}>
            Tipos de Canastra
          </SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem title="Canastra Limpa (200 pts)">
              7 ou mais cartas em sequência, sem usar nenhum curinga.
            </InfoItem>
            <InfoItem title="Canastra Suja (100 pts)">
              Uma canastra que inclui um curinga (carta 2).
            </InfoItem>
            <InfoItem title="Canastra Excelente (500 pts)">
              Uma canastra limpa de 13 cartas. Ex.: do 'A' ao 'K'
            </InfoItem>
            <InfoItem title="Canastra Real (1000 pts)">
              Uma canastra perfeita do Ás ao Ás
            </InfoItem>
          </div>

          <SectionTitle icon={<Crown size={24} />}>Pontuação</SectionTitle>
          <ul className="space-y-2">
            <li className="flex items-center gap-3 bg-white/5 p-3 rounded-lg">
              <span className="font-black text-green-400">100</span>
              <span className="text-slate-300">Pontos pela Batida Final.</span>
            </li>
            <li className="flex items-center gap-3 bg-white/5 p-3 rounded-lg">
              <span className="font-black text-slate-300">+/-</span>
              <span className="text-slate-300">
                Soma dos valores das cartas na mesa, menos as da mão.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
