export default function RevenueModel() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text">
      <div className="absolute top-[-15vh] right-[-8vw] w-[40vw] h-[40vw] rounded-full bg-accent/5 blur-[120px]" />

      <div className="relative h-full w-full flex flex-col px-[8vw] py-[7vh]">
        <div className="flex items-center justify-between mb-[1vh]">
          <span className="font-display font-bold text-primary text-[1.2vw] tracking-tight">
            KITE EXCHANGE
          </span>
          <span className="text-muted text-[1.1vw] font-body">04 / 12</span>
        </div>
        <div className="w-full h-px bg-white/10 mb-[4vh]" />

        <div className="flex items-end justify-between mb-[4vh]">
          <div>
            <h2 className="font-display font-bold text-[4.2vw] leading-tight tracking-tight">
              Gelir modeli
            </h2>
            <p className="text-muted text-[1.6vw] font-body">Dört motor, tek yıllık toplam.</p>
          </div>
          <div className="text-right">
            <div className="text-muted text-[1.3vw]">Tam kapasite yıllık gelir</div>
            <div className="font-display font-bold text-accent text-[4.4vw] leading-none">$19,5M</div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-[1.8vw]">
          <div className="bg-surface rounded-2xl px-[1.8vw] py-[4vh] border border-white/5">
            <div className="text-muted text-[1.1vw] font-semibold uppercase tracking-wide">Motor 01</div>
            <div className="mt-[2vh] text-text text-[1.7vw] font-display font-bold leading-tight">Listeleme ücretleri</div>
            <div className="mt-[3vh] font-display font-bold text-primary text-[3vw] leading-none">$9,0M</div>
            <div className="text-muted text-[1.1vw] mt-[1vh]">yıllık</div>
          </div>
          <div className="bg-surface rounded-2xl px-[1.8vw] py-[4vh] border border-white/5">
            <div className="text-muted text-[1.1vw] font-semibold uppercase tracking-wide">Motor 02</div>
            <div className="mt-[2vh] text-text text-[1.7vw] font-display font-bold leading-tight">Spot komisyonu</div>
            <div className="mt-[3vh] font-display font-bold text-primary text-[3vw] leading-none">$2,9M</div>
            <div className="text-muted text-[1.1vw] mt-[1vh]">yıllık</div>
          </div>
          <div className="bg-surface rounded-2xl px-[1.8vw] py-[4vh] border border-white/5">
            <div className="text-muted text-[1.1vw] font-semibold uppercase tracking-wide">Motor 03</div>
            <div className="mt-[2vh] text-text text-[1.7vw] font-display font-bold leading-tight">Vadeli komisyonu</div>
            <div className="mt-[3vh] font-display font-bold text-primary text-[3vw] leading-none">$5,8M</div>
            <div className="text-muted text-[1.1vw] mt-[1vh]">yıllık</div>
          </div>
          <div className="bg-surface rounded-2xl px-[1.8vw] py-[4vh] border border-white/5">
            <div className="text-muted text-[1.1vw] font-semibold uppercase tracking-wide">Motor 04</div>
            <div className="mt-[2vh] text-text text-[1.7vw] font-display font-bold leading-tight">Token & TON kutuları</div>
            <div className="mt-[3vh] font-display font-bold text-primary text-[3vw] leading-none">$1,8M</div>
            <div className="text-muted text-[1.1vw] mt-[1vh]">yıllık</div>
          </div>
        </div>

        <div className="mt-auto pt-[3.5vh] text-muted text-[1.05vw] font-body">
          Rakamlar tam kapasite (steady-state) projeksiyonudur. Detaylar sonraki sayfalarda.
        </div>
      </div>
    </div>
  );
}
