export default function Cover() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text">
      <div className="absolute top-[-20vh] right-[-10vw] w-[55vw] h-[55vw] rounded-full bg-primary/10 blur-[120px]" />
      <div className="absolute bottom-[-25vh] left-[-12vw] w-[45vw] h-[45vw] rounded-full bg-accent/5 blur-[120px]" />

      <div className="relative h-full w-full flex flex-col justify-between px-[8vw] py-[8vh]">
        <div className="flex items-center gap-[1.2vw]">
          <div className="w-[2.2vw] h-[2.2vw] rounded-md bg-primary" />
          <span className="font-display font-bold text-[1.7vw] tracking-tight text-text">
            BASONCE EXCHANGE
          </span>
          <span className="text-muted text-[1.2vw] font-body">· basonce.com</span>
        </div>

        <div className="max-w-[82vw]">
          <div className="text-primary font-body font-extrabold tracking-[0.3em] text-[1.3vw] uppercase mb-[3vh]">
            Yatırımcı Sunumu · Gizli
          </div>
          <h1 className="font-display font-bold text-[6vw] leading-[0.98] tracking-tight text-balance">
            Parçalı küresel finansı
            <span className="text-primary"> tek deftere</span> bağlıyoruz.
          </h1>
          <p className="mt-[4vh] text-muted text-[1.9vw] font-body max-w-[62vw] leading-snug text-pretty">
            Basonce Exchange — kendi zinciri, kendi explorer'ı ve modüler
            ürünleriyle ledger tabanlı bir finansal işletim sistemi. Bugün canlı.
          </p>
        </div>

        <div className="flex items-end justify-between">
          <div className="flex items-stretch gap-[2.5vw]">
            <div>
              <div className="font-display font-bold text-primary text-[3.2vw] leading-none">103M+</div>
              <div className="text-muted text-[1.15vw] font-body mt-[1vh]">Kayıtlı kullanıcı</div>
            </div>
            <div className="w-px bg-white/10" />
            <div>
              <div className="font-display font-bold text-text text-[3.2vw] leading-none">350+</div>
              <div className="text-muted text-[1.15vw] font-body mt-[1vh]">Listelenen varlık</div>
            </div>
            <div className="w-px bg-white/10" />
            <div>
              <div className="font-display font-bold text-accent text-[3.2vw] leading-none">$25.58B</div>
              <div className="text-muted text-[1.15vw] font-body mt-[1vh]">Zincir TVL</div>
            </div>
          </div>
          <div className="text-right text-muted text-[1.2vw] font-body leading-tight">
            <div className="text-text font-semibold">Gizli Belge</div>
            <div>Haziran 2026</div>
          </div>
        </div>
      </div>
    </div>
  );
}
