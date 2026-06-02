export default function RevenueToken() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text">
      <div className="absolute bottom-[-20vh] right-[-8vw] w-[42vw] h-[42vw] rounded-full bg-primary/8 blur-[120px]" />

      <div className="relative h-full w-full flex flex-col px-[8vw] py-[7vh]">
        <div className="flex items-center justify-between mb-[1vh]">
          <span className="font-display font-bold text-primary text-[1.2vw] tracking-tight">
            KITE EXCHANGE
          </span>
          <span className="text-muted text-[1.1vw] font-body">06 / 13</span>
        </div>
        <div className="w-full h-px bg-white/10 mb-[4vh]" />

        <div className="text-primary font-body font-extrabold tracking-[0.25em] text-[1.1vw] uppercase mb-[1.5vh]">
          Gelir Motoru 05
        </div>
        <h2 className="font-display font-bold text-[3.6vw] leading-tight tracking-tight mb-[1.5vh]">
          Mining, BNC token ve TON kutuları
        </h2>
        <p className="text-muted text-[1.55vw] font-body max-w-[64vw] leading-snug mb-[5vh] text-pretty">
          Ücretsiz madencilik kullanıcıyı içeri çeker; hız yükseltmesi için
          satılan TON kutuları doğrudan gelire dönüşür.
        </p>

        <div className="grid grid-cols-3 gap-[2.2vw]">
          <div className="bg-surface rounded-2xl px-[2vw] py-[4vh] border border-white/5">
            <div className="text-text text-[1.6vw] font-display font-bold mb-[2vh]">Büyüme kancası</div>
            <div className="text-muted text-[1.3vw] leading-snug">
              BNC madenciliği bedava başlar. Kullanıcı her gün geri gelir, davet eder, hacim büyür.
            </div>
          </div>
          <div className="bg-surface rounded-2xl px-[2vw] py-[4vh] border border-white/5">
            <div className="text-text text-[1.6vw] font-display font-bold mb-[2vh]">TON kutu satışı</div>
            <div className="text-muted text-[1.3vw] leading-snug">
              1’den 200 TON’a kadar hız paketleri. Ödeme TON Connect ile doğrudan operatör cüzdanına.
            </div>
          </div>
          <div className="rounded-2xl px-[2vw] py-[4vh] border border-primary/40 bg-primary/10">
            <div className="text-primary text-[1.5vw] font-semibold mb-[2vh]">Yıllık katkı</div>
            <div className="font-display font-bold text-primary text-[3.6vw] leading-none">$1,8M</div>
            <div className="text-muted text-[1.2vw] mt-[2vh]">~$5.000 / gün kutu satışı</div>
          </div>
        </div>

        <div className="mt-auto pt-[3.5vh] text-muted text-[1.05vw] font-body">
          Token modeli aynı zamanda en güçlü kullanıcı kazanım kanalımız — pazarlama maliyetini düşürür.
        </div>
      </div>
    </div>
  );
}
