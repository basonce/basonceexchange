export default function Closing() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text">
      <div className="absolute top-[-20vh] left-[-10vw] w-[50vw] h-[50vw] rounded-full bg-primary/10 blur-[120px]" />
      <div className="absolute bottom-[-25vh] right-[-12vw] w-[45vw] h-[45vw] rounded-full bg-accent/5 blur-[120px]" />

      <div className="relative h-full w-full flex flex-col justify-between px-[8vw] py-[8vh]">
        <div className="flex items-center gap-[1.2vw]">
          <div className="w-[2.2vw] h-[2.2vw] rounded-md bg-primary" />
          <span className="font-display font-bold text-[1.7vw] tracking-tight text-text">
            KITE EXCHANGE
          </span>
        </div>

        <div className="max-w-[72vw]">
          <h2 className="font-display font-bold text-[5.5vw] leading-[1.0] tracking-tight text-balance">
            Telegram’ın borsasını
            <span className="text-primary"> birlikte kuralım.</span>
          </h2>
          <p className="mt-[4vh] text-muted text-[1.9vw] font-body max-w-[56vw] leading-snug text-pretty">
            Ürün canlı, gelir motorları çalışıyor. Sıradaki adım: ölçek.
            $5M ile 10 ayda geri dönüş hedefliyoruz.
          </p>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <div className="text-muted text-[1.2vw] mb-[1vh]">İletişim</div>
            <div className="text-text text-[1.8vw] font-display font-bold">basonce.com</div>
          </div>
          <div className="text-right text-muted text-[1.15vw] font-body leading-tight">
            <div className="text-text font-semibold">Kite Exchange</div>
            <div>Stratejik Yatırım Sunumu · Haziran 2026</div>
          </div>
        </div>
      </div>
    </div>
  );
}
