export default function DetailLedger() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text">
      <div className="absolute top-[-15vh] right-[-8vw] w-[40vw] h-[40vw] rounded-full bg-accent/5 blur-[120px]" />

      <div className="relative h-full w-full flex flex-col px-[7vw] py-[6vh]">
        <div className="flex items-center justify-between mb-[1vh]">
          <span className="font-display font-bold text-primary text-[1.2vw] tracking-tight">BASONCE EXCHANGE · DENETİM ALTYAPISI</span>
          <span className="text-white/80 text-[1.2vw] font-body">01 / 04</span>
        </div>
        <div className="w-full h-px bg-white/10 mb-[3vh]" />

        <h2 className="font-display font-bold text-[3.4vw] leading-tight tracking-tight mb-[1.2vh]">
          Çift kayıtlı defter — banka standardı muhasebe, canlıda
        </h2>
        <p className="text-white/95 text-[1.5vw] font-body max-w-[80vw] leading-snug mb-[3.5vh] text-pretty">
          Platformdaki her para hareketi — yatırma, çekim, transfer — çift girişli
          muhasebe kuralıyla yazılır: para bir hesaptan çıkar, diğerine girer.
          Tek taraflı kayıt sistemde teknik olarak imkânsızdır.
        </p>

        <div className="grid grid-cols-2 gap-[1.4vw]">
          <div className="bg-surface rounded-2xl px-[1.8vw] py-[2.6vh] border border-white/5">
            <div className="font-display font-bold text-accent text-[1.5vw] mb-[0.8vh]">Toplam her an sıfır</div>
            <div className="text-white/90 text-[1.25vw] leading-snug">Sistemdeki tüm hesapların toplamı matematiksel olarak her an sıfır olmak zorundadır. Defter ile canlı bakiyeler sürekli otomatik karşılaştırılır; bir kuruşluk fark bile anında alarm üretir ve yönetim panelinde görünür.</div>
          </div>
          <div className="bg-surface rounded-2xl px-[1.8vw] py-[2.6vh] border border-white/5">
            <div className="font-display font-bold text-accent text-[1.5vw] mb-[0.8vh]">Kayıtlar değiştirilemez</div>
            <div className="text-white/90 text-[1.25vw] leading-snug">Geçmiş bir kayıt asla silinmez veya düzeltilmez — bu veritabanı seviyesinde engellidir. Hata olursa bankaların yaptığı gibi ters kayıtla düzeltilir; böylece hatanın kendisi de tarihçede görünür kalır.</div>
          </div>
          <div className="bg-surface rounded-2xl px-[1.8vw] py-[2.6vh] border border-white/5">
            <div className="font-display font-bold text-accent text-[1.5vw] mb-[0.8vh]">Her bakiyenin kanıtı</div>
            <div className="text-white/90 text-[1.25vw] leading-snug">"Bu kullanıcının bakiyesi neden bu?" sorusunun cevabı, ilk günden itibaren tüm hareketlerin toplamıdır. Denetçi herhangi bir bakiyeyi defterden adım adım yeniden hesaplayıp doğrulayabilir.</div>
          </div>
          <div className="bg-surface rounded-2xl px-[1.8vw] py-[2.6vh] border border-white/5">
            <div className="font-display font-bold text-accent text-[1.5vw] mb-[0.8vh]">Yönetimden canlı izleme</div>
            <div className="text-white/90 text-[1.25vw] leading-snug">Yönetim panelindeki Denetim ekranında defter kayıtları, mutabakat durumu ve hazine yükümlülükleri anlık izlenir. Mutabakat farkı hedefi: her an 0 — bugün canlıda bu değerle çalışıyor.</div>
          </div>
        </div>

        <div className="mt-auto pt-[2.5vh] flex items-center gap-[1.2vw]">
          <div className="w-[0.35vw] h-[4vh] bg-accent rounded-full" />
          <div className="text-white/95 text-[1.3vw] font-body leading-snug">Denetçinin aradığı standart tam olarak budur: her kuruşun nereden gelip nereye gittiğinin, silinmesi imkânsız kayıtlarla kanıtlanması.</div>
        </div>
      </div>
    </div>
  );
}
