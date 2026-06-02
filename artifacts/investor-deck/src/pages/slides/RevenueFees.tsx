export default function RevenueFees() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text">
      <div className="relative h-full w-full flex flex-col px-[8vw] py-[7vh]">
        <div className="flex items-center justify-between mb-[1vh]">
          <span className="font-display font-bold text-primary text-[1.2vw] tracking-tight">
            KITE EXCHANGE
          </span>
          <span className="text-muted text-[1.1vw] font-body">06 / 12</span>
        </div>
        <div className="w-full h-px bg-white/10 mb-[4vh]" />

        <div className="text-primary font-body font-extrabold tracking-[0.25em] text-[1.1vw] uppercase mb-[1.5vh]">
          Gelir Motoru 02 & 03
        </div>
        <h2 className="font-display font-bold text-[3.8vw] leading-tight tracking-tight mb-[1.5vh]">
          İşlem komisyonları
        </h2>
        <p className="text-muted text-[1.6vw] font-body max-w-[60vw] leading-snug mb-[4vh]">
          Her alımda ve satımda otomatik tahsilat. Hacim büyüdükçe gelir kendiliğinden katlanır.
        </p>

        <div className="grid grid-cols-[1.3fr_1fr_1fr_1fr] gap-x-[1.5vw] items-center bg-surface rounded-t-2xl px-[2vw] py-[2.5vh] border border-white/5">
          <span className="text-muted text-[1.25vw] font-bold uppercase tracking-wide">İşlem türü</span>
          <span className="text-muted text-[1.25vw] font-bold uppercase tracking-wide text-right">Oran</span>
          <span className="text-muted text-[1.25vw] font-bold uppercase tracking-wide text-right">Günlük hacim</span>
          <span className="text-muted text-[1.25vw] font-bold uppercase tracking-wide text-right">Yıllık gelir</span>
        </div>
        <div className="grid grid-cols-[1.3fr_1fr_1fr_1fr] gap-x-[1.5vw] items-center px-[2vw] py-[3vh] border-x border-white/5 bg-white/[0.02]">
          <span className="text-text text-[1.8vw] font-display font-bold">Spot</span>
          <span className="text-text text-[1.8vw] font-semibold text-right">%0,1</span>
          <span className="text-muted text-[1.6vw] text-right">$8M</span>
          <span className="text-primary text-[2vw] font-display font-bold text-right">$2,9M</span>
        </div>
        <div className="grid grid-cols-[1.3fr_1fr_1fr_1fr] gap-x-[1.5vw] items-center px-[2vw] py-[3vh] border-x border-white/5">
          <span className="text-text text-[1.8vw] font-display font-bold">Vadeli (taker)</span>
          <span className="text-text text-[1.8vw] font-semibold text-right">%0,04</span>
          <span className="text-muted text-[1.6vw] text-right">$40M</span>
          <span className="text-primary text-[2vw] font-display font-bold text-right">$5,8M</span>
        </div>
        <div className="grid grid-cols-[1.3fr_1fr_1fr_1fr] gap-x-[1.5vw] items-center rounded-b-2xl px-[2vw] py-[3vh] border border-primary/40 bg-primary/10">
          <span className="text-primary text-[1.9vw] font-display font-bold">Toplam</span>
          <span className="text-right" />
          <span className="text-right" />
          <span className="text-primary text-[2.6vw] font-display font-bold text-right leading-none">$8,7M</span>
        </div>

        <div className="mt-auto pt-[3vh] text-muted text-[1.05vw] font-body">
          Kaldıraç sayesinde küçük teminat büyük işlem hacmi yaratır — komisyon taban hacmi bu yüzden yüksektir.
        </div>
      </div>
    </div>
  );
}
