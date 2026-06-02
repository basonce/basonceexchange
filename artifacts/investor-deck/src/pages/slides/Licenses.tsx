export default function Licenses() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text">
      <div className="absolute top-[-15vh] right-[-8vw] w-[40vw] h-[40vw] rounded-full bg-primary/5 blur-[120px]" />

      <div className="relative h-full w-full flex flex-col px-[8vw] py-[7vh]">
        <div className="flex items-center justify-between mb-[1vh]">
          <span className="font-display font-bold text-primary text-[1.2vw] tracking-tight">
            KITE EXCHANGE
          </span>
          <span className="text-muted text-[1.1vw] font-body">10 / 13</span>
        </div>
        <div className="w-full h-px bg-white/10 mb-[3.5vh]" />

        <h2 className="font-display font-bold text-[4vw] leading-tight tracking-tight mb-[1vh]">
          Lisanslar
        </h2>
        <p className="text-muted text-[1.5vw] font-body max-w-[62vw] leading-snug mb-[4.5vh] text-pretty">
          Net durum: lisanslar süreçte. Yatırımın bir kısmı doğrudan bu süreci
          tamamlamaya ayrılır.
        </p>

        <div className="grid grid-cols-3 gap-[2vw] mb-[4vh]">
          <div className="bg-surface rounded-2xl px-[2vw] py-[3.5vh] border border-white/5">
            <div className="text-text text-[1.7vw] font-display font-bold mb-[1.5vh]">Türkiye</div>
            <div className="text-muted text-[1.3vw] leading-snug">MASAK uyumu, AML / KYC altyapısı ve yerel kayıt.</div>
          </div>
          <div className="bg-surface rounded-2xl px-[2vw] py-[3.5vh] border border-white/5">
            <div className="text-text text-[1.7vw] font-display font-bold mb-[1.5vh]">VASP Kaydı</div>
            <div className="text-muted text-[1.3vw] leading-snug">Kripto varlık hizmet sağlayıcı lisansı ve denetim.</div>
          </div>
          <div className="bg-surface rounded-2xl px-[2vw] py-[3.5vh] border border-white/5">
            <div className="text-text text-[1.7vw] font-display font-bold mb-[1.5vh]">Yurtdışı Yapı</div>
            <div className="text-muted text-[1.3vw] leading-snug">Dubai (VARA) veya Estonya ile uluslararası operasyon.</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-[2vw]">
          <div className="rounded-2xl px-[2.5vw] py-[3vh] border border-primary/40 bg-primary/10 flex items-center justify-between">
            <span className="text-primary text-[1.6vw] font-display font-bold">Ayrılan bütçe</span>
            <span className="font-display font-bold text-primary text-[2.6vw] leading-none">$1,0M</span>
          </div>
          <div className="rounded-2xl px-[2.5vw] py-[3vh] border border-white/10 bg-surface flex items-center justify-between">
            <span className="text-text text-[1.6vw] font-display font-bold">Tahmini süre</span>
            <span className="font-display font-bold text-text text-[2.6vw] leading-none">6–12 ay</span>
          </div>
        </div>

        <div className="mt-auto pt-[3vh] text-muted text-[1.05vw] font-body">
          Çoklu yargı bölgesi stratejisi riski dağıtır; süreç tamamlanana kadar uyum öncelikli ilerler.
        </div>
      </div>
    </div>
  );
}
