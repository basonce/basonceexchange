export default function Ask() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text">
      <div className="absolute top-[-18vh] right-[-8vw] w-[42vw] h-[42vw] rounded-full bg-primary/10 blur-[120px]" />

      <div className="relative h-full w-full flex flex-col px-[8vw] py-[7vh]">
        <div className="flex items-center justify-between mb-[1vh]">
          <span className="font-display font-bold text-primary text-[1.2vw] tracking-tight">
            KITE EXCHANGE
          </span>
          <span className="text-muted text-[1.1vw] font-body">11 / 12</span>
        </div>
        <div className="w-full h-px bg-white/10 mb-[4vh]" />

        <div className="flex items-end justify-between mb-[4.5vh]">
          <div>
            <div className="text-primary font-body font-extrabold tracking-[0.25em] text-[1.1vw] uppercase mb-[1.5vh]">
              Yatırım Talebi
            </div>
            <h2 className="font-display font-bold text-[5.5vw] leading-none tracking-tight">
              $5.000.000
            </h2>
          </div>
          <div className="text-right">
            <div className="text-muted text-[1.3vw]">Önerilen hisse (müzakereye açık)</div>
            <div className="font-display font-bold text-text text-[3vw] leading-none">~%20</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-[3vw]">
          <div>
            <div className="text-text text-[1.7vw] font-display font-bold mb-[2.5vh]">Fonun kullanımı</div>
            <div className="flex items-center justify-between mb-[1.6vh]">
              <span className="text-muted text-[1.45vw]">Likidite & market making</span>
              <span className="text-text text-[1.6vw] font-display font-bold">$1,5M</span>
            </div>
            <div className="flex items-center justify-between mb-[1.6vh]">
              <span className="text-muted text-[1.45vw]">Pazarlama & büyüme</span>
              <span className="text-text text-[1.6vw] font-display font-bold">$1,5M</span>
            </div>
            <div className="flex items-center justify-between mb-[1.6vh]">
              <span className="text-muted text-[1.45vw]">Lisans & hukuk</span>
              <span className="text-text text-[1.6vw] font-display font-bold">$1,0M</span>
            </div>
            <div className="flex items-center justify-between mb-[1.6vh]">
              <span className="text-muted text-[1.45vw]">Teknoloji & güvenlik</span>
              <span className="text-text text-[1.6vw] font-display font-bold">$0,7M</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted text-[1.45vw]">Operasyon</span>
              <span className="text-text text-[1.6vw] font-display font-bold">$0,3M</span>
            </div>
          </div>

          <div className="flex flex-col gap-[2.2vh]">
            <div className="rounded-2xl px-[2.2vw] py-[3vh] border border-accent/40 bg-accent/10">
              <div className="text-accent text-[1.4vw] font-semibold">Geri ödeme süresi (projeksiyon)</div>
              <div className="font-display font-bold text-accent text-[4vw] leading-none mt-[1.5vh]">~10 ay</div>
            </div>
            <div className="rounded-2xl px-[2.2vw] py-[3vh] border border-white/8 bg-surface">
              <div className="text-muted text-[1.4vw]">Tam kapasite yıllık net kâr</div>
              <div className="font-display font-bold text-text text-[3.2vw] leading-none mt-[1.5vh]">$14,2M</div>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-[3vh] text-muted text-[1.05vw] font-body">
          ~10 ay geri ödeme, 12 aylık kademeli büyüme (ramp) senaryosunun kümülatif net nakit akışına dayanır; $14,2M net kâr ise tam kapasite yıllık rakamdır. Tahmini değerler, piyasa koşullarına göre değişebilir.
        </div>
      </div>
    </div>
  );
}
