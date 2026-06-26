export default function Revenue() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text">
      <div className="absolute top-[-15vh] right-[-8vw] w-[40vw] h-[40vw] rounded-full bg-primary/5 blur-[120px]" />

      <div className="relative h-full w-full flex flex-col px-[8vw] py-[7vh]">
        <div className="flex items-center justify-between mb-[1vh]">
          <span className="font-display font-bold text-primary text-[1.2vw] tracking-tight">BASONCE EXCHANGE</span>
          <span className="text-muted text-[1.1vw] font-body">14 / 16</span>
        </div>
        <div className="w-full h-px bg-white/10 mb-[4vh]" />

        <h2 className="font-display font-bold text-[3.8vw] leading-tight tracking-tight mb-[1.5vh]">
          Gelir modeli
        </h2>
        <p className="text-muted text-[1.5vw] font-body max-w-[66vw] leading-snug mb-[5vh] text-pretty">
          Çok kanallı, hacimle ölçeklenen gelir. Tek bir akışa bağımlı değil; her
          modül kendi gelirini üretir.
        </p>

        <div className="grid grid-cols-3 gap-[1.8vw]">
          <div className="bg-surface rounded-2xl px-[1.8vw] py-[3vh] border border-white/5">
            <div className="text-primary text-[1.55vw] font-display font-bold">Token & listeleme</div>
            <div className="text-muted text-[1.15vw] leading-snug mt-[1vh]">Oluşturma ve kontrollü listeleme ücretleri.</div>
          </div>
          <div className="bg-surface rounded-2xl px-[1.8vw] py-[3vh] border border-white/5">
            <div className="text-primary text-[1.55vw] font-display font-bold">Spot komisyon</div>
            <div className="text-muted text-[1.15vw] leading-snug mt-[1vh]">Her spot işlemde alım-satım komisyonu.</div>
          </div>
          <div className="bg-surface rounded-2xl px-[1.8vw] py-[3vh] border border-white/5">
            <div className="text-primary text-[1.55vw] font-display font-bold">Vadeli komisyon</div>
            <div className="text-muted text-[1.15vw] leading-snug mt-[1vh]">Kaldıraçlı hacimden yüksek komisyon ve funding.</div>
          </div>
          <div className="bg-surface rounded-2xl px-[1.8vw] py-[3vh] border border-white/5">
            <div className="text-primary text-[1.55vw] font-display font-bold">Çoklu varlık spreadi</div>
            <div className="text-muted text-[1.15vw] leading-snug mt-[1vh]">Hisse, emtia ve forex modüllerinde marj farkı.</div>
          </div>
          <div className="bg-surface rounded-2xl px-[1.8vw] py-[3vh] border border-white/5">
            <div className="text-primary text-[1.55vw] font-display font-bold">Para çekme ücretleri</div>
            <div className="text-muted text-[1.15vw] leading-snug mt-[1vh]">Zincir bazında işlem ve çekim ücretleri.</div>
          </div>
          <div className="bg-surface rounded-2xl px-[1.8vw] py-[3vh] border border-white/5">
            <div className="text-primary text-[1.55vw] font-display font-bold">Madencilik & ekipman</div>
            <div className="text-muted text-[1.15vw] leading-snug mt-[1vh]">Yükseltme ve ekipman satışından doğrudan gelir.</div>
          </div>
        </div>

        <div className="mt-auto pt-[3vh] text-muted text-[1.05vw] font-body">
          Tüm gelir akışları bugün canlı modüller üzerinden tahsil ediliyor.
        </div>
      </div>
    </div>
  );
}
