export default function Ledger() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text">
      <div className="absolute top-[-15vh] right-[-8vw] w-[40vw] h-[40vw] rounded-full bg-accent/5 blur-[120px]" />

      <div className="relative h-full w-full flex flex-col px-[8vw] py-[7vh]">
        <div className="flex items-center justify-between mb-[1vh]">
          <span className="font-display font-bold text-primary text-[1.2vw] tracking-tight">BASONCE EXCHANGE</span>
          <span className="text-muted text-[1.1vw] font-body">12 / 19</span>
        </div>
        <div className="w-full h-px bg-white/10 mb-[4vh]" />

        <h2 className="font-display font-bold text-[3.8vw] leading-tight tracking-tight mb-[1.5vh]">
          Çift kayıtlı defter — canlıda çalışıyor
        </h2>
        <p className="text-white/95 text-[1.8vw] font-body max-w-[66vw] leading-snug mb-[5vh] text-pretty">
          Her para hareketi iki bacaklı yazılır; tüm hesapların toplamı her an
          sıfırdır. Bir kuruş bile açık verirse sistem alarm üretir.
        </p>

        <div className="grid grid-cols-4 gap-[1.6vw]">
          <div className="bg-surface rounded-2xl px-[1.6vw] py-[3.2vh] border border-white/5">
            <div className="font-display font-bold text-accent text-[1.6vw] mb-[1.2vh]">01 · Çift kayıt</div>
            <div className="text-text text-[1.5vw] font-display font-semibold leading-tight">İki bacak</div>
            <div className="text-white/90 text-[1.25vw] leading-snug mt-[1vh]">Para bir hesaptan çıkar, diğerine girer; tek bacaklı kayıt imkânsızdır.</div>
          </div>
          <div className="bg-surface rounded-2xl px-[1.6vw] py-[3.2vh] border border-white/5">
            <div className="font-display font-bold text-accent text-[1.6vw] mb-[1.2vh]">02 · Sıfır fark</div>
            <div className="text-text text-[1.5vw] font-display font-semibold leading-tight">Anlık mutabakat</div>
            <div className="text-white/90 text-[1.25vw] leading-snug mt-[1vh]">Defter ile canlı bakiyeler sürekli karşılaştırılır; hedef her an 0 fark.</div>
          </div>
          <div className="bg-surface rounded-2xl px-[1.6vw] py-[3.2vh] border border-white/5">
            <div className="font-display font-bold text-accent text-[1.6vw] mb-[1.2vh]">03 · Değişmez</div>
            <div className="text-text text-[1.5vw] font-display font-semibold leading-tight">Silme yok</div>
            <div className="text-white/90 text-[1.25vw] leading-snug mt-[1vh]">Geçmiş kayıt asla silinmez; hata varsa bankacılıktaki gibi ters kayıtla düzeltilir.</div>
          </div>
          <div className="bg-surface rounded-2xl px-[1.6vw] py-[3.2vh] border border-white/5">
            <div className="font-display font-bold text-accent text-[1.6vw] mb-[1.2vh]">04 · İzlenebilir</div>
            <div className="text-text text-[1.5vw] font-display font-semibold leading-tight">Tam geçmiş</div>
            <div className="text-white/90 text-[1.25vw] leading-snug mt-[1vh]">"Bu bakiye neden bu?" sorusu ilk günden itibaren kayıtlarla yanıtlanır.</div>
          </div>
        </div>

        <div className="mt-auto pt-[3vh] text-white/90 text-[1.3vw] font-body">
          Denetçinin aradığı standart: her kuruşun nereden gelip nereye gittiğinin kanıtı.
        </div>
      </div>
    </div>
  );
}
