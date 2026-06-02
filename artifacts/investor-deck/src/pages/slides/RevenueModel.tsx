export default function RevenueModel() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text">
      <div className="absolute top-[-15vh] right-[-8vw] w-[40vw] h-[40vw] rounded-full bg-accent/5 blur-[120px]" />

      <div className="relative h-full w-full flex flex-col px-[8vw] py-[7vh]">
        <div className="flex items-center justify-between mb-[1vh]">
          <span className="font-display font-bold text-primary text-[1.2vw] tracking-tight">
            KITE EXCHANGE
          </span>
          <span className="text-muted text-[1.1vw] font-body">03 / 13</span>
        </div>
        <div className="w-full h-px bg-white/10 mb-[3.5vh]" />

        <div className="flex items-end justify-between mb-[3.5vh]">
          <div>
            <h2 className="font-display font-bold text-[4vw] leading-tight tracking-tight">
              Gelir motorları
            </h2>
            <p className="text-muted text-[1.5vw] font-body">Beş ayrı gelir kapısı, tek yıllık toplam.</p>
          </div>
          <div className="text-right">
            <div className="text-muted text-[1.2vw]">Tam kapasite yıllık gelir</div>
            <div className="font-display font-bold text-accent text-[4.2vw] leading-none">$20,5M</div>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-[1.3vw]">
          <div className="bg-surface rounded-2xl px-[1.3vw] py-[3.5vh] border border-white/5">
            <div className="text-muted text-[1vw] font-semibold uppercase tracking-wide">01</div>
            <div className="mt-[1.5vh] text-text text-[1.45vw] font-display font-bold leading-tight">Tahta / Listeleme</div>
            <div className="mt-[2.5vh] font-display font-bold text-primary text-[2.6vw] leading-none">$9,0M</div>
          </div>
          <div className="bg-surface rounded-2xl px-[1.3vw] py-[3.5vh] border border-white/5">
            <div className="text-muted text-[1vw] font-semibold uppercase tracking-wide">02</div>
            <div className="mt-[1.5vh] text-text text-[1.45vw] font-display font-bold leading-tight">Spot komisyon</div>
            <div className="mt-[2.5vh] font-display font-bold text-primary text-[2.6vw] leading-none">$2,9M</div>
          </div>
          <div className="bg-surface rounded-2xl px-[1.3vw] py-[3.5vh] border border-white/5">
            <div className="text-muted text-[1vw] font-semibold uppercase tracking-wide">03</div>
            <div className="mt-[1.5vh] text-text text-[1.45vw] font-display font-bold leading-tight">Vadeli komisyon</div>
            <div className="mt-[2.5vh] font-display font-bold text-primary text-[2.6vw] leading-none">$5,8M</div>
          </div>
          <div className="bg-surface rounded-2xl px-[1.3vw] py-[3.5vh] border border-white/5">
            <div className="text-muted text-[1vw] font-semibold uppercase tracking-wide">04</div>
            <div className="mt-[1.5vh] text-text text-[1.45vw] font-display font-bold leading-tight">P2P komisyon</div>
            <div className="mt-[2.5vh] font-display font-bold text-primary text-[2.6vw] leading-none">$1,0M</div>
          </div>
          <div className="bg-surface rounded-2xl px-[1.3vw] py-[3.5vh] border border-white/5">
            <div className="text-muted text-[1vw] font-semibold uppercase tracking-wide">05</div>
            <div className="mt-[1.5vh] text-text text-[1.45vw] font-display font-bold leading-tight">Mining & token</div>
            <div className="mt-[2.5vh] font-display font-bold text-primary text-[2.6vw] leading-none">$1,8M</div>
          </div>
        </div>

        <div className="mt-auto pt-[3vh] text-muted text-[1.05vw] font-body">
          Rakamlar tam kapasite (steady-state) projeksiyonudur. Detaylar sonraki sayfalarda.
        </div>
      </div>
    </div>
  );
}
