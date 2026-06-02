export default function Cover() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text">
      <div className="absolute top-[-20vh] right-[-10vw] w-[55vw] h-[55vw] rounded-full bg-primary/10 blur-[120px]" />
      <div className="absolute bottom-[-25vh] left-[-12vw] w-[45vw] h-[45vw] rounded-full bg-accent/5 blur-[120px]" />

      <div className="relative h-full w-full flex flex-col justify-between px-[8vw] py-[8vh]">
        <div className="flex items-center gap-[1.2vw]">
          <div className="w-[2.2vw] h-[2.2vw] rounded-md bg-primary" />
          <span className="font-display font-bold text-[1.7vw] tracking-tight text-text">
            KITE EXCHANGE
          </span>
          <span className="text-muted text-[1.2vw] font-body">· basonce.com</span>
        </div>

        <div className="max-w-[80vw]">
          <div className="text-primary font-body font-extrabold tracking-[0.3em] text-[1.3vw] uppercase mb-[3vh]">
            Yıllık Gelir-Gider Özeti
          </div>
          <h1 className="font-display font-bold text-[6vw] leading-[0.98] tracking-tight text-balance">
            Spot, vadeli ve P2P.
            <span className="text-primary"> Tek borsada.</span>
          </h1>
          <p className="mt-[4vh] text-muted text-[1.9vw] font-body max-w-[60vw] leading-snug text-pretty">
            Tahtalar, işlem komisyonları, P2P alım-satım, kopya ticaret ve token
            madenciliği — gelir getiren eksiksiz bir kripto borsası.
          </p>
        </div>

        <div className="flex items-end justify-between">
          <div className="flex items-baseline gap-[1.5vw]">
            <span className="text-muted text-[1.3vw] font-body">Yıllık net kâr</span>
            <span className="font-display font-bold text-primary text-[3.6vw] leading-none">
              $15,0M
            </span>
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
