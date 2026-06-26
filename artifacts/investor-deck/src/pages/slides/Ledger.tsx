export default function Ledger() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text">
      <div className="absolute top-[-15vh] right-[-8vw] w-[40vw] h-[40vw] rounded-full bg-accent/5 blur-[120px]" />

      <div className="relative h-full w-full flex flex-col px-[8vw] py-[7vh]">
        <div className="flex items-center justify-between mb-[1vh]">
          <span className="font-display font-bold text-primary text-[1.2vw] tracking-tight">BASONCE EXCHANGE</span>
          <span className="text-muted text-[1.1vw] font-body">12 / 16</span>
        </div>
        <div className="w-full h-px bg-white/10 mb-[4vh]" />

        <h2 className="font-display font-bold text-[3.8vw] leading-tight tracking-tight mb-[1.5vh]">
          Değişmez işlem defteri
        </h2>
        <p className="text-muted text-[1.5vw] font-body max-w-[66vw] leading-snug mb-[5vh] text-pretty">
          Her hareket çift girişli ve hash-zincirli olarak kaydedilir; geriye dönük
          değiştirilemez ve uçtan uca denetlenebilir.
        </p>

        <div className="grid grid-cols-4 gap-[1.6vw]">
          <div className="bg-surface rounded-2xl px-[1.6vw] py-[3.2vh] border border-white/5">
            <div className="font-display font-bold text-accent text-[1.6vw] mb-[1.2vh]">01 · Emir</div>
            <div className="text-text text-[1.3vw] font-display font-semibold leading-tight">Eşleştirme</div>
            <div className="text-muted text-[1.05vw] leading-snug mt-[1vh]">CLOB üzerinde emir alınır ve eşleştirilir.</div>
          </div>
          <div className="bg-surface rounded-2xl px-[1.6vw] py-[3.2vh] border border-white/5">
            <div className="font-display font-bold text-accent text-[1.6vw] mb-[1.2vh]">02 · Defter</div>
            <div className="text-text text-[1.3vw] font-display font-semibold leading-tight">Çift giriş</div>
            <div className="text-muted text-[1.05vw] leading-snug mt-[1vh]">Borç ve alacak her zaman dengelenir.</div>
          </div>
          <div className="bg-surface rounded-2xl px-[1.6vw] py-[3.2vh] border border-white/5">
            <div className="font-display font-bold text-accent text-[1.6vw] mb-[1.2vh]">03 · Zincir</div>
            <div className="text-text text-[1.3vw] font-display font-semibold leading-tight">Hash bağı</div>
            <div className="text-muted text-[1.05vw] leading-snug mt-[1vh]">Her kayıt bir öncekine kriptografik bağlanır.</div>
          </div>
          <div className="bg-surface rounded-2xl px-[1.6vw] py-[3.2vh] border border-white/5">
            <div className="font-display font-bold text-accent text-[1.6vw] mb-[1.2vh]">04 · Denetim</div>
            <div className="text-text text-[1.3vw] font-display font-semibold leading-tight">BasonScan</div>
            <div className="text-muted text-[1.05vw] leading-snug mt-[1vh]">Halka açık explorer'da herkese görünür.</div>
          </div>
        </div>

        <div className="mt-auto pt-[3vh] text-muted text-[1.05vw] font-body">
          Borsa içi muhasebe, zincir üstü doğrulamayla birebir uyumlu çalışır.
        </div>
      </div>
    </div>
  );
}
