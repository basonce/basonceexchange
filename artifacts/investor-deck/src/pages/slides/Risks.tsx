export default function Risks() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text">
      <div className="relative h-full w-full flex flex-col px-[8vw] py-[7vh]">
        <div className="flex items-center justify-between mb-[1vh]">
          <span className="font-display font-bold text-primary text-[1.2vw] tracking-tight">
            KITE EXCHANGE
          </span>
          <span className="text-muted text-[1.1vw] font-body">10 / 12</span>
        </div>
        <div className="w-full h-px bg-white/10 mb-[4vh]" />

        <h2 className="font-display font-bold text-[4vw] leading-tight tracking-tight mb-[1vh]">
          Riskler ve eksikler
        </h2>
        <p className="text-muted text-[1.5vw] font-body max-w-[62vw] leading-snug mb-[4.5vh]">
          Dürüst tablo. Her riskin yanında somut planımız var.
        </p>

        <div className="grid grid-cols-2 gap-[2vw]">
          <div className="bg-surface rounded-2xl px-[2vw] py-[3vh] border border-white/5">
            <div className="text-text text-[1.6vw] font-display font-bold mb-[1.2vh]">Lisans süreci</div>
            <div className="text-muted text-[1.25vw] leading-snug">
              <span className="text-accent font-semibold">Plan: </span>
              Yatırımdan $1,0M doğrudan lisans ve hukuka; çoklu yargı bölgesi stratejisi.
            </div>
          </div>
          <div className="bg-surface rounded-2xl px-[2vw] py-[3vh] border border-white/5">
            <div className="text-text text-[1.6vw] font-display font-bold mb-[1.2vh]">Likidite derinliği</div>
            <div className="text-muted text-[1.25vw] leading-snug">
              <span className="text-accent font-semibold">Plan: </span>
              $1,5M market making bütçesi ve P2P agregasyonu ile derinlik.
            </div>
          </div>
          <div className="bg-surface rounded-2xl px-[2vw] py-[3vh] border border-white/5">
            <div className="text-text text-[1.6vw] font-display font-bold mb-[1.2vh]">Marka bilinirliği</div>
            <div className="text-muted text-[1.25vw] leading-snug">
              <span className="text-accent font-semibold">Plan: </span>
              Telegram viral davet motoru + $1,5M pazarlama ile hızlı kullanıcı tabanı.
            </div>
          </div>
          <div className="bg-surface rounded-2xl px-[2vw] py-[3vh] border border-white/5">
            <div className="text-text text-[1.6vw] font-display font-bold mb-[1.2vh]">Rekabet & güvenlik</div>
            <div className="text-muted text-[1.25vw] leading-snug">
              <span className="text-accent font-semibold">Plan: </span>
              Niş Telegram dağıtımı + bağımsız güvenlik denetimi ($0,4M).
            </div>
          </div>
        </div>

        <div className="mt-auto pt-[3.5vh] text-muted text-[1.05vw] font-body">
          Bu sayfadaki rakamlar ve tarihler hedeftir, garanti değildir.
        </div>
      </div>
    </div>
  );
}
