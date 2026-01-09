export const RulesModal = ({ onClose }: { onClose: () => void }) => (
  <div
    id="rules-overlay"
    className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300"
  >
    <div
      id="rules-content"
      className="bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.8)] relative animate-in zoom-in-95 duration-300"
    >
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-white/30 hover:text-white w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 transition-all z-10"
      >
        ✕
      </button>

      <div className="p-6 md:p-8 border-b border-white/5 bg-white/5 rounded-t-3xl">
        <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-[0.3em] flex items-center gap-4">
          <span className="text-yellow-500 text-3xl drop-shadow-[0_0_15px_rgba(234,179,8,0.4)]">
            📜
          </span>
          Regras do Jogo
        </h2>
      </div>

      <div className="p-6 md:p-8 overflow-y-auto text-slate-300 space-y-8 scrollbar-hide">
        {/* VISÃO GERAL */}
        <section className="space-y-3">
          <h3 className="font-black text-blue-400 text-[10px] md:text-xs uppercase tracking-[0.2em] opacity-80">
            Visão Geral
          </h3>
          <p className="text-sm md:text-base leading-relaxed">
            O Buraco Fechado (STBL) é jogado com 2 baralhos (104 cartas). O objetivo é formar <strong>canastras</strong> (7+ cartas do mesmo naipe), bater e somar pontos.
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            <li className="flex gap-2">
              <span className="text-yellow-500">✔</span> Apenas sequências do mesmo naipe.
            </li>
            <li className="flex gap-2">
              <span className="text-yellow-500">✔</span> Não valem trincas (lavadeiras).
            </li>
            <li className="flex gap-2">
              <span className="text-yellow-500">✔</span> Os "2" são os únicos curingas.
            </li>
            <li className="flex gap-2">
              <span className="text-yellow-500">✔</span> Lixo fechado (só o topo é visível).
            </li>
          </ul>
        </section>

        {/* PONTUAÇÃO */}
        <section className="space-y-4">
          <h3 className="font-black text-blue-400 text-[10px] md:text-xs uppercase tracking-[0.2em] opacity-80">
            Pontuação das Cartas
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { l: "Ás", p: "15" },
              { l: "8 ao K", p: "10" },
              { l: "3 ao 7", p: "5" },
              { l: "2 (Curinga)", p: "20" },
            ].map((item) => (
              <div key={item.l} className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
                <span className="block text-lg font-black text-white">{item.p}</span>
                <span className="text-[9px] uppercase font-bold opacity-40">{item.l}</span>
              </div>
            ))}
          </div>
        </section>

        {/* BÔNUS CANASTRAS */}
        <section className="space-y-4">
          <h3 className="font-black text-blue-400 text-[10px] md:text-xs uppercase tracking-[0.2em] opacity-80">
            Bônus de Canastras
          </h3>
          <div className="space-y-2">
            {[
              { n: "Limpa", p: "+400", d: "7+ cartas sem curinga" },
              { n: "Suja", p: "+100", d: "7+ cartas com 1 curinga" },
              { n: "De 500", p: "+500", d: "13 cartas sem curinga" },
              { n: "Real", p: "+1000", d: "A ao A (14 cartas) limpa" },
              { n: "Batida", p: "+100", d: "Zerar a mão e pegar o morto" },
            ].map((item) => (
              <div key={item.n} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                <div>
                  <span className="font-black text-white text-sm">{item.n}</span>
                  <p className="text-[10px] opacity-50">{item.d}</p>
                </div>
                <span className="font-black text-green-400">{item.p}</span>
              </div>
            ))}
          </div>
        </section>

        {/* REGRAS DE CURINGA */}
        <section className="space-y-3">
          <h3 className="font-black text-blue-400 text-[10px] md:text-xs uppercase tracking-[0.2em] opacity-80">
            Regras de Curinga
          </h3>
          <p className="text-xs leading-relaxed">
            Máximo de <strong>um "2" como curinga</strong> por canastra. Pode haver outro "2" no mesmo jogo se ele estiver na sua posição natural (como valor 2). O Ás pode ser baixo (antes do 2) ou alto (depois do K).
          </p>
        </section>

        {/* COMPRA DO LIXO */}
        <section className="space-y-3">
          <h3 className="font-black text-blue-400 text-[10px] md:text-xs uppercase tracking-[0.2em] opacity-80">
            Compra do Lixo
          </h3>
          <p className="text-xs leading-relaxed">
            Você só pode pegar o lixo se a carta do topo for usada <strong>imediatamente</strong> em um jogo (novo ou já na mesa). Ao pegar o topo, você leva todas as cartas que estavam abaixo dele.
          </p>
        </section>

        {/* BATIDA */}
        <section className="space-y-3">
          <h3 className="font-black text-blue-400 text-[10px] md:text-xs uppercase tracking-[0.2em] opacity-80">
            Batida Final
          </h3>
          <p className="text-xs leading-relaxed">
            Para encerrar a rodada (bater), sua dupla <strong>deve ter pelo menos uma canastra limpa</strong>. Se o morto não for pego, a dupla perde 100 pontos.
          </p>
        </section>

        {/* PROIBIDO */}
        <section className="space-y-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
          <h3 className="font-black text-red-400 text-[10px] md:text-xs uppercase tracking-[0.2em]">
            ⚠️ Proibido
          </h3>
          <ul className="text-[10px] md:text-xs space-y-1 opacity-80">
            <li>• Usar mais de um "2" como curinga.</li>
            <li>• Fazer sequências "wrap-around" (K-A-2).</li>
            <li>• Bater sem canastra limpa.</li>
            <li>• Trincas ou Lavadeiras de naipes diferentes.</li>
          </ul>
        </section>
      </div>

      <div className="p-6 border-t border-white/5 bg-black/20 rounded-b-3xl flex justify-center">
        <button
          onClick={onClose}
          className="px-10 py-3 bg-white text-black font-black rounded-full hover:bg-yellow-500 transition-all text-[10px] uppercase tracking-[0.3em] shadow-xl active:scale-95"
        >
          Entendi
        </button>
      </div>
    </div>
  </div>
);

