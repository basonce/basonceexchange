const base = import.meta.env.BASE_URL;

export default function BasonScan() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text">
      <div className="absolute top-[-15vh] left-[-8vw] w-[40vw] h-[40vw] rounded-full bg-accent/5 blur-[120px]" />

      <div className="relative h-full w-full flex flex-col px-[6vw] py-[6vh]">
        <div className="flex items-center justify-between mb-[1vh]">
          <span className="font-display font-bold text-primary text-[1.2vw] tracking-tight">BASONCE EXCHANGE</span>
          <span className="text-muted text-[1.1vw] font-body">05 / 16</span>
        </div>
        <div className="w-full h-px bg-white/10 mb-[4vh]" />

        <div className="flex-1 flex items-center gap-[4vw]">
          <div className="w-[34vw]">
            <div className="text-accent font-body font-extrabold tracking-[0.25em] text-[1vw] uppercase mb-[2vh]">Şeffaflık</div>
            <h2 className="font-display font-bold text-[3.4vw] leading-[1.05] tracking-tight mb-[3vh]">
              BasonScan — halka açık denetim katmanı
            </h2>

            <div className="grid grid-cols-3 gap-[1.2vw] mb-[3.5vh]">
              <div>
                <div className="font-display font-bold text-text text-[2.1vw] leading-none">12.41M</div>
                <div className="text-muted text-[0.95vw] mt-[0.8vh]">Toplam hesap</div>
              </div>
              <div>
                <div className="font-display font-bold text-accent text-[2.1vw] leading-none">$25.58B</div>
                <div className="text-muted text-[0.95vw] mt-[0.8vh]">Kilitli değer</div>
              </div>
              <div>
                <div className="font-display font-bold text-text text-[2.1vw] leading-none">4.42B</div>
                <div className="text-muted text-[0.95vw] mt-[0.8vh]">Toplam işlem</div>
              </div>
            </div>

            <p className="text-muted text-[1.25vw] leading-snug text-pretty">
              Her blok, işlem ve token zincir üzerinde herkese açık. Yatırımcı ve
              denetçiler için tam izlenebilirlik — güven iddia değil, kanıt.
            </p>
          </div>

          <div className="flex-1 flex justify-end">
            <div className="relative w-[50vw] rounded-2xl overflow-hidden border border-white/10 bg-surface shadow-2xl shadow-black/50">
              <div className="flex items-center gap-[0.6vw] px-[1.2vw] h-[4vh] bg-[#0d1014] border-b border-white/10">
                <div className="w-[0.8vw] h-[0.8vw] rounded-full bg-[#ff5f56]" />
                <div className="w-[0.8vw] h-[0.8vw] rounded-full bg-[#ffbd2e]" />
                <div className="w-[0.8vw] h-[0.8vw] rounded-full bg-[#27c93f]" />
                <div className="ml-[1vw] px-[1vw] h-[2.6vh] flex items-center rounded-md bg-black/40 text-muted text-[0.95vw] font-body">basonscan.com</div>
              </div>
              <img src={`${base}shots/basonscan.jpg`} crossOrigin="anonymous" className="w-full h-[58vh] object-cover object-top" alt="BasonScan blok explorer" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
