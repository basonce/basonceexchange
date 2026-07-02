export default function SecurityRisk() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text">
      <div className="absolute bottom-[-15vh] right-[-8vw] w-[40vw] h-[40vw] rounded-full bg-primary/5 blur-[120px]" />

      <div className="relative h-full w-full flex flex-col px-[8vw] py-[7vh]">
        <div className="flex items-center justify-between mb-[1vh]">
          <span className="font-display font-bold text-primary text-[1.2vw] tracking-tight">BASONCE EXCHANGE</span>
          <span className="text-muted text-[1.1vw] font-body">14 / 19</span>
        </div>
        <div className="w-full h-px bg-white/10 mb-[4vh]" />

        <h2 className="font-display font-bold text-[3.8vw] leading-tight tracking-tight mb-[1.5vh]">
          Risk motoru — her işlem kural zincirinden geçer
        </h2>
        <p className="text-white/95 text-[1.8vw] font-body max-w-[66vw] leading-snug mb-[5vh] text-pretty">
          Hiçbir çekim doğrudan gerçekleşmez; önce otomatik kurallardan geçer.
          Kurala takılan işlem durur ve yönetici incelemesine düşer.
        </p>

        <div className="grid grid-cols-4 gap-[1.6vw]">
          <div className="bg-surface rounded-2xl px-[1.6vw] py-[3.2vh] border border-white/5">
            <div className="font-display font-bold text-accent text-[1.6vw] mb-[1.2vh]">01 · Limit</div>
            <div className="text-text text-[1.5vw] font-display font-semibold leading-tight">Günlük & haftalık</div>
            <div className="text-white/90 text-[1.25vw] leading-snug mt-[1vh]">Kullanıcı başına tutar limitleri; aşan işlem otomatik bekletilir.</div>
          </div>
          <div className="bg-surface rounded-2xl px-[1.6vw] py-[3.2vh] border border-white/5">
            <div className="font-display font-bold text-accent text-[1.6vw] mb-[1.2vh]">02 · Davranış</div>
            <div className="text-text text-[1.5vw] font-display font-semibold leading-tight">Ani değişim</div>
            <div className="text-white/90 text-[1.25vw] leading-snug mt-[1vh]">Sık ardışık çekim veya alışılmadık tutar tespitinde işlem incelemeye alınır.</div>
          </div>
          <div className="bg-surface rounded-2xl px-[1.6vw] py-[3.2vh] border border-white/5">
            <div className="font-display font-bold text-accent text-[1.6vw] mb-[1.2vh]">03 · Yeni hesap</div>
            <div className="text-text text-[1.5vw] font-display font-semibold leading-tight">Bekleme süresi</div>
            <div className="text-white/90 text-[1.25vw] leading-snug mt-[1vh]">Yeni açılan hesapların çekimleri ek kontrole tabidir.</div>
          </div>
          <div className="bg-surface rounded-2xl px-[1.6vw] py-[3.2vh] border border-white/5">
            <div className="font-display font-bold text-accent text-[1.6vw] mb-[1.2vh]">04 · Kara liste</div>
            <div className="text-text text-[1.5vw] font-display font-semibold leading-tight">Adres kontrolü</div>
            <div className="text-white/90 text-[1.25vw] leading-snug mt-[1vh]">Riskli adreslere çekim otomatik engellenir; liste anlık güncellenir.</div>
          </div>
        </div>

        <div className="mt-auto pt-[3vh] text-white/90 text-[1.3vw] font-body">
          Her karar kayıt altına alınır — "şüpheli işlemi nasıl yakalıyorsunuz?" sorusunun kanıtlı cevabı.
        </div>
      </div>
    </div>
  );
}
