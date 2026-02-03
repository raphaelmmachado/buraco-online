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
    <h3 className="text-xl font-black text-cyan-400 tracking-wide">
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
    <strong className="font-black text-slate-100 uppercase tracking-wider">
      {title}
    </strong>
    <p className="text-slate-400 text-sm mt-1 leading-relaxed">{children}</p>
  </div>
);

export const HowToPlay = ({ onClose }: HowToPlayProps) => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] animate-fade-in font-sans">
      <div className="bg-gray-900/80 backdrop-blur-2xl border-2 border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl m-4">
        <header className="p-6 flex items-center justify-between border-b border-white/10 shrink-0">
          <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 via-yellow-500 to-orange-600 tracking-wide">
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
          <p className="text-base text-slate-300 leading-relaxed">
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
          <ol className="relative border-l-2 border-cyan-400/20 ml-3 space-y-8 mt-6">
            <li className="ml-8">
              <span className="absolute -left-4 flex items-center justify-center w-8 h-8 bg-cyan-900 rounded-full ring-4 ring-gray-800 font-black text-cyan-300">
                1
              </span>
              <h4 className="font-bold text-lg text-slate-100">
                Comprar uma carta
              </h4>
              <p className="text-slate-400 text-sm leading-relaxed">
                Você começa seu turno comprando uma carta do monte. Se o lixo
                for do seu interesse, você também pode pegá-lo.
              </p>
            </li>
            <li className="ml-8">
              <span className="absolute -left-4 flex items-center justify-center w-8 h-8 bg-cyan-900 rounded-full ring-4 ring-gray-800 font-black text-cyan-300">
                2
              </span>
              <h4 className="font-bold text-lg text-slate-100">
                Baixar Jogos (Opcional)
              </h4>
              <p className="text-slate-400 text-sm leading-relaxed">
                Se tiver sequências de 3 ou mais cartas do mesmo naipe, você
                pode "baixá-las" na mesa. Você também pode adicionar cartas a
                jogos já existentes.
              </p>
            </li>
            <li className="ml-8">
              <span className="absolute -left-4 flex items-center justify-center w-8 h-8 bg-cyan-900 rounded-full ring-4 ring-gray-800 font-black text-cyan-300">
                3
              </span>
              <h4 className="font-bold text-lg text-slate-100">
                Descartar uma carta
              </h4>
              <p className="text-slate-400 text-sm leading-relaxed">
                Para finalizar seu turno, você deve jogar uma carta da sua mão
                no lixo.
              </p>
            </li>
          </ol>

          <SectionTitle icon={<Shield size={24} />}>
            Conceitos Importantes
          </SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem title="Jogos (Sequências)">
              <p>Sequências de 3+ cartas do mesmo naipe. A ordem é:</p>
              <span className="font-mono uppercase tracking-widest mt-2 block p-2 bg-black/20 rounded">
                {"A-2-3-4-5-6-7-8-9-10-J-Q-K-A"}
              </span>
            </InfoItem>
            <InfoItem title="Cartas">
              <p>
                <span className="font-bold">A:</span> Ás
              </p>
              <p>
                <span className="font-bold">J:</span> Valete{" "}
              </p>
              <p>
                <span className="font-bold">Q:</span> Dama
              </p>
              <p>
                <span className="font-bold">K:</span> Rei
              </p>
            </InfoItem>
            <InfoItem title="Naipes">
              <p>Copas ♥️ </p>
              <p>Ouro ♦️</p>
              <p>Paus ♣️</p>
              <p>Espadas ♠️ </p>
            </InfoItem>
            <InfoItem title="Curinga">
              A carta '2' substitui qualquer outra em um jogo. Apenas um curinga
              por jogo é permitido (a menos que o outro '2' esteja em sua
              posição natural).
            </InfoItem>
            <InfoItem title="Pegar o Lixo">
              Você só pode pegar o lixo se a carta do topo for usada
              imediatamente em um jogo. Ao fazer isso, você pega todas as outras
              cartas do lixo.
            </InfoItem>
            <InfoItem title="Morto">
              Uma pilha de 11 cartas que uma dupla pega quando um de seus
              jogadores fica sem cartas na mão. Cada dupla só pode pegar um
              morto.
            </InfoItem>
            <InfoItem title="Bater">
              Significa ficar sem cartas na mão. Para "bater final" e encerrar a
              rodada, sua dupla deve ter pelo menos uma canastra limpa.
            </InfoItem>
            <InfoItem title="Canastra">
              Um jogo com 7 ou mais cartas. Fazer canastras é essencial para uma
              boa pontuação.
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
              Uma canastra que inclui um curinga (carta '2').
            </InfoItem>
            <InfoItem title="Canastra de Quinhentos (500 pts)">
              Uma canastra limpa de Ás a Rei (13 cartas).
            </InfoItem>
            <InfoItem title="Canastra Real (1000 pts)">
              Uma canastra limpa de Ás a Ás (14 cartas), sem curingas.
            </InfoItem>
          </div>

          <SectionTitle icon={<Crown size={24} />}>Pontuação</SectionTitle>
          <ul className="space-y-3 text-base">
            <li className="flex items-center justify-between bg-white/5 p-3 rounded-lg">
              <span className="text-slate-300">Batida Final</span>
              <span className="font-bold text-green-400">100 pontos</span>
            </li>
            <li className="flex items-center justify-between bg-white/5 p-3 rounded-lg">
              <span className="text-slate-300">Valor das cartas na mesa</span>
              <span className="font-bold text-slate-300">(+) Soma-se</span>
            </li>
            <li className="flex items-center justify-between bg-white/5 p-3 rounded-lg">
              <span className="text-slate-300">Valor das cartas na mão</span>
              <span className="font-bold text-red-400">(-) Subtrai-se</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
