export default function Vision() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text">
      <div className="absolute top-[-15vh] right-[-8vw] w-[40vw] h-[40vw] rounded-full bg-primary/5 blur-[120px]" />

      <div className="relative h-full w-full flex flex-col px-[8vw] py-[7vh]">
        <div className="flex items-center justify-between mb-[1vh]">
          <span className="font-display font-bold text-primary text-[1.2vw] tracking-tight">BASONCE EXCHANGE</span>
          <span className="text-muted text-[1.1vw] font-body">02 / 16</span>
        </div>
        <div className="w-full h-px bg-white/10 mb-[5vh]" />

        <div className="text-primary font-body font-extrabold tracking-[0.3em] text-[1.1vw] uppercase mb-[2.5vh]">
          Vizyon
        </div>
        <h2 className="font-display font-bold text-[4.4vw] leading-[1.05] tracking-tight max-w-[80vw] text-balance mb-[6vh]">
          Bugün her varlık sınıfı kendi adasında işlem görüyor. Biz hepsini tek
          <span className="text-primary"> ledger tabanlı işletim sistemi</span> altında topluyoruz.
        </h2>

        <div className="grid grid-cols-3 gap-[2.2vw] mt-auto">
          <div className="bg-surface rounded-2xl px-[2vw] py-[3.5vh] border border-white/5">
            <div className="text-muted text-[1vw] font-body uppercase tracking-wider mb-[1.5vh]">Sorun</div>
            <div className="text-text text-[1.55vw] font-display font-bold leading-tight">Parçalı altyapı</div>
            <div className="text-muted text-[1.15vw] leading-snug mt-[1.5vh]">Kripto, hisse, emtia ve türevler ayrı sistemlerde; likidite ve kayıt dağınık.</div>
          </div>
          <div className="bg-surface rounded-2xl px-[2vw] py-[3.5vh] border border-white/5">
            <div className="text-muted text-[1vw] font-body uppercase tracking-wider mb-[1.5vh]">Yaklaşım</div>
            <div className="text-text text-[1.55vw] font-display font-bold leading-tight">Modüler OS</div>
            <div className="text-muted text-[1.15vw] leading-snug mt-[1.5vh]">Her varlık sınıfı bir eklenti; tümü ortak defter, cüzdan ve risk motoruna bağlanır.</div>
          </div>
          <div className="bg-surface rounded-2xl px-[2vw] py-[3.5vh] border border-white/5">
            <div className="text-muted text-[1vw] font-body uppercase tracking-wider mb-[1.5vh]">Sonuç</div>
            <div className="text-text text-[1.55vw] font-display font-bold leading-tight">Tek defter</div>
            <div className="text-muted text-[1.15vw] leading-snug mt-[1.5vh]">Şeffaf, denetlenebilir ve ölçeklenebilir bir finansal omurga.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
