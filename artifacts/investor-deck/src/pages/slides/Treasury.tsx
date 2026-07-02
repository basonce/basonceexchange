export default function Treasury() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text">
      <div className="absolute top-[-15vh] left-[-8vw] w-[40vw] h-[40vw] rounded-full bg-accent/5 blur-[120px]" />

      <div className="relative h-full w-full flex flex-col px-[8vw] py-[7vh]">
        <div className="flex items-center justify-between mb-[1vh]">
          <span className="font-display font-bold text-primary text-[1.2vw] tracking-tight">BASONCE EXCHANGE</span>
          <span className="text-muted text-[1.1vw] font-body">15 / 19</span>
        </div>
        <div className="w-full h-px bg-white/10 mb-[4vh]" />

        <h2 className="font-display font-bold text-[3.8vw] leading-tight tracking-tight mb-[1.5vh]">
          Hazine & onaylı çekim
        </h2>
        <p className="text-white/95 text-[1.8vw] font-body max-w-[66vw] leading-snug mb-[5vh] text-pretty">
          Para otomatik gönderilmez: risk kontrolü → onay kuyruğu → yetkili onayı.
          Büyük tutarlarda tek kişi asla yeterli değildir.
        </p>

        <div className="grid grid-cols-3 gap-[2vw]">
          <div className="bg-surface rounded-2xl px-[1.9vw] py-[3.4vh] border border-white/5">
            <div className="font-display font-bold text-accent text-[1.6vw] mb-[1.2vh]">01 · Kuyruk</div>
            <div className="text-text text-[1.6vw] font-display font-bold leading-tight">Onay bekler</div>
            <div className="text-white/90 text-[1.4vw] leading-snug mt-[1.4vh]">Riskten geçen çekim kuyruğa düşer; yetkili onaylamadan tek kuruş çıkmaz.</div>
          </div>
          <div className="bg-surface rounded-2xl px-[1.9vw] py-[3.4vh] border border-white/5">
            <div className="font-display font-bold text-accent text-[1.6vw] mb-[1.2vh]">02 · Çift onay</div>
            <div className="text-text text-[1.6vw] font-display font-bold leading-tight">İki ayrı yetkili</div>
            <div className="text-white/90 text-[1.4vw] leading-snug mt-[1.4vh]">Büyük tutarlar iki farklı kişinin onayını gerektirir; aynı kişi ikinci onayı veremez.</div>
          </div>
          <div className="bg-surface rounded-2xl px-[1.9vw] py-[3.4vh] border border-white/5">
            <div className="font-display font-bold text-accent text-[1.6vw] mb-[1.2vh]">03 · Saklama</div>
            <div className="text-text text-[1.6vw] font-display font-bold leading-tight">Sıcak / soğuk</div>
            <div className="text-white/90 text-[1.4vw] leading-snug mt-[1.4vh]">Fonların büyük kısmı internete kapalı soğuk cüzdanda; günlük işlem için küçük kısım sıcakta.</div>
          </div>
        </div>

        <div className="mt-auto pt-[3vh] text-white/90 text-[1.3vw] font-body">
          Reddedilen çekim, iadesiyle birlikte deftere otomatik ve geri alınamaz şekilde işlenir.
        </div>
      </div>
    </div>
  );
}
