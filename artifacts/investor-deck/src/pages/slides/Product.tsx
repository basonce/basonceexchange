export default function Product() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text">
      <div className="relative h-full w-full flex flex-col px-[8vw] py-[7vh]">
        <div className="flex items-center justify-between mb-[1vh]">
          <span className="font-display font-bold text-primary text-[1.2vw] tracking-tight">
            KITE EXCHANGE
          </span>
          <span className="text-muted text-[1.1vw] font-body">03 / 12</span>
        </div>
        <div className="w-full h-px bg-white/10 mb-[5vh]" />

        <h2 className="font-display font-bold text-[4.2vw] leading-tight tracking-tight mb-[1.5vh]">
          Ürün nedir
        </h2>
        <p className="text-muted text-[1.9vw] font-body max-w-[62vw] leading-snug mb-[5vh] text-pretty">
          Tek çatı altında eksiksiz bir borsa. Hepsi canlı, hepsi basonce.com
          üzerinde çalışıyor.
        </p>

        <div className="grid grid-cols-2 gap-x-[3vw] gap-y-[3vh]">
          <div className="flex items-start gap-[1.5vw]">
            <div className="w-[0.6vw] h-[6vh] rounded-full bg-primary mt-[0.5vh]" />
            <div>
              <div className="text-text text-[1.8vw] font-display font-bold">P2P Agregatör</div>
              <div className="text-muted text-[1.3vw] leading-snug">Alıcı ve satıcıyı eşleştirir, her eşleşmeden pay alır.</div>
            </div>
          </div>
          <div className="flex items-start gap-[1.5vw]">
            <div className="w-[0.6vw] h-[6vh] rounded-full bg-primary mt-[0.5vh]" />
            <div>
              <div className="text-text text-[1.8vw] font-display font-bold">Spot & Vadeli İşlem</div>
              <div className="text-muted text-[1.3vw] leading-snug">Kaldıraçlı futures ile yüksek hacim, yüksek komisyon.</div>
            </div>
          </div>
          <div className="flex items-start gap-[1.5vw]">
            <div className="w-[0.6vw] h-[6vh] rounded-full bg-primary mt-[0.5vh]" />
            <div>
              <div className="text-text text-[1.8vw] font-display font-bold">Kopya Ticaret</div>
              <div className="text-muted text-[1.3vw] leading-snug">Kullanıcılar uzman yatırımcıları takip eder, sadık kalır.</div>
            </div>
          </div>
          <div className="flex items-start gap-[1.5vw]">
            <div className="w-[0.6vw] h-[6vh] rounded-full bg-primary mt-[0.5vh]" />
            <div>
              <div className="text-text text-[1.8vw] font-display font-bold">BNC Token Madenciliği</div>
              <div className="text-muted text-[1.3vw] leading-snug">Ücretsiz madencilik kancası — kullanıcıyı her gün geri getirir.</div>
            </div>
          </div>
          <div className="flex items-start gap-[1.5vw]">
            <div className="w-[0.6vw] h-[6vh] rounded-full bg-primary mt-[0.5vh]" />
            <div>
              <div className="text-text text-[1.8vw] font-display font-bold">TON Connect Ödeme</div>
              <div className="text-muted text-[1.3vw] leading-snug">Kutu satışları doğrudan operatör cüzdanına akar.</div>
            </div>
          </div>
          <div className="flex items-start gap-[1.5vw]">
            <div className="w-[0.6vw] h-[6vh] rounded-full bg-accent mt-[0.5vh]" />
            <div>
              <div className="text-text text-[1.8vw] font-display font-bold">Telegram Mini App</div>
              <div className="text-muted text-[1.3vw] leading-snug">Viral davet sistemi ile sıfır maliyetli kullanıcı kazanımı.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
