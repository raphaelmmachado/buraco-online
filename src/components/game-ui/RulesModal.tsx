export const RulesModal = ({ onClose }: { onClose: () => void }) => (
  <div
    id="rules-overlay"
    className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300"
  >
    <div
      id="rules-content"
      className="bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.8)] relative animate-in zoom-in-95 duration-300"
    >
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-white/30 hover:text-white w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 transition-all z-10"
      >
        ✕
      </button>

      <div className="p-8 border-b border-white/5 bg-white/5 rounded-t-3xl">
        <h2 className="text-2xl font-black text-white uppercase tracking-[0.3em] flex items-center gap-4">
          <span className="text-yellow-500 text-3xl drop-shadow-[0_0_15px_rgba(234,179,8,0.4)]">
            📜
          </span>
          Regras do Jogo
        </h2>
      </div>

      <div className="p-8 overflow-y-auto text-slate-300 space-y-8 scrollbar-hide">
        <section className="space-y-3">
          <h3 className="font-black text-white text-xs uppercase tracking-[0.2em] opacity-50">
            Objetivo
          </h3>
          <p className="text-lg leading-relaxed font-medium">
            Formar canastras (7+ cartas do mesmo naipe), bater (zerar a mão) e
            somar pontos. Jogado com 2 baralhos.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="font-black text-white text-xs uppercase tracking-[0.2em] opacity-50">
            Pontuação de Canastras
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Limpa", pts: "400", color: "text-blue-400" },
              { label: "Suja", pts: "100", color: "text-amber-400" },
              { label: "Real", pts: "500", color: "text-green-400" },
              { label: "Super", pts: "1000", color: "text-purple-400" },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-white/5 p-4 rounded-2xl border border-white/5"
              >
                <span className={`block text-xl font-black ${item.color}`}>
                  {item.pts}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest opacity-60">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="font-black text-white text-xs uppercase tracking-[0.2em] opacity-50">
            Importante
          </h3>
          <ul className="space-y-3">
            {[
              "Apenas sequências do mesmo naipe. Trincas não valem.",
              "O '2' é o único curinga. Máximo 1 por jogo.",
              "Para bater final, é obrigatório ter canastra limpa.",
              "Lixo só abre com jogo limpo da mão.",
            ].map((text, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="text-blue-500 font-bold">•</span>
                {text}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="p-6 border-t border-white/5 bg-black/20 rounded-b-3xl flex justify-center">
        <button
          onClick={onClose}
          className="px-10 py-3 bg-white text-black font-black rounded-full hover:bg-yellow-500 transition-all text-[10px] uppercase tracking-[0.3em] shadow-xl"
        >
          Fechar Regras
        </button>
      </div>
    </div>
  </div>
);
