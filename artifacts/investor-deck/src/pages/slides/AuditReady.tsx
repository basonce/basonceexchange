export default function AuditReady() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text">
      <div className="absolute bottom-[-15vh] left-[-8vw] w-[40vw] h-[40vw] rounded-full bg-primary/5 blur-[120px]" />

      <div className="relative h-full w-full flex flex-col px-[8vw] py-[7vh]">
        <div className="flex items-center justify-between mb-[1vh]">
          <span className="font-display font-bold text-primary text-[1.2vw] tracking-tight">BASONCE EXCHANGE</span>
          <span className="text-muted text-[1.1vw] font-body">16 / 19</span>
        </div>
        <div className="w-full h-px bg-white/10 mb-[4vh]" />

        <h2 className="font-display font-bold text-[3.8vw] leading-tight tracking-tight mb-[1.5vh]">
          Denetime hazır mimari
        </h2>
        <p className="text-white/95 text-[1.8vw] font-body max-w-[66vw] leading-snug mb-[5vh] text-pretty">
          Denetçinin aradığı "hiç açık yok" değil, "riskler biliniyor ve yönetiliyor"
          kanıtıdır. Her sorunun kayıtlı bir cevabı vardır.
        </p>

        <div className="grid grid-cols-3 gap-[2vw]">
          <div className="bg-surface rounded-2xl px-[1.9vw] py-[3.4vh] border border-white/5">
            <div className="text-accent text-[1.2vw] font-body mb-[1.2vh] italic">"Bu bakiye neden bu?"</div>
            <div className="text-text text-[1.7vw] font-display font-bold leading-tight">Defter kaydı</div>
            <div className="text-white/90 text-[1.4vw] leading-snug mt-[1.2vh]">Her bakiye, ilk günden itibaren çift kayıtlı defterden adım adım türetilir.</div>
          </div>
          <div className="bg-surface rounded-2xl px-[1.9vw] py-[3.4vh] border border-white/5">
            <div className="text-accent text-[1.2vw] font-body mb-[1.2vh] italic">"Şüpheliyi nasıl yakalarsınız?"</div>
            <div className="text-text text-[1.7vw] font-display font-bold leading-tight">Risk kayıtları</div>
            <div className="text-white/90 text-[1.4vw] leading-snug mt-[1.2vh]">Risk motorunun her kararı gerekçesiyle birlikte kalıcı olarak saklanır.</div>
          </div>
          <div className="bg-surface rounded-2xl px-[1.9vw] py-[3.4vh] border border-white/5">
            <div className="text-accent text-[1.2vw] font-body mb-[1.2vh] italic">"Para tek kişiyle çıkar mı?"</div>
            <div className="text-text text-[1.7vw] font-display font-bold leading-tight">Çift onay</div>
            <div className="text-white/90 text-[1.4vw] leading-snug mt-[1.2vh]">Büyük tutarlar iki ayrı yetkili gerektirir; tek kişinin eli yetmez.</div>
          </div>
        </div>

        <div className="mt-auto pt-[3vh] flex items-center gap-[2.5vw] text-white/90 text-[1.3vw] font-body">
          <span className="text-white/90">Lisans yolu:</span>
          <span className="text-text">Teknik altyapı ✓ hazır</span>
          <span>KYC entegrasyonu (Sumsub vb.)</span>
          <span>Şirket kuruluşu & lisans ülkesi</span>
          <span>Bağımsız güvenlik denetimi</span>
        </div>
      </div>
    </div>
  );
}
