export default function Roadmap() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg text-text">
      <div className="absolute top-[-15vh] left-[-8vw] w-[40vw] h-[40vw] rounded-full bg-accent/5 blur-[120px]" />

      <div className="relative h-full w-full flex flex-col px-[8vw] py-[7vh]">
        <div className="flex items-center justify-between mb-[1vh]">
          <span className="font-display font-bold text-primary text-[1.2vw] tracking-tight">BASONCE EXCHANGE</span>
          <span className="text-muted text-[1.1vw] font-body">18 / 19</span>
        </div>
        <div className="w-full h-px bg-white/10 mb-[5vh]" />

        <h2 className="font-display font-bold text-[3.8vw] leading-tight tracking-tight mb-[6vh]">
          Yol haritası
        </h2>

        <div className="grid grid-cols-4 gap-[1.8vw]">
          <div>
            <div className="text-accent font-display font-bold text-[1.3vw] mb-[1.5vh]">Faz 1 · Bugün</div>
            <div className="w-full h-px bg-accent/40 mb-[2vh]" />
            <div className="text-text text-[1.5vw] font-display font-semibold leading-tight mb-[1.5vh]">Canlı platform</div>
            <div className="text-muted text-[1.1vw] leading-snug">Spot, vadeli, çoklu varlık, zincir ve explorer çalışıyor.</div>
          </div>
          <div>
            <div className="text-primary font-display font-bold text-[1.3vw] mb-[1.5vh]">Faz 2</div>
            <div className="w-full h-px bg-white/15 mb-[2vh]" />
            <div className="text-text text-[1.5vw] font-display font-semibold leading-tight mb-[1.5vh]">Uyum & kurumsal</div>
            <div className="text-muted text-[1.1vw] leading-snug">Lisanslama, kurumsal erişim ve denetim derinleştirme.</div>
          </div>
          <div>
            <div className="text-primary font-display font-bold text-[1.3vw] mb-[1.5vh]">Faz 3</div>
            <div className="w-full h-px bg-white/15 mb-[2vh]" />
            <div className="text-text text-[1.5vw] font-display font-semibold leading-tight mb-[1.5vh]">Modül genişlemesi</div>
            <div className="text-muted text-[1.1vw] leading-snug">Yeni varlık sınıfları ve eklenti pazarının büyümesi.</div>
          </div>
          <div>
            <div className="text-primary font-display font-bold text-[1.3vw] mb-[1.5vh]">Faz 4</div>
            <div className="w-full h-px bg-white/15 mb-[2vh]" />
            <div className="text-text text-[1.5vw] font-display font-semibold leading-tight mb-[1.5vh]">Küresel ölçek</div>
            <div className="text-muted text-[1.1vw] leading-snug">Bölgesel genişleme ve tek defterli finansal omurga.</div>
          </div>
        </div>

        <div className="mt-auto pt-[4vh] text-muted text-[1.05vw] font-body">
          İleriye dönük plan; sıralama ve zamanlama pazar koşullarına göre güncellenebilir.
        </div>
      </div>
    </div>
  );
}
