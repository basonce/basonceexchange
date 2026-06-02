export default function Exchange() {
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
        <div className="w-full h-px bg-white/10 mb-[4vh]" />

        <h2 className="font-display font-bold text-[4vw] leading-tight tracking-tight mb-[1vh]">
          Borsa nedir
        </h2>
        <p className="text-muted text-[1.6vw] font-body max-w-[64vw] leading-snug mb-[4.5vh] text-pretty">
          basonce.com canlı, çalışan bir kripto borsası. Her modül ayrı bir gelir
          kapısı; Telegram ise düşük maliyetli kullanıcı kanalımız.
        </p>

        <div className="grid grid-cols-3 gap-[1.8vw]">
          <div className="bg-surface rounded-2xl px-[1.8vw] py-[3vh] border border-white/5">
            <div className="text-text text-[1.7vw] font-display font-bold">Tahtalar & Listeleme</div>
            <div className="text-muted text-[1.25vw] leading-snug mt-[1vh]">Yeni projeler tahtaya alınır, sabit listeleme ücreti tahsil edilir.</div>
          </div>
          <div className="bg-surface rounded-2xl px-[1.8vw] py-[3vh] border border-white/5">
            <div className="text-text text-[1.7vw] font-display font-bold">Spot İşlem</div>
            <div className="text-muted text-[1.25vw] leading-snug mt-[1vh]">Anlık alım-satım, her işlemde komisyon.</div>
          </div>
          <div className="bg-surface rounded-2xl px-[1.8vw] py-[3vh] border border-white/5">
            <div className="text-text text-[1.7vw] font-display font-bold">Vadeli İşlem</div>
            <div className="text-muted text-[1.25vw] leading-snug mt-[1vh]">Kaldıraçlı futures, yüksek hacim ve komisyon.</div>
          </div>
          <div className="bg-surface rounded-2xl px-[1.8vw] py-[3vh] border border-white/5">
            <div className="text-text text-[1.7vw] font-display font-bold">P2P Alım-Satım</div>
            <div className="text-muted text-[1.25vw] leading-snug mt-[1vh]">Alıcı-satıcı eşleşmesinden agregatör payı.</div>
          </div>
          <div className="bg-surface rounded-2xl px-[1.8vw] py-[3vh] border border-white/5">
            <div className="text-text text-[1.7vw] font-display font-bold">Kopya & Mining</div>
            <div className="text-muted text-[1.25vw] leading-snug mt-[1vh]">Kopya ticaret elde tutar, BNC madenciliği geri getirir.</div>
          </div>
          <div className="bg-surface rounded-2xl px-[1.8vw] py-[3vh] border border-white/5">
            <div className="text-text text-[1.7vw] font-display font-bold">Telegram Kanalı</div>
            <div className="text-muted text-[1.25vw] leading-snug mt-[1vh]">Viral davet ile neredeyse sıfır maliyetli kullanıcı.</div>
          </div>
        </div>

        <div className="mt-auto pt-[3vh] text-muted text-[1.05vw] font-body">
          Tüm modüller bugün canlı ve gelir üretmeye hazır.
        </div>
      </div>
    </div>
  );
}
