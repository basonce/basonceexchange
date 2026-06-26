export default function Closing() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text">
      <div className="absolute top-[-20vh] left-[-10vw] w-[55vw] h-[55vw] rounded-full bg-primary/10 blur-[120px]" />
      <div className="absolute bottom-[-25vh] right-[-12vw] w-[45vw] h-[45vw] rounded-full bg-accent/5 blur-[120px]" />

      <div className="relative h-full w-full flex flex-col justify-between px-[8vw] py-[8vh]">
        <div className="flex items-center gap-[1.2vw]">
          <div className="w-[2.2vw] h-[2.2vw] rounded-md bg-primary" />
          <span className="font-display font-bold text-[1.7vw] tracking-tight text-text">BASONCE EXCHANGE</span>
        </div>

        <div className="max-w-[80vw]">
          <h2 className="font-display font-bold text-[5.2vw] leading-[1.0] tracking-tight text-balance">
            Tek defter.
            <span className="text-primary"> Tüm finans.</span>
          </h2>
          <p className="mt-[4vh] text-muted text-[1.8vw] font-body max-w-[60vw] leading-snug text-pretty">
            Canlı bir borsa, kendi zinciri ve şeffaf defteriyle Basonce, parçalı
            küresel finansı tek modüler işletim sistemi altında birleştiriyor.
          </p>
        </div>

        <div className="flex items-end justify-between">
          <div className="text-text text-[1.6vw] font-display font-bold">basonce.com</div>
          <div className="text-right text-muted text-[1.2vw] font-body leading-tight">
            <div className="text-text font-semibold">Yatırım Görüşmesi</div>
            <div>Haziran 2026 · Gizli</div>
          </div>
        </div>
      </div>
    </div>
  );
}
