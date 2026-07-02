export default function DetailRisk() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text">
      <div className="absolute bottom-[-15vh] right-[-8vw] w-[40vw] h-[40vw] rounded-full bg-primary/5 blur-[120px]" />

      <div className="relative h-full w-full flex flex-col px-[7vw] py-[6vh]">
        <div className="flex items-center justify-between mb-[1vh]">
          <span className="font-display font-bold text-primary text-[1.35vw] tracking-tight">BASONCE EXCHANGE · DENETİM ALTYAPISI</span>
          <span className="text-white/80 text-[1.35vw] font-body">02 / 04</span>
        </div>
        <div className="w-full h-px bg-white/10 mb-[2vh]" />

        <h2 className="font-display font-bold text-[3.4vw] leading-tight tracking-tight mb-[1.2vh]">
          Risk motoru — hiçbir işlem kuralları atlayamaz
        </h2>
        <p className="text-white/95 text-[1.75vw] font-body max-w-[82vw] leading-snug mb-[2.2vh] text-pretty">
          Her çekim talebi, para hareket etmeden önce otomatik bir kural zincirinden
          geçer. Kurala takılan işlem anında durdurulur ve yönetici incelemesine
          düşer; kullanıcının parası güvence altında bekler.
        </p>

        <div className="grid grid-cols-2 gap-[1.4vw]">
          <div className="bg-surface rounded-2xl px-[1.8vw] py-[1.9vh] border border-white/5">
            <div className="font-display font-bold text-accent text-[1.9vw] mb-[0.8vh]">Günlük & haftalık limitler</div>
            <div className="text-white/90 text-[1.5vw] leading-snug">Kullanıcı başına günlük ve haftalık çekim limitleri tanımlıdır. Belirlenen eşiğin üzerindeki her işlem otomatik bekletmeye alınır. Limitler yönetim panelinden anında güncellenebilir — kod değişikliği gerekmez.</div>
          </div>
          <div className="bg-surface rounded-2xl px-[1.8vw] py-[1.9vh] border border-white/5">
            <div className="font-display font-bold text-accent text-[1.9vw] mb-[0.8vh]">Ani davranış değişikliği</div>
            <div className="text-white/90 text-[1.5vw] leading-snug">Hep küçük tutarlar çeken bir hesap aniden büyük çekim denerse veya kısa sürede art arda çok sayıda çekim yapılırsa, sistem bunu tespit eder ve işlemi incelemeye alır. Hesap ele geçirme saldırılarına karşı ilk savunma hattı budur.</div>
          </div>
          <div className="bg-surface rounded-2xl px-[1.8vw] py-[1.9vh] border border-white/5">
            <div className="font-display font-bold text-accent text-[1.9vw] mb-[0.8vh]">Yeni hesap koruması</div>
            <div className="text-white/90 text-[1.5vw] leading-snug">Yeni açılmış hesapların çekim talepleri ek kontrole tabidir. Çalıntı kimlikle hesap açıp parayı hızla kaçırma senaryosu bu kuralla engellenir — dolandırıcılığın en yaygın yöntemlerinden biridir.</div>
          </div>
          <div className="bg-surface rounded-2xl px-[1.8vw] py-[1.9vh] border border-white/5">
            <div className="font-display font-bold text-accent text-[1.9vw] mb-[0.8vh]">Kara liste kontrolü</div>
            <div className="text-white/90 text-[1.5vw] leading-snug">Riskli veya şüpheli olarak işaretlenen cüzdan adreslerine çekim otomatik engellenir. Liste yönetim panelinden anlık güncellenir; eklenen adres o saniyeden itibaren tüm kullanıcılar için geçerlidir.</div>
          </div>
        </div>

        <div className="mt-auto pt-[1.4vh] flex items-center gap-[1.2vw]">
          <div className="w-[0.35vw] h-[4vh] bg-accent rounded-full" />
          <div className="text-white/95 text-[1.5vw] font-body leading-snug">Motorun verdiği her karar — onay, bekletme veya red — gerekçesi ve zaman damgasıyla kalıcı olarak kaydedilir. "Şüpheli işlemleri nasıl yakalıyorsunuz?" sorusunun kanıtlı cevabı budur.</div>
        </div>
      </div>
    </div>
  );
}
