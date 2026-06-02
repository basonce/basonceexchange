export default function CostsLicenses() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text">
      <div className="relative h-full w-full flex flex-col px-[8vw] py-[7vh]">
        <div className="flex items-center justify-between mb-[1vh]">
          <span className="font-display font-bold text-primary text-[1.2vw] tracking-tight">
            KITE EXCHANGE
          </span>
          <span className="text-muted text-[1.1vw] font-body">09 / 12</span>
        </div>
        <div className="w-full h-px bg-white/10 mb-[4vh]" />

        <h2 className="font-display font-bold text-[4vw] leading-tight tracking-tight mb-[1vh]">
          Giderler ve lisanslar
        </h2>
        <p className="text-muted text-[1.5vw] font-body max-w-[60vw] leading-snug mb-[4vh]">
          Şeffaf maliyet yapısı. Yıllık işletme gideri yaklaşık $5,3M.
        </p>

        <div className="flex gap-[3vw]">
          <div className="w-1/2 flex flex-col gap-[1.8vh]">
            <div className="flex items-center justify-between border-b border-white/8 pb-[1.4vh]">
              <span className="text-text text-[1.55vw]">Pazarlama & büyüme</span>
              <span className="text-text text-[1.7vw] font-display font-bold">$2,0M</span>
            </div>
            <div className="flex items-center justify-between border-b border-white/8 pb-[1.4vh]">
              <span className="text-text text-[1.55vw]">Ekip & geliştirme</span>
              <span className="text-text text-[1.7vw] font-display font-bold">$1,2M</span>
            </div>
            <div className="flex items-center justify-between border-b border-white/8 pb-[1.4vh]">
              <span className="text-text text-[1.55vw]">Altyapı & likidite</span>
              <span className="text-text text-[1.7vw] font-display font-bold">$0,9M</span>
            </div>
            <div className="flex items-center justify-between border-b border-white/8 pb-[1.4vh]">
              <span className="text-text text-[1.55vw]">Lisans & hukuk</span>
              <span className="text-text text-[1.7vw] font-display font-bold">$0,8M</span>
            </div>
            <div className="flex items-center justify-between border-b border-white/8 pb-[1.4vh]">
              <span className="text-text text-[1.55vw]">Güvenlik & denetim</span>
              <span className="text-text text-[1.7vw] font-display font-bold">$0,4M</span>
            </div>
            <div className="flex items-center justify-between pt-[1vh]">
              <span className="text-primary text-[1.7vw] font-display font-bold">Toplam OpEx</span>
              <span className="text-primary text-[2.2vw] font-display font-bold">$5,3M</span>
            </div>
          </div>

          <div className="w-1/2 bg-surface rounded-2xl px-[2.5vw] py-[3.5vh] border border-white/5">
            <div className="text-text text-[1.7vw] font-display font-bold mb-[2.5vh]">Lisans yol haritası</div>
            <div className="flex items-start gap-[1.2vw] mb-[2.2vh]">
              <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-primary mt-[1vh]" />
              <span className="text-muted text-[1.4vw] leading-snug">VASP / kripto varlık hizmet sağlayıcı kaydı</span>
            </div>
            <div className="flex items-start gap-[1.2vw] mb-[2.2vh]">
              <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-primary mt-[1vh]" />
              <span className="text-muted text-[1.4vw] leading-snug">AML / KYC ve MASAK uyum altyapısı</span>
            </div>
            <div className="flex items-start gap-[1.2vw] mb-[2.2vh]">
              <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-primary mt-[1vh]" />
              <span className="text-muted text-[1.4vw] leading-snug">Yurtdışı opsiyonlar: Dubai VARA, Estonya</span>
            </div>
            <div className="mt-[2vh] rounded-xl bg-primary/10 border border-primary/30 px-[1.5vw] py-[2vh]">
              <span className="text-primary text-[1.25vw] font-semibold leading-snug">
                Lisanslar süreç içinde; yatırımın bir kısmı doğrudan bu sürece ayrılır.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
