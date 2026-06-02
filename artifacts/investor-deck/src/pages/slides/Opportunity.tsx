export default function Opportunity() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text">
      <div className="absolute top-[-15vh] right-[-8vw] w-[40vw] h-[40vw] rounded-full bg-primary/5 blur-[120px]" />

      <div className="relative h-full w-full flex flex-col px-[8vw] py-[7vh]">
        <div className="flex items-center justify-between mb-[1vh]">
          <span className="font-display font-bold text-primary text-[1.2vw] tracking-tight">
            KITE EXCHANGE
          </span>
          <span className="text-muted text-[1.1vw] font-body">02 / 12</span>
        </div>
        <div className="w-full h-px bg-white/10 mb-[5vh]" />

        <h2 className="font-display font-bold text-[4.2vw] leading-tight tracking-tight mb-[1.5vh]">
          Fırsat
        </h2>
        <p className="text-muted text-[1.9vw] font-body max-w-[60vw] leading-snug mb-[6vh] text-pretty">
          Kullanıcılar artık uygulama indirmiyor. Borsayı doğrudan Telegram’ın
          içine taşıyan oyuncu, dağıtım savaşını kazanır.
        </p>

        <div className="grid grid-cols-3 gap-[2.5vw]">
          <div className="bg-surface rounded-2xl px-[2.2vw] py-[4vh] border border-white/5">
            <div className="font-display font-bold text-primary text-[4.2vw] leading-none">
              1 Mlr+
            </div>
            <div className="mt-[2vh] text-text text-[1.5vw] font-semibold">
              Telegram kullanıcısı
            </div>
            <div className="mt-[1vh] text-muted text-[1.25vw] leading-snug">
              Sıfır indirme — uygulama sohbetin içinde açılıyor.
            </div>
          </div>

          <div className="bg-surface rounded-2xl px-[2.2vw] py-[4vh] border border-white/5">
            <div className="font-display font-bold text-primary text-[4.2vw] leading-none">
              600 Mn+
            </div>
            <div className="mt-[2vh] text-text text-[1.5vw] font-semibold">
              Küresel kripto kullanıcısı
            </div>
            <div className="mt-[1vh] text-muted text-[1.25vw] leading-snug">
              Her yıl büyüyen, işlem yapmaya hazır kitle.
            </div>
          </div>

          <div className="bg-surface rounded-2xl px-[2.2vw] py-[4vh] border border-white/5">
            <div className="font-display font-bold text-primary text-[4.2vw] leading-none">
              7/24
            </div>
            <div className="mt-[2vh] text-text text-[1.5vw] font-semibold">
              Durmayan piyasa
            </div>
            <div className="mt-[1vh] text-muted text-[1.25vw] leading-snug">
              Komisyon her saniye, her işlemde tahsil ediliyor.
            </div>
          </div>
        </div>

        <div className="mt-auto pt-[4vh] text-muted text-[1.05vw] font-body">
          Kaynak: kamuya açık platform verileri (yaklaşık değerler).
        </div>
      </div>
    </div>
  );
}
