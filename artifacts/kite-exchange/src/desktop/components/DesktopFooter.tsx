const COLUMNS: { title: string; links: string[] }[] = [
  { title: 'About Us', links: ['About', 'Careers', 'Announcements', 'News', 'Press', 'Community'] },
  { title: 'Products', links: ['Spot', 'Futures', 'Mining', 'AI Trading Bot', 'Sports', 'Buy Crypto'] },
  { title: 'Service', links: ['Affiliate', 'Referral', 'API', 'Fees', 'Trading Rules', 'Status'] },
  { title: 'Support', links: ['Help Center', '24/7 Chat Support', 'Submit a Request', 'Law Enforcement', 'Notices'] },
  { title: 'Learn', links: ['Buy Bitcoin', 'Buy Ethereum', 'Crypto Glossary', 'Trading Guide', 'Markets Overview'] },
];

export default function DesktopFooter() {
  return (
    <footer className="bg-[#181A20] border-t border-[#2B3139] mt-12">
      <div className="max-w-[1600px] mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img src="/basonce_logo_son_biten.png" alt="Basonce" className="h-7 w-auto" />
              <span className="text-[#EAECEF] font-bold text-lg">BASONCE</span>
            </div>
            <p className="text-[#848E9C] text-sm leading-relaxed">
              The world-class digital asset exchange. Trade Bitcoin, Ethereum and 350+ cryptocurrencies with confidence.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-[#EAECEF] font-semibold text-sm mb-4">{col.title}</h4>
              <ul className="space-y-3">
                {col.links.map((l) => (
                  <li key={l}>
                    <span className="text-[#848E9C] hover:text-[#F0B90B] text-sm cursor-pointer transition-colors">{l}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-[#2B3139] mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[#5E6673] text-xs">Basonce © {new Date().getFullYear()}. All rights reserved.</p>
          <div className="flex items-center gap-5 text-[#848E9C] text-xs">
            <span className="hover:text-[#EAECEF] cursor-pointer">Terms</span>
            <span className="hover:text-[#EAECEF] cursor-pointer">Privacy</span>
            <span className="hover:text-[#EAECEF] cursor-pointer">Cookies</span>
            <span className="hover:text-[#EAECEF] cursor-pointer">Risk Warning</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
