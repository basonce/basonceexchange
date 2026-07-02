export default function RiskEngine() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text">
      <div className="absolute top-[-15vh] left-[-8vw] w-[40vw] h-[40vw] rounded-full bg-primary/5 blur-[120px]" />

      <div className="relative h-full w-full flex flex-col px-[8vw] py-[7vh]">
        <div className="flex items-center justify-between mb-[1vh]">
          <span className="font-display font-bold text-primary text-[1.2vw] tracking-tight">BASONCE EXCHANGE</span>
          <span className="text-muted text-[1.1vw] font-body">13 / 19</span>
        </div>
        <div className="w-full h-px bg-white/10 mb-[4vh]" />

        <h2 className="font-display font-bold text-[3.8vw] leading-tight tracking-tight mb-[1.5vh]">
          Risk & hedging motoru
        </h2>
        <p className="text-muted text-[1.5vw] font-body max-w-[66vw] leading-snug mb-[5vh] text-pretty">
          İç emir defteri, dış likidite ve hedging birlikte çalışır; pozisyonlar
          gerçek zamanlı izlenir ve net risk sürekli dengelenir.
        </p>

        <div className="grid grid-cols-3 gap-[2vw]">
          <div className="bg-surface rounded-2xl px-[1.9vw] py-[3.4vh] border border-white/5">
            <div className="text-text text-[1.6vw] font-display font-bold leading-tight">İç + dış likidite</div>
            <div className="text-muted text-[1.15vw] leading-snug mt-[1.4vh]">CLOB derinliği harici kaynaklarla beslenir; kaymalar azalır.</div>
          </div>
          <div className="bg-surface rounded-2xl px-[1.9vw] py-[3.4vh] border border-white/5">
            <div className="text-text text-[1.6vw] font-display font-bold leading-tight">Otomatik hedging</div>
            <div className="text-muted text-[1.15vw] leading-snug mt-[1.4vh]">Açık pozisyon riski karşıt işlemlerle nötrlenir.</div>
          </div>
          <div className="bg-surface rounded-2xl px-[1.9vw] py-[3.4vh] border border-white/5">
            <div className="text-text text-[1.6vw] font-display font-bold leading-tight">Gerçek zamanlı marj</div>
            <div className="text-muted text-[1.15vw] leading-snug mt-[1.4vh]">Teminat sürekli izlenir; eşik aşılınca otomatik likidasyon.</div>
          </div>
        </div>

        <div className="mt-auto pt-[3vh] text-muted text-[1.05vw] font-body">
          Hedef: kullanıcı kaldıracı yüksekken bile borsanın net riskini düşük tutmak.
        </div>
      </div>
    </div>
  );
}
