const base = import.meta.env.BASE_URL;

export default function Spot() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text">
      <div className="absolute top-[-15vh] right-[-8vw] w-[40vw] h-[40vw] rounded-full bg-primary/5 blur-[120px]" />

      <div className="relative h-full w-full flex flex-col px-[6vw] py-[6vh]">
        <div className="flex items-center justify-between mb-[1vh]">
          <span className="font-display font-bold text-primary text-[1.2vw] tracking-tight">BASONCE EXCHANGE</span>
          <span className="text-muted text-[1.1vw] font-body">06 / 16</span>
        </div>
        <div className="w-full h-px bg-white/10 mb-[4vh]" />

        <div className="flex-1 flex items-center gap-[4vw]">
          <div className="flex-1 flex justify-start">
            <div className="relative w-[50vw] rounded-2xl overflow-hidden border border-white/10 bg-surface shadow-2xl shadow-black/50">
              <div className="flex items-center gap-[0.6vw] px-[1.2vw] h-[4vh] bg-[#0d1014] border-b border-white/10">
                <div className="w-[0.8vw] h-[0.8vw] rounded-full bg-[#ff5f56]" />
                <div className="w-[0.8vw] h-[0.8vw] rounded-full bg-[#ffbd2e]" />
                <div className="w-[0.8vw] h-[0.8vw] rounded-full bg-[#27c93f]" />
                <div className="ml-[1vw] px-[1vw] h-[2.6vh] flex items-center rounded-md bg-black/40 text-muted text-[0.95vw] font-body">basonce.com / trade</div>
              </div>
              <img src={`${base}shots/trade.jpg`} crossOrigin="anonymous" className="w-full h-[58vh] object-cover object-top" alt="Basonce spot ticaret arayüzü" />
            </div>
          </div>

          <div className="w-[34vw]">
            <div className="text-primary font-body font-extrabold tracking-[0.25em] text-[1vw] uppercase mb-[2vh]">Spot</div>
            <h2 className="font-display font-bold text-[3.4vw] leading-[1.05] tracking-tight mb-[3vh]">
              Profesyonel spot ticaret
            </h2>

            <div className="flex items-start gap-[1vw] mb-[2.4vh]">
              <div className="mt-[0.8vh] w-[0.7vw] h-[0.7vw] rounded-sm bg-primary shrink-0" />
              <div>
                <div className="text-text text-[1.45vw] font-display font-semibold leading-tight">Merkezi emir defteri (CLOB)</div>
                <div className="text-muted text-[1.1vw] leading-snug">Gerçek zamanlı emir eşleştirme ve derin defter.</div>
              </div>
            </div>
            <div className="flex items-start gap-[1vw] mb-[2.4vh]">
              <div className="mt-[0.8vh] w-[0.7vw] h-[0.7vw] rounded-sm bg-primary shrink-0" />
              <div>
                <div className="text-text text-[1.45vw] font-display font-semibold leading-tight">Profesyonel grafikler</div>
                <div className="text-muted text-[1.1vw] leading-snug">Çoklu zaman dilimi, göstergeler ve canlı işlemler.</div>
              </div>
            </div>
            <div className="flex items-start gap-[1vw]">
              <div className="mt-[0.8vh] w-[0.7vw] h-[0.7vw] rounded-sm bg-primary shrink-0" />
              <div>
                <div className="text-text text-[1.45vw] font-display font-semibold leading-tight">Her işlemde komisyon</div>
                <div className="text-muted text-[1.1vw] leading-snug">Hacimle ölçeklenen istikrarlı gelir akışı.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
