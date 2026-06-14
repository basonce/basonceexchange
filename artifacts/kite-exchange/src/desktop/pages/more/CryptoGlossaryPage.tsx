import { useState, useMemo } from 'react';
import { Search, BookText, ArrowRight, X, Layers, Hash } from 'lucide-react';
import type { MorePageProps } from './types';
import { openAuthRegister } from './types';

type Category = 'Basics' | 'Trading' | 'DeFi' | 'Security';

interface Term {
  term: string;
  category: Category;
  def: string;
}

const TERMS: Term[] = [
  { term: 'Address', category: 'Basics', def: 'A unique string of letters and numbers that identifies a wallet on a blockchain, used to send and receive crypto assets.' },
  { term: 'Airdrop', category: 'Basics', def: 'A distribution of tokens, often free, to wallet addresses to bootstrap a community or reward early users.' },
  { term: 'Altcoin', category: 'Basics', def: 'Any cryptocurrency other than Bitcoin. The term groups thousands of alternative digital assets.' },
  { term: 'AMM', category: 'DeFi', def: 'Automated Market Maker. A protocol that prices assets using a mathematical formula and liquidity pools instead of an order book.' },
  { term: 'APY', category: 'DeFi', def: 'Annual Percentage Yield. The real rate of return earned on a deposit over a year, including the effect of compounding.' },
  { term: 'Arbitrage', category: 'Trading', def: 'Profiting from price differences for the same asset across markets by buying low on one venue and selling high on another.' },
  { term: 'Ask', category: 'Trading', def: 'The lowest price a seller is currently willing to accept for an asset in the order book.' },
  { term: 'Bear Market', category: 'Trading', def: 'A sustained period of falling prices and negative sentiment across an asset or the broader market.' },
  { term: 'Bid', category: 'Trading', def: 'The highest price a buyer is currently willing to pay for an asset in the order book.' },
  { term: 'Block', category: 'Basics', def: 'A batch of transactions bundled together, validated, and permanently added to a blockchain.' },
  { term: 'Blockchain', category: 'Basics', def: 'A distributed, append-only ledger of transactions maintained across a network of computers without a central authority.' },
  { term: 'Bull Market', category: 'Trading', def: 'A sustained period of rising prices and optimistic sentiment across an asset or the broader market.' },
  { term: 'Candlestick', category: 'Trading', def: 'A chart element showing the open, high, low, and close price of an asset over a fixed time interval.' },
  { term: 'Cold Wallet', category: 'Security', def: 'A wallet that stores private keys offline, dramatically reducing exposure to remote attacks.' },
  { term: 'Consensus', category: 'Basics', def: 'The mechanism by which a decentralized network agrees on the valid state of the ledger, such as Proof of Work or Proof of Stake.' },
  { term: 'Custody', category: 'Security', def: 'The safekeeping of crypto assets and their private keys, either by the user (self-custody) or a trusted third party.' },
  { term: 'DApp', category: 'DeFi', def: 'A decentralized application that runs on a blockchain using smart contracts rather than centralized servers.' },
  { term: 'DeFi', category: 'DeFi', def: 'Decentralized Finance. Financial services such as lending and trading built on public blockchains without intermediaries.' },
  { term: 'DEX', category: 'DeFi', def: 'A Decentralized Exchange that lets users trade directly from their wallets through smart contracts.' },
  { term: 'Fiat', category: 'Basics', def: 'Government-issued currency such as USD or EUR that is not backed by a physical commodity.' },
  { term: 'Funding Rate', category: 'Trading', def: 'Periodic payments exchanged between long and short positions in perpetual futures to keep prices aligned with spot.' },
  { term: 'Gas', category: 'Basics', def: 'The fee paid to process a transaction or execute a smart contract on a blockchain network.' },
  { term: 'Hash', category: 'Basics', def: 'A fixed-length output produced by a cryptographic function, used to secure and reference blockchain data.' },
  { term: 'Hot Wallet', category: 'Security', def: 'A wallet connected to the internet, offering convenience for active use at the cost of higher attack exposure.' },
  { term: 'Leverage', category: 'Trading', def: 'Borrowed capital used to increase position size, amplifying both potential gains and potential losses.' },
  { term: 'Liquidation', category: 'Trading', def: 'The forced closure of a leveraged position when margin falls below the maintenance requirement.' },
  { term: 'Liquidity', category: 'Trading', def: 'How easily an asset can be bought or sold without significantly moving its price.' },
  { term: 'Limit Order', category: 'Trading', def: 'An instruction to buy or sell only at a specified price or better.' },
  { term: 'Market Cap', category: 'Basics', def: 'The total value of a cryptocurrency, calculated by multiplying its price by the circulating supply.' },
  { term: 'Market Order', category: 'Trading', def: 'An instruction to buy or sell immediately at the best currently available price.' },
  { term: 'Mining', category: 'Basics', def: 'The process of validating transactions and adding new blocks to a Proof of Work blockchain in exchange for rewards.' },
  { term: 'Mnemonic', category: 'Security', def: 'A human-readable sequence of words, also called a seed phrase, that can restore access to a wallet.' },
  { term: 'NFT', category: 'Basics', def: 'A Non-Fungible Token representing unique ownership of a digital or physical item on a blockchain.' },
  { term: 'Nonce', category: 'Basics', def: 'A number used once in a transaction or block to ensure ordering and prevent replay.' },
  { term: 'Oracle', category: 'DeFi', def: 'A service that feeds external real-world data, such as prices, into smart contracts on a blockchain.' },
  { term: 'Order Book', category: 'Trading', def: 'A live list of outstanding buy and sell orders for an asset, organized by price level.' },
  { term: 'Private Key', category: 'Security', def: 'A secret cryptographic key that authorizes spending from a wallet and must never be shared.' },
  { term: 'Proof of Stake', category: 'Basics', def: 'A consensus mechanism where validators are chosen to create blocks based on the amount of crypto they stake.' },
  { term: 'Public Key', category: 'Security', def: 'A cryptographic key derived from a private key that can be shared to receive funds and verify signatures.' },
  { term: 'Slippage', category: 'Trading', def: 'The difference between an order\u2019s expected price and the price at which it actually executes.' },
  { term: 'Smart Contract', category: 'DeFi', def: 'Self-executing code on a blockchain that automatically enforces the terms of an agreement.' },
  { term: 'Stablecoin', category: 'Basics', def: 'A cryptocurrency designed to hold a stable value, usually pegged to a fiat currency like the US dollar.' },
  { term: 'Staking', category: 'DeFi', def: 'Locking up crypto to help secure a network or protocol in exchange for rewards.' },
  { term: 'Stop-Loss', category: 'Trading', def: 'An order that automatically closes a position once the price hits a preset level to cap losses.' },
  { term: 'Token', category: 'Basics', def: 'A digital asset issued on an existing blockchain, representing value, utility, or governance rights.' },
  { term: 'TVL', category: 'DeFi', def: 'Total Value Locked. The aggregate value of assets deposited in a DeFi protocol.' },
  { term: 'Volatility', category: 'Trading', def: 'A measure of how sharply an asset\u2019s price moves over time, indicating risk and opportunity.' },
  { term: 'Wallet', category: 'Security', def: 'A tool that stores the keys needed to access, send, and receive crypto assets.' },
  { term: 'Whale', category: 'Trading', def: 'An individual or entity holding a large amount of crypto, capable of influencing market prices.' },
  { term: 'Yield Farming', category: 'DeFi', def: 'Moving crypto between DeFi protocols to maximize returns from interest, fees, and incentive rewards.' },
];

const CATEGORY_STYLES: Record<Category, string> = {
  Basics: 'bg-[#2B3139] text-[#B7BDC6]',
  Trading: 'bg-[#F0B90B]/10 text-[#F0B90B]',
  DeFi: 'bg-[#0ECB81]/10 text-[#0ECB81]',
  Security: 'bg-[#F6465D]/10 text-[#F6465D]',
};

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const CATEGORIES: (Category | 'All')[] = ['All', 'Basics', 'Trading', 'DeFi', 'Security'];

export default function CryptoGlossaryPage({ onNavigate }: MorePageProps) {
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState<Category | 'All'>('All');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TERMS.filter((t) => {
      const matchCat = activeCat === 'All' || t.category === activeCat;
      const matchQuery = !q || t.term.toLowerCase().includes(q) || t.def.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [query, activeCat]);

  const grouped = useMemo(() => {
    const map = new Map<string, Term[]>();
    for (const t of filtered) {
      const letter = t.term[0].toUpperCase();
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter)!.push(t);
    }
    return map;
  }, [filtered]);

  const availableLetters = useMemo(() => new Set(grouped.keys()), [grouped]);

  return (
    <div className="bg-[#0B0E11] min-h-screen text-[#EAECEF] font-sans pb-24">
      {/* Hero */}
      <section className="bg-gradient-to-b from-[#181A20] to-[#0B0E11] border-b border-[#2B3139]">
        <div className="max-w-[1200px] mx-auto px-6 pt-20 pb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2B3139] mb-6">
            <BookText className="w-4 h-4 text-[#F0B90B]" />
            <span className="text-xs font-bold tracking-wider uppercase">Basonce Glossary</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight tracking-tight mb-4 max-w-2xl">
            The crypto dictionary, <span className="text-[#F0B90B]">A to Z</span>
          </h1>
          <p className="text-[#848E9C] text-lg leading-relaxed max-w-2xl mb-8">
            Clear, jargon-free definitions for {TERMS.length} essential crypto and trading terms. Search instantly or
            jump by letter to demystify the language of digital assets.
          </p>

          {/* Search */}
          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#848E9C]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search terms or definitions..."
              className="w-full bg-[#0B0E11] border border-[#2B3139] rounded-xl pl-12 pr-12 py-4 text-[#EAECEF] placeholder-[#848E9C] focus:outline-none focus:border-[#F0B90B] transition-colors"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#848E9C] hover:text-[#EAECEF] transition-colors"
                aria-label="Clear search"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Category filter */}
      <section className="border-b border-[#2B3139] bg-[#0B0E11]">
        <div className="max-w-[1200px] mx-auto px-6 py-4 flex items-center gap-3 flex-wrap">
          <Layers className="w-4 h-4 text-[#848E9C]" />
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCat(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors whitespace-nowrap ${
                activeCat === cat
                  ? 'bg-[#F0B90B] text-black'
                  : 'bg-[#181A20] text-[#B7BDC6] hover:text-[#EAECEF] border border-[#2B3139]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Alphabet jump nav */}
      <section className="bg-[#0d1014] border-b border-[#2B3139] sticky top-0 z-10">
        <div className="max-w-[1200px] mx-auto px-6 py-3 flex items-center gap-1 flex-wrap">
          {ALPHABET.map((letter) => {
            const has = availableLetters.has(letter);
            return has ? (
              <a
                key={letter}
                href={`#letter-${letter}`}
                className="w-8 h-8 flex items-center justify-center rounded-md text-sm font-bold text-[#F0B90B] hover:bg-[#F0B90B]/10 transition-colors tabular-nums"
              >
                {letter}
              </a>
            ) : (
              <span
                key={letter}
                className="w-8 h-8 flex items-center justify-center rounded-md text-sm font-bold text-[#3a4049] cursor-default tabular-nums"
              >
                {letter}
              </span>
            );
          })}
        </div>
      </section>

      {/* Terms */}
      <section className="max-w-[1200px] mx-auto px-6 py-12">
        <div className="flex items-center gap-2 mb-8 text-[#848E9C] text-sm">
          <Hash className="w-4 h-4" />
          <span className="tabular-nums">{filtered.length}</span>
          <span>{filtered.length === 1 ? 'term' : 'terms'} shown</span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <BookText className="w-12 h-12 text-[#2B3139] mx-auto mb-4" />
            <p className="text-[#848E9C]">No terms match your search. Try a different keyword or category.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {ALPHABET.filter((l) => grouped.has(l)).map((letter) => (
              <div key={letter} id={`letter-${letter}`} className="scroll-mt-32">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-11 h-11 rounded-lg bg-[#F0B90B] text-black font-bold text-xl flex items-center justify-center shrink-0">
                    {letter}
                  </div>
                  <div className="h-px flex-1 bg-[#2B3139]" />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {grouped.get(letter)!.map((t) => (
                    <div
                      key={t.term}
                      className="bg-[#181A20] border border-[#2B3139] rounded-xl p-5 hover:border-[#F0B90B]/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="text-lg font-bold text-white min-w-0 truncate">{t.term}</h3>
                        <span
                          className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full whitespace-nowrap ${CATEGORY_STYLES[t.category]}`}
                        >
                          {t.category}
                        </span>
                      </div>
                      <p className="text-[#B7BDC6] text-sm leading-relaxed">{t.def}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Closing CTA */}
      <section className="max-w-[1200px] mx-auto px-6">
        <div className="bg-gradient-to-r from-[#181A20] to-[#1E2329] border border-[#2B3139] rounded-2xl p-10 md:p-14 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="max-w-xl">
            <h2 className="text-2xl lg:text-3xl font-bold text-white tracking-tight mb-3">
              Now put the words into practice
            </h2>
            <p className="text-[#848E9C] leading-relaxed">
              You know the terms. Open a Basonce account to trade spot and futures, or keep learning with structured
              courses in the Academy.
            </p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <button
              onClick={openAuthRegister}
              className="px-7 py-3.5 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('academy')}
              className="px-7 py-3.5 bg-white/5 hover:bg-white/10 border border-[#2B3139] text-[#EAECEF] font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              Visit Academy
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
