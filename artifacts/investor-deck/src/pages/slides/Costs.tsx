export default function Costs() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text">
      <div className="relative h-full w-full flex flex-col px-[8vw] py-[7vh]">
        <div className="flex items-center justify-between mb-[1vh]">
          <span className="font-display font-bold text-primary text-[1.2vw] tracking-tight">
            KITE EXCHANGE
          </span>
          <span className="text-muted text-[1.1vw] font-body">09 / 12</span>
        </div>
        <div className="w-full h-px bg-white/10 mb-[3.5vh]" />

        <div className="flex items-end justify-between mb-[4vh]">
          <div>
            <h2 className="font-display font-bold text-[4vw] leading-tight tracking-tight">
              Gelir, gider ve net kâr
            </h2>
            <p className="text-muted text-[1.5vw] font-body">Şeffaf tablo: para nereden geliyor, nereye gidiyor.</p>
          </div>
          <div className="text-right">
            <div className="text-muted text-[1.2vw]">Tam kapasite net kâr</div>
            <div className="font-display font-bold text-accent text-[3.6vw] leading-none">$15,0M</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-[3vw]">
          <div>
            <div className="text-accent text-[1.6vw] font-display font-bold mb-[2.5vh]">Gelirler · $20,5M</div>
            <div className="flex items-center justify-between border-b border-white/8 pb-[1.3vh] mb-[1.3vh]">
              <span className="text-text text-[1.5vw]">Tahta / listeleme</span>
              <span className="text-text text-[1.6vw] font-display font-bold">$9,0M</span>
            </div>
            <div className="flex items-center justify-between border-b border-white/8 pb-[1.3vh] mb-[1.3vh]">
              <span className="text-text text-[1.5vw]">Vadeli komisyon</span>
              <span className="text-text text-[1.6vw] font-display font-bold">$5,8M</span>
            </div>
            <div className="flex items-center justify-between border-b border-white/8 pb-[1.3vh] mb-[1.3vh]">
              <span className="text-text text-[1.5vw]">Spot komisyon</span>
              <span className="text-text text-[1.6vw] font-display font-bold">$2,9M</span>
            </div>
            <div className="flex items-center justify-between border-b border-white/8 pb-[1.3vh] mb-[1.3vh]">
              <span className="text-text text-[1.5vw]">Mining & token</span>
              <span className="text-text text-[1.6vw] font-display font-bold">$1,8M</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text text-[1.5vw]">P2P komisyon</span>
              <span className="text-text text-[1.6vw] font-display font-bold">$1,0M</span>
            </div>
          </div>

          <div>
            <div className="text-primary text-[1.6vw] font-display font-bold mb-[2.5vh]">Giderler · $5,5M</div>
            <div className="flex items-center justify-between border-b border-white/8 pb-[1.3vh] mb-[1.3vh]">
              <span className="text-text text-[1.5vw]">Pazarlama & büyüme</span>
              <span className="text-text text-[1.6vw] font-display font-bold">$2,0M</span>
            </div>
            <div className="flex items-center justify-between border-b border-white/8 pb-[1.3vh] mb-[1.3vh]">
              <span className="text-text text-[1.5vw]">Ekip & geliştirme</span>
              <span className="text-text text-[1.6vw] font-display font-bold">$1,3M</span>
            </div>
            <div className="flex items-center justify-between border-b border-white/8 pb-[1.3vh] mb-[1.3vh]">
              <span className="text-text text-[1.5vw]">Altyapı & likidite</span>
              <span className="text-text text-[1.6vw] font-display font-bold">$1,0M</span>
            </div>
            <div className="flex items-center justify-between border-b border-white/8 pb-[1.3vh] mb-[1.3vh]">
              <span className="text-text text-[1.5vw]">Lisans & hukuk</span>
              <span className="text-text text-[1.6vw] font-display font-bold">$0,8M</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text text-[1.5vw]">Güvenlik & denetim</span>
              <span className="text-text text-[1.6vw] font-display font-bold">$0,4M</span>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-[3vh] flex items-center justify-between">
          <span className="text-muted text-[1.05vw] font-body">Tahmini, tam kapasite değerleri; pazar koşullarına göre değişebilir.</span>
          <span className="text-text text-[1.4vw] font-display font-bold">
            Marj: <span className="text-accent">%73</span>
          </span>
        </div>
      </div>
    </div>
  );
}
