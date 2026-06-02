export default function RevenueListings() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text">
      <div className="relative h-full w-full flex px-[8vw] py-[7vh]">
        <div className="w-[44%] flex flex-col justify-center pr-[4vw]">
          <div className="text-primary font-body font-extrabold tracking-[0.25em] text-[1.1vw] uppercase mb-[2vh]">
            Gelir Motoru 01
          </div>
          <h2 className="font-display font-bold text-[3.8vw] leading-tight tracking-tight mb-[3vh]">
            Listeleme ücretleri
          </h2>
          <p className="text-muted text-[1.6vw] font-body leading-snug mb-[4vh] text-pretty">
            Her yeni projeyi borsaya almak için sabit ücret. Sıfır maliyet, saf
            kâr — talep her zaman arzdan fazla.
          </p>
          <div className="flex items-baseline gap-[1.2vw]">
            <span className="text-muted text-[1.4vw]">Liste başı</span>
            <span className="font-display font-bold text-text text-[2.6vw]">$5.000</span>
          </div>
          <div className="flex items-baseline gap-[1.2vw] mt-[1.5vh]">
            <span className="text-muted text-[1.4vw]">Günlük adet</span>
            <span className="font-display font-bold text-text text-[2.6vw]">5 listeleme</span>
          </div>
        </div>

        <div className="w-[56%] flex flex-col justify-center gap-[2.5vh]">
          <div className="bg-surface rounded-2xl px-[2.5vw] py-[3.5vh] border border-white/5 flex items-center justify-between">
            <span className="text-muted text-[1.6vw] font-semibold">Günlük</span>
            <span className="font-display font-bold text-text text-[3vw]">$25.000</span>
          </div>
          <div className="bg-surface rounded-2xl px-[2.5vw] py-[3.5vh] border border-white/5 flex items-center justify-between">
            <span className="text-muted text-[1.6vw] font-semibold">Aylık</span>
            <span className="font-display font-bold text-text text-[3vw]">$750.000</span>
          </div>
          <div className="rounded-2xl px-[2.5vw] py-[4vh] border border-primary/40 bg-primary/10 flex items-center justify-between">
            <span className="text-primary text-[1.7vw] font-display font-bold">Yıllık</span>
            <span className="font-display font-bold text-primary text-[4vw] leading-none">$9,0M</span>
          </div>
        </div>
      </div>
    </div>
  );
}
