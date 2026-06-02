export default function UserEconomics() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text">
      <div className="absolute top-[-15vh] left-[-8vw] w-[40vw] h-[40vw] rounded-full bg-accent/5 blur-[120px]" />

      <div className="relative h-full w-full flex flex-col px-[8vw] py-[7vh]">
        <div className="flex items-center justify-between mb-[1vh]">
          <span className="font-display font-bold text-primary text-[1.2vw] tracking-tight">
            KITE EXCHANGE
          </span>
          <span className="text-muted text-[1.1vw] font-body">07 / 12</span>
        </div>
        <div className="w-full h-px bg-white/10 mb-[3.5vh]" />

        <h2 className="font-display font-bold text-[4vw] leading-tight tracking-tight mb-[1vh]">
          Kişi başı ekonomi & reklam
        </h2>
        <p className="text-muted text-[1.5vw] font-body max-w-[64vw] leading-snug mb-[4vh] text-pretty">
          Gelir kullanıcı sayısıyla büyür. Telegram viral döngüsü kazanım
          maliyetini düşük tutar — her dolar reklam çok kullanıcı getirir.
        </p>

        <div className="grid grid-cols-4 gap-[1.6vw] mb-[3.5vh]">
          <div className="bg-surface rounded-2xl px-[1.6vw] py-[3.5vh] border border-white/5">
            <div className="text-muted text-[1.15vw] font-semibold">Hedef aktif kullanıcı</div>
            <div className="font-display font-bold text-text text-[2.8vw] leading-none mt-[1.5vh]">150.000</div>
          </div>
          <div className="bg-surface rounded-2xl px-[1.6vw] py-[3.5vh] border border-white/5">
            <div className="text-muted text-[1.15vw] font-semibold">Kullanıcı başı yıllık gelir</div>
            <div className="font-display font-bold text-primary text-[2.8vw] leading-none mt-[1.5vh]">$137</div>
          </div>
          <div className="bg-surface rounded-2xl px-[1.6vw] py-[3.5vh] border border-white/5">
            <div className="text-muted text-[1.15vw] font-semibold">Kazanım maliyeti (CAC)</div>
            <div className="font-display font-bold text-text text-[2.8vw] leading-none mt-[1.5vh]">~$13</div>
          </div>
          <div className="rounded-2xl px-[1.6vw] py-[3.5vh] border border-accent/40 bg-accent/10">
            <div className="text-accent text-[1.15vw] font-semibold">Gelir / maliyet oranı</div>
            <div className="font-display font-bold text-accent text-[2.8vw] leading-none mt-[1.5vh]">~10×</div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl px-[2.5vw] py-[3.5vh] border border-white/5">
          <div className="text-text text-[1.6vw] font-display font-bold mb-[2vh]">Reklam mantığı</div>
          <div className="grid grid-cols-3 gap-[2.5vw]">
            <div>
              <div className="text-muted text-[1.25vw]">Yıllık reklam bütçesi</div>
              <div className="font-display font-bold text-text text-[2vw] mt-[0.5vh]">$2,0M</div>
            </div>
            <div>
              <div className="text-muted text-[1.25vw]">Kazanılan kullanıcı</div>
              <div className="font-display font-bold text-text text-[2vw] mt-[0.5vh]">~150.000</div>
            </div>
            <div>
              <div className="text-muted text-[1.25vw]">Ürettiği yıllık gelir</div>
              <div className="font-display font-bold text-primary text-[2vw] mt-[0.5vh]">~$20,5M</div>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-[2.5vh] text-muted text-[1.05vw] font-body">
          ARPU ve CAC hedef değerlerdir; viral kanal sayesinde harcanan reklam katlanarak geri döner.
        </div>
      </div>
    </div>
  );
}
