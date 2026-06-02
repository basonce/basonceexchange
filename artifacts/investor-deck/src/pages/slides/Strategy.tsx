export default function Strategy() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text">
      <div className="absolute bottom-[-20vh] left-[-8vw] w-[42vw] h-[42vw] rounded-full bg-accent/5 blur-[120px]" />

      <div className="relative h-full w-full flex flex-col px-[8vw] py-[7vh]">
        <div className="flex items-center justify-between mb-[1vh]">
          <span className="font-display font-bold text-primary text-[1.2vw] tracking-tight">
            KITE EXCHANGE
          </span>
          <span className="text-muted text-[1.1vw] font-body">11 / 12</span>
        </div>
        <div className="w-full h-px bg-white/10 mb-[3.5vh]" />

        <h2 className="font-display font-bold text-[4vw] leading-tight tracking-tight mb-[1vh]">
          Büyüme stratejisi
        </h2>
        <p className="text-muted text-[1.5vw] font-body max-w-[62vw] leading-snug mb-[4vh] text-pretty">
          Altı kollu net bir plan: likidite, kullanıcı, gelir ve güven.
        </p>

        <div className="grid grid-cols-2 gap-x-[3vw] gap-y-[2.6vh]">
          <div className="flex items-start gap-[1.4vw]">
            <div className="font-display font-bold text-primary text-[1.9vw] leading-none w-[2.5vw]">01</div>
            <div>
              <div className="text-text text-[1.6vw] font-display font-bold">Likidite önce</div>
              <div className="text-muted text-[1.25vw] leading-snug">Market making ile derin order book, dar spread, gerçek hacim.</div>
            </div>
          </div>
          <div className="flex items-start gap-[1.4vw]">
            <div className="font-display font-bold text-primary text-[1.9vw] leading-none w-[2.5vw]">02</div>
            <div>
              <div className="text-text text-[1.6vw] font-display font-bold">Viral kullanıcı kazanımı</div>
              <div className="text-muted text-[1.25vw] leading-snug">Telegram + referral + mining kancası ile düşük CAC, hızlı büyüme.</div>
            </div>
          </div>
          <div className="flex items-start gap-[1.4vw]">
            <div className="font-display font-bold text-primary text-[1.9vw] leading-none w-[2.5vw]">03</div>
            <div>
              <div className="text-text text-[1.6vw] font-display font-bold">Tahta / listeleme motoru</div>
              <div className="text-muted text-[1.25vw] leading-snug">Sürekli yeni proje akışı ile sıfır maliyetli, istikrarlı gelir.</div>
            </div>
          </div>
          <div className="flex items-start gap-[1.4vw]">
            <div className="font-display font-bold text-primary text-[1.9vw] leading-none w-[2.5vw]">04</div>
            <div>
              <div className="text-text text-[1.6vw] font-display font-bold">Elde tutma</div>
              <div className="text-muted text-[1.25vw] leading-snug">Kopya ticaret ve token ödülleri ile kullanıcıyı platformda tut.</div>
            </div>
          </div>
          <div className="flex items-start gap-[1.4vw]">
            <div className="font-display font-bold text-primary text-[1.9vw] leading-none w-[2.5vw]">05</div>
            <div>
              <div className="text-text text-[1.6vw] font-display font-bold">Güven & uyum</div>
              <div className="text-muted text-[1.25vw] leading-snug">Lisanslarla kurumsal güven, güvenlik denetimiyle itibar.</div>
            </div>
          </div>
          <div className="flex items-start gap-[1.4vw]">
            <div className="font-display font-bold text-accent text-[1.9vw] leading-none w-[2.5vw]">06</div>
            <div>
              <div className="text-text text-[1.6vw] font-display font-bold">Bölgesel genişleme</div>
              <div className="text-muted text-[1.25vw] leading-snug">Türkiye çekirdek pazar, ardından MENA ve global açılım.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
