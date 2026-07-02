export default function DetailAudit() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text">
      <div className="absolute bottom-[-15vh] left-[-8vw] w-[40vw] h-[40vw] rounded-full bg-primary/5 blur-[120px]" />

      <div className="relative h-full w-full flex flex-col px-[7vw] py-[6vh]">
        <div className="flex items-center justify-between mb-[1vh]">
          <span className="font-display font-bold text-primary text-[1.2vw] tracking-tight">BASONCE EXCHANGE · DENETİM ALTYAPISI</span>
          <span className="text-white/80 text-[1.2vw] font-body">04 / 04</span>
        </div>
        <div className="w-full h-px bg-white/10 mb-[3vh]" />

        <h2 className="font-display font-bold text-[3.4vw] leading-tight tracking-tight mb-[1.2vh]">
          Kurumsal denetim altyapısı — bugün canlıda, lisansa hazır
        </h2>
        <p className="text-white/95 text-[1.5vw] font-body max-w-[80vw] leading-snug mb-[3.5vh] text-pretty">
          Basonce, küresel borsaların standardı olan denetim altyapısını ilk günden
          kurdu: her bakiye kanıtlanabilir, her karar kayıtlı, her çekim kontrollü.
          Denetçinin soracağı her sorunun kayıtlara dayanan net bir cevabı hazır.
        </p>

        <div className="grid grid-cols-3 gap-[1.4vw]">
          <div className="bg-surface rounded-2xl px-[1.6vw] py-[2.4vh] border border-white/5">
            <div className="text-accent text-[1.25vw] font-body mb-[0.8vh] italic">"Bu bakiye neden bu?"</div>
            <div className="text-text text-[1.5vw] font-display font-bold leading-tight mb-[0.8vh]">Defter kaydı</div>
            <div className="text-white/90 text-[1.2vw] leading-snug">Her bakiye, ilk günden itibaren çift kayıtlı defterden adım adım türetilir ve bağımsız olarak yeniden hesaplanabilir.</div>
          </div>
          <div className="bg-surface rounded-2xl px-[1.6vw] py-[2.4vh] border border-white/5">
            <div className="text-accent text-[1.25vw] font-body mb-[0.8vh] italic">"Şüpheliyi nasıl yakalarsınız?"</div>
            <div className="text-text text-[1.5vw] font-display font-bold leading-tight mb-[0.8vh]">Risk kayıtları</div>
            <div className="text-white/90 text-[1.2vw] leading-snug">Risk motorunun her kararı gerekçesi ve zaman damgasıyla kalıcı saklanır; şüpheli işlem raporu tek sorguyla üretilir.</div>
          </div>
          <div className="bg-surface rounded-2xl px-[1.6vw] py-[2.4vh] border border-white/5">
            <div className="text-accent text-[1.25vw] font-body mb-[0.8vh] italic">"Para tek kişiyle çıkar mı?"</div>
            <div className="text-text text-[1.5vw] font-display font-bold leading-tight mb-[0.8vh]">Çift onay</div>
            <div className="text-white/90 text-[1.2vw] leading-snug">Büyük tutarlar iki ayrı yetkili gerektirir; sistem aynı kişinin ikinci onayını reddeder. Tek kişinin eli kasaya yetmez.</div>
          </div>
        </div>

        <div className="mt-[2.5vh] bg-surface rounded-2xl px-[1.8vw] py-[2.4vh] border border-white/5">
          <div className="font-display font-bold text-accent text-[1.4vw] mb-[1vh]">Lisans yolunda sıradaki adımlar</div>
          <div className="grid grid-cols-4 gap-[1.2vw]">
            <div className="text-white/95 text-[1.15vw] leading-snug"><span className="text-text font-semibold">1 · Teknik altyapı ✓</span> — defter, risk motoru ve onaylı çekim bugün canlıda çalışıyor.</div>
            <div className="text-white/95 text-[1.15vw] leading-snug"><span className="text-text font-semibold">2 · KYC entegrasyonu</span> — Sumsub gibi hazır kimlik doğrulama servisi bağlanır.</div>
            <div className="text-white/95 text-[1.15vw] leading-snug"><span className="text-text font-semibold">3 · Şirket & lisans ülkesi</span> — kuruluş ve lisans ülkesinin seçimi hukuk ekibiyle yürütülür.</div>
            <div className="text-white/95 text-[1.15vw] leading-snug"><span className="text-text font-semibold">4 · Bağımsız denetim</span> — dış güvenlik firması tarafından denetim raporu alınır.</div>
          </div>
        </div>

        <div className="mt-auto pt-[2vh] flex items-center gap-[1.2vw]">
          <div className="w-[0.35vw] h-[4vh] bg-accent rounded-full" />
          <div className="text-white/95 text-[1.3vw] font-body leading-snug">Katmanlı güvenlik + her şeyin kayıtlı olması + tek bir açığın tüm fonu riske atamaması — küresel borsaların ve denetçilerin standardı.</div>
        </div>
      </div>
    </div>
  );
}
