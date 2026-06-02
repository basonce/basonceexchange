export default function Projection() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text">
      <div className="relative h-full w-full flex flex-col px-[8vw] py-[7vh]">
        <div className="flex items-center justify-between mb-[1vh]">
          <span className="font-display font-bold text-primary text-[1.2vw] tracking-tight">
            KITE EXCHANGE
          </span>
          <span className="text-muted text-[1.1vw] font-body">08 / 13</span>
        </div>
        <div className="w-full h-px bg-white/10 mb-[4vh]" />

        <div className="flex items-end justify-between mb-[4vh]">
          <div>
            <h2 className="font-display font-bold text-[4vw] leading-tight tracking-tight">
              Yıllık projeksiyon
            </h2>
            <p className="text-muted text-[1.5vw] font-body">12 ayda kademeli büyüme, ardından tam kapasite.</p>
          </div>
          <div className="text-right">
            <div className="text-muted text-[1.2vw]">Tam kapasite net kâr</div>
            <div className="font-display font-bold text-accent text-[3.6vw] leading-none">$15,0M</div>
          </div>
        </div>

        <div className="flex items-end gap-[3vw] h-[40vh] px-[1vw]">
          <div className="flex-1 flex flex-col items-center justify-end h-full">
            <span className="text-text text-[1.5vw] font-display font-bold mb-[1.5vh]">$5,5M</span>
            <div className="w-full rounded-t-xl bg-white/15" style={{ height: "27%" }} />
            <span className="text-muted text-[1.3vw] mt-[2vh] text-center">1. çeyrek başlangıç</span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-end h-full">
            <span className="text-text text-[1.5vw] font-display font-bold mb-[1.5vh]">$11,0M</span>
            <div className="w-full rounded-t-xl bg-white/30" style={{ height: "54%" }} />
            <span className="text-muted text-[1.3vw] mt-[2vh] text-center">2. çeyrek ölçeklenme</span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-end h-full">
            <span className="text-text text-[1.5vw] font-display font-bold mb-[1.5vh]">$16,0M</span>
            <div className="w-full rounded-t-xl bg-primary/60" style={{ height: "78%" }} />
            <span className="text-muted text-[1.3vw] mt-[2vh] text-center">3. çeyrek olgunlaşma</span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-end h-full">
            <span className="text-primary text-[1.7vw] font-display font-bold mb-[1.5vh]">$20,5M</span>
            <div className="w-full rounded-t-xl bg-primary" style={{ height: "100%" }} />
            <span className="text-muted text-[1.3vw] mt-[2vh] text-center">4. çeyrek tam kapasite</span>
          </div>
        </div>

        <div className="mt-auto pt-[3vh] flex items-center justify-between text-muted text-[1.05vw] font-body">
          <span>Yıllık brüt gelir koşusu (annualized run-rate), çeyrek bazında.</span>
          <span>Tahmini değerler — pazar koşullarına bağlıdır.</span>
        </div>
      </div>
    </div>
  );
}
