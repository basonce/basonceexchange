export default function DetailTreasury() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text">
      <div className="absolute top-[-15vh] left-[-8vw] w-[40vw] h-[40vw] rounded-full bg-accent/5 blur-[120px]" />

      <div className="relative h-full w-full flex flex-col px-[7vw] py-[6vh]">
        <div className="flex items-center justify-between mb-[1vh]">
          <span className="font-display font-bold text-primary text-[1.2vw] tracking-tight">BASONCE EXCHANGE · DENETİM ALTYAPISI</span>
          <span className="text-white/80 text-[1.2vw] font-body">03 / 04</span>
        </div>
        <div className="w-full h-px bg-white/10 mb-[3vh]" />

        <h2 className="font-display font-bold text-[3.4vw] leading-tight tracking-tight mb-[1.2vh]">
          Hazine & onaylı çekim — para asla kendiliğinden çıkmaz
        </h2>
        <p className="text-white/95 text-[1.5vw] font-body max-w-[80vw] leading-snug mb-[3.5vh] text-pretty">
          Çekim akışı dört aşamalıdır: risk kontrolü → onay kuyruğu → yetkili onayı →
          gönderim. Hiçbir aşama atlanamaz; her adım kim, ne zaman, hangi kararı
          verdi bilgisiyle kayıt altındadır.
        </p>

        <div className="grid grid-cols-2 gap-[1.4vw]">
          <div className="bg-surface rounded-2xl px-[1.8vw] py-[2.6vh] border border-white/5">
            <div className="font-display font-bold text-accent text-[1.5vw] mb-[0.8vh]">Onay kuyruğu</div>
            <div className="text-white/90 text-[1.25vw] leading-snug">Risk kontrolünden geçen çekim otomatik gönderilmez — onay kuyruğuna düşer. Yetkili, talebi yönetim panelinden inceleyip onaylamadan tek kuruş çıkmaz. Onaylar mobil panelden, her yerden yapılabilir.</div>
          </div>
          <div className="bg-surface rounded-2xl px-[1.8vw] py-[2.6vh] border border-white/5">
            <div className="font-display font-bold text-accent text-[1.5vw] mb-[0.8vh]">Büyük tutarda çift onay</div>
            <div className="text-white/90 text-[1.25vw] leading-snug">Belirlenen eşiğin üzerindeki çekimler iki ayrı yetkilinin onayını gerektirir. Sistem, aynı kişinin ikinci onayı vermesini teknik olarak reddeder. Tek bir hesabın ele geçirilmesi ya da tek kişinin kötü niyeti, kasayı boşaltmaya yetmez.</div>
          </div>
          <div className="bg-surface rounded-2xl px-[1.8vw] py-[2.6vh] border border-white/5">
            <div className="font-display font-bold text-accent text-[1.5vw] mb-[0.8vh]">Red & otomatik iade</div>
            <div className="text-white/90 text-[1.25vw] leading-snug">Reddedilen çekimde para tek adımda, bölünemez bir işlemle kullanıcıya iade edilir ve iade deftere çift kayıtla işlenir. Yarım kalmış işlem, kaybolan bakiye veya "askıda para" durumu sistemsel olarak imkânsızdır.</div>
          </div>
          <div className="bg-surface rounded-2xl px-[1.8vw] py-[2.6vh] border border-white/5">
            <div className="font-display font-bold text-accent text-[1.5vw] mb-[0.8vh]">Sıcak / soğuk saklama</div>
            <div className="text-white/90 text-[1.25vw] leading-snug">Fonların büyük kısmı internete kapalı soğuk cüzdanda tutulur; günlük operasyon için yalnızca küçük bir kısım sıcak cüzdandadır. Dünyanın önde gelen borsalarının uyguladığı saklama standardı budur.</div>
          </div>
        </div>

        <div className="mt-auto pt-[2.5vh] flex items-center gap-[1.2vw]">
          <div className="w-[0.35vw] h-[4vh] bg-accent rounded-full" />
          <div className="text-white/95 text-[1.3vw] font-body leading-snug">Sonuç: müşteri varlıkları tek kişinin insafına değil, kademeli onay ve kayıt zincirine emanettir — denetçilerin "fon güvenliği" başlığında aradığı yapı.</div>
        </div>
      </div>
    </div>
  );
}
