import { X, ChevronRight, ChevronLeft, Search, Zap, DollarSign, Lock, ShoppingBag, Shield, Sparkles, ThumbsUp, ThumbsDown, MessageCircle, Ticket, HelpCircle, AlertTriangle, CheckCircle, ArrowRight, Lightbulb } from 'lucide-react';
import { useState, useMemo } from 'react';

interface FAQModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDemoMode?: boolean;
}

type Screen = 'home' | 'category' | 'answer';

interface FAQItem {
  id: string;
  question: string;
  answer: AnswerBlock[];
  category: string;
}

interface AnswerBlock {
  type: 'text' | 'info' | 'warning' | 'success' | 'table' | 'steps' | 'highlight';
  content?: string;
  rows?: { label: string; value: string; note?: string }[];
  steps?: { step: number; title: string; desc: string }[];
  title?: string;
}

interface Category {
  id: string;
  title: string;
  subtitle: string;
  icon: any;
  color: string;
  bg: string;
  border: string;
  count: number;
}

const categories: Category[] = [
  {
    id: 'unlock',
    title: '🔓 Withdrawal Unlock',
    subtitle: 'Two paths to free your balance',
    icon: Lock,
    color: 'text-[#F0B90B]',
    bg: 'bg-[#F0B90B]/10',
    border: 'border-[#F0B90B]/40',
    count: 3
  },
  {
    id: 'how-it-works',
    title: 'How Mining Works',
    subtitle: 'System & mechanics',
    icon: Zap,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    count: 5
  },
  {
    id: 'earnings',
    title: 'Earnings & Balance',
    subtitle: 'USDT vs EQ explained',
    icon: DollarSign,
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    count: 6
  },
  {
    id: 'equipment',
    title: 'Equipment & Shop',
    subtitle: 'Purchase & upgrade',
    icon: ShoppingBag,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    count: 4
  },
  {
    id: 'withdrawal',
    title: 'Withdrawals',
    subtitle: 'Limits & conditions',
    icon: Lock,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    count: 5
  },
  {
    id: 'security',
    title: 'Security',
    subtitle: 'Account & fund safety',
    icon: Shield,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    count: 3
  },
  {
    id: 'demo',
    title: 'Demo Mode',
    subtitle: 'Free trial process',
    icon: Sparkles,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    count: 3
  }
];

const faqData: FAQItem[] = [
  {
    id: 'unlock1',
    category: 'unlock',
    question: 'Why is my withdrawal locked? How do I unlock it?',
    answer: [
      {
        type: 'text',
        content: 'Your account has a withdrawal lock that protects against bonus abuse and ensures genuine platform engagement. To unlock your full balance — including all mining earnings, trading profits, and bonuses — you must complete ONE of two requirements (whichever you reach first):'
      },
      {
        type: 'table',
        rows: [
          { label: '🅰️  Option A — Trading Volume', value: '$50,000 USDT', note: 'Reach $50,000 in cumulative trading volume across spot, futures, and quick trade. Every trade counts toward this number, regardless of profit or loss.' },
          { label: '🅱️  Option B — Deposit (Faster ⚡)', value: '$250 USDT', note: 'Make at least $250 USDT in confirmed external deposits via BEP20, TRC20, or ERC20. A single $250 deposit instantly unlocks your entire balance — RECOMMENDED for fastest unlock.' }
        ]
      },
      {
        type: 'success',
        title: '✅ Once Either Condition Is Met',
        content: 'Your withdrawal lock is permanently removed and your full balance — every dollar of mining earnings, trading profits, and accumulated bonuses — becomes free for withdrawal, transfer, or shop purchases. No further approvals required.'
      },
      {
        type: 'highlight',
        title: 'Why this rule exists',
        content: 'Bonus abuse protection: it ensures every user has either traded actively on the platform or shown commitment with a real deposit. This keeps the bonus economy sustainable for everyone.'
      }
    ]
  },
  {
    id: 'unlock2',
    category: 'unlock',
    question: 'Which option is better for me — A or B?',
    answer: [
      {
        type: 'text',
        content: 'Both unlock the same thing — your entire balance, with no further restrictions. The only difference is speed and effort:'
      },
      {
        type: 'success',
        title: '⚡ Option B — Recommended for most users',
        content: 'A $250 deposit is the fastest, simplest path. If you have $54,000+ in mining earnings sitting locked, depositing $250 to unlock all of it is a 216x return on the deposit. Most users complete this in minutes via BEP20 USDT (lowest network fees).'
      },
      {
        type: 'info',
        title: '📈 Option A — For active traders',
        content: 'If you already trade frequently, $50,000 in cumulative volume is reachable through normal activity. Each round-trip trade (buy + sell) counts as $X + $X toward the volume goal. High-leverage futures positions count their full notional size.'
      },
      {
        type: 'warning',
        title: 'Important: They do NOT stack',
        content: 'You only need to complete ONE option. The moment either counter hits 100%, the lock is permanently lifted — you do not need to finish both.'
      }
    ]
  },
  {
    id: 'unlock3',
    category: 'unlock',
    question: 'How do I check my unlock progress?',
    answer: [
      {
        type: 'text',
        content: 'Your live unlock progress is tracked in real time and visible whenever you open a withdrawal request. Two counters update automatically:'
      },
      {
        type: 'table',
        rows: [
          { label: '📊 Trading Volume', value: '$X / $50,000', note: 'Tracks all completed trades across spot, futures, and quick trade. Updates instantly after each trade.' },
          { label: '💰 Deposits', value: '$X / $250', note: 'Tracks all confirmed external deposits (BEP20, TRC20, ERC20). Updates as soon as the blockchain transaction is confirmed.' }
        ]
      },
      {
        type: 'success',
        title: '🚀 Automatic Unlock',
        content: 'The moment EITHER counter reaches 100%, your withdrawal opens automatically. No manual approval, no support ticket, no waiting. The lock is removed permanently for the lifetime of your account.'
      },
      {
        type: 'info',
        title: '💡 Pro Tip',
        content: 'If you want to withdraw today, choose Option B. A single BEP20 USDT deposit of $250 typically confirms in under 60 seconds and unlocks your entire balance instantly.'
      }
    ]
  },
  {
    id: 'hw1',
    category: 'how-it-works',
    question: 'How does the mining system work?',
    answer: [
      {
        type: 'steps',
        steps: [
          { step: 1, title: 'Buy Equipment', desc: 'Purchase equipment from the Shop. There are 8 different levels ranging from CPU Miner to Mining Farm.' },
          { step: 2, title: 'Press START', desc: 'Select your equipment and tap the START button. The countdown timer begins immediately.' },
          { step: 3, title: 'Wait & Earn', desc: 'Your equipment automatically earns USDT. Mining continues even if you close the app.' },
          { step: 4, title: 'Press COLLECT', desc: 'Once the timer ends, tap COLLECT. Earnings are transferred directly to your balance.' }
        ]
      },
      {
        type: 'info',
        title: 'Good to Know',
        content: 'Each piece of equipment has its own session duration, daily earnings, and withdrawal limit. Higher-priced equipment = higher earnings + lower withdrawal limit.'
      }
    ]
  },
  {
    id: 'hw2',
    category: 'how-it-works',
    question: 'What is Session Earnings? How is it different from my Balance?',
    answer: [
      {
        type: 'table',
        rows: [
          { label: 'Session Earnings', value: 'Locked', note: 'Accumulating earnings during an active mining session. Cannot be spent.' },
          { label: 'Available Balance', value: 'Free', note: 'Funds credited to your balance after COLLECT. Available for all transactions.' }
        ]
      },
      {
        type: 'warning',
        title: 'Important',
        content: 'While Session Earnings are locked, you cannot buy equipment or make withdrawals. You need to COLLECT first.'
      }
    ]
  },
  {
    id: 'hw3',
    category: 'how-it-works',
    question: 'Timer ended but the COLLECT button didn\'t appear. Why?',
    answer: [
      {
        type: 'text',
        content: 'Some equipment (especially the free CPU Miner) becomes locked after its first use. Your earnings are visible but cannot be collected. This is part of the platform\'s progression system.'
      },
      {
        type: 'warning',
        title: 'Why is it Locked?',
        content: 'The free CPU Miner locks after one use. You need to upgrade to the next level to unlock your earnings.'
      },
      {
        type: 'info',
        title: 'Solution',
        content: 'Purchase CPU Miner Pro ($35) from the Shop to unlock your locked earnings. The locked amount is credited to you.'
      }
    ]
  },
  {
    id: 'hw4',
    category: 'how-it-works',
    question: 'Can multiple pieces of equipment run at the same time?',
    answer: [
      {
        type: 'success',
        title: 'Yes, they run simultaneously!',
        content: 'All equipment operates independently. Each has its own timer, earnings calculation, and COLLECT button.'
      },
      {
        type: 'highlight',
        title: 'Example: 3 Equipment Running Together',
        content: 'CPU Miner ($0.05/hr) + GPU Miner ($0.20/hr) + ASIC Miner ($0.50/hr) = Total $0.75/hr'
      }
    ]
  },
  {
    id: 'hw5',
    category: 'how-it-works',
    question: 'Can I close the app while mining is in progress?',
    answer: [
      {
        type: 'success',
        title: 'Yes! It continues in the background.',
        content: 'Mining runs server-side. Even if you close the app or turn off your phone, mining continues and earnings keep accumulating.'
      },
      {
        type: 'info',
        title: 'When You Return',
        content: 'When you reopen the app, you\'ll see exactly where your equipment is and how much you\'ve earned. If the timer has ended, tap COLLECT.'
      }
    ]
  },
  {
    id: 'e0',
    category: 'earnings',
    question: 'USDT vs EQ — what is the difference? (Most asked)',
    answer: [
      {
        type: 'text',
        content: 'Your Mining page shows TWO different values side by side. They look similar but they are NOT the same thing. Here is the simple comparison:'
      },
      {
        type: 'table',
        rows: [
          { label: '💵 USDT', value: 'REAL MONEY', note: 'This is your actual balance. You can withdraw it, use it in the Shop, send it to your wallet, trade with it. This is the only thing that matters financially.' },
          { label: '⭐ EQ Token', value: 'LOYALTY BADGE', note: 'EQ is a loyalty/activity score that grows alongside your USDT. It is "Display Only" — you cannot withdraw it, sell it, or trade it. Think of it as a prestige badge.' }
        ]
      },
      {
        type: 'success',
        title: 'Simple Rule',
        content: 'If a number is in USDT → it is real money you can use.\nIf a number is in EQ → it is a visual bonus, decorative only.'
      },
      {
        type: 'info',
        title: 'Why does EQ exist then?',
        content: 'EQ is a loyalty indicator that grows with your platform activity. Higher EQ shows other users (and yourself) how much you have engaged with mining. It does NOT affect your real earnings, withdrawals, or any financial benefit.'
      },
      {
        type: 'warning',
        title: 'Don\'t Get Confused',
        content: 'When you see "+$0.12 USDT (+$0.11 EQ display only)" — only the $0.12 USDT goes to your real balance. The $0.11 EQ is just a visual companion number.'
      }
    ]
  },
  {
    id: 'e0b',
    category: 'earnings',
    question: 'Why are two values shown together on the dashboard?',
    answer: [
      {
        type: 'text',
        content: 'On the Mining page you will see paired values like:'
      },
      {
        type: 'table',
        rows: [
          { label: 'Session Earnings', value: '+$0.12 USDT', note: '+$0.11 EQ (display only) — the EQ is just a visual companion' },
          { label: 'Available USDT', value: '$54,539.64', note: 'Real, spendable balance — usable in Shop, withdraw, transfer' },
          { label: 'EQ Earned', value: '0.1056 EQ', note: 'Display Only — Mining bonus metric, no monetary value' },
          { label: 'Hourly Rate', value: '$0.00/h', note: '0.00 EQ/h — both shown, only USDT is real' }
        ]
      },
      {
        type: 'highlight',
        title: 'Quick Test',
        content: 'When in doubt, ask yourself: "Can I withdraw this number?" If the answer is YES → it is USDT. If the answer is NO → it is EQ.'
      }
    ]
  },
  {
    id: 'e1',
    category: 'earnings',
    question: 'How much can I earn with each equipment?',
    answer: [
      {
        type: 'table',
        rows: [
          { label: 'CPU Miner', value: '$1.2/day', note: '3-hour session — Free' },
          { label: 'CPU Miner Pro', value: '$1.2/day', note: '3-hour session — $35' },
          { label: 'GPU Miner', value: '$4.8/day', note: '6-hour session — $50' },
          { label: 'GPU Miner Pro', value: '$6/day', note: '8-hour session — $120' },
          { label: 'ASIC Miner', value: '$12/day', note: '12-hour session — $200' },
          { label: 'ASIC Pro', value: '$18/day', note: '18-hour session — $450' },
          { label: 'Mining Farm', value: '$30/day', note: '24-hour session — $1,000' },
          { label: 'Mining Farm Pro', value: '$50/day', note: '24-hour session — $2,500' }
        ]
      }
    ]
  },
  {
    id: 'e2',
    category: 'earnings',
    question: 'How is my hourly earnings rate calculated?',
    answer: [
      {
        type: 'text',
        content: 'Each equipment\'s daily earnings are divided by 24 to calculate the hourly rate.'
      },
      {
        type: 'highlight',
        title: 'Formula',
        content: 'Daily Earnings / 24 = Hourly Earnings\n\nExample: GPU Miner → $4.8 / 24 = $0.20/hr'
      },
      {
        type: 'info',
        title: 'Dashboard Indicator',
        content: 'The "Hourly Rate" indicator on the Mining page shows the total hourly earnings across all currently active equipment.'
      }
    ]
  },
  {
    id: 'e3',
    category: 'earnings',
    question: 'What is EQ Token? Can I withdraw it?',
    answer: [
      {
        type: 'text',
        content: 'EQ (EarnQuest Token) is a visual metric showing your platform activity. It is calculated based on your USDT balance.'
      },
      {
        type: 'warning',
        title: 'Important',
        content: 'EQ Token cannot be withdrawn or traded. It is purely a visual loyalty indicator. Your real withdrawable earnings are always denominated in USDT.'
      }
    ]
  },
  {
    id: 'e4',
    category: 'earnings',
    question: 'What is Total Earned?',
    answer: [
      {
        type: 'text',
        content: 'Total Earned shows your cumulative earnings across all mining sessions in your account. It includes USDT earned from all equipment, including demo mode.'
      },
      {
        type: 'info',
        title: 'Included',
        content: 'All equipment earnings + Demo mode earnings (credited after registration)'
      },
      {
        type: 'warning',
        title: 'Not Included',
        content: 'Spot/Futures trading profits, external wallet deposits, referral bonuses'
      }
    ]
  },
  {
    id: 'eq1',
    category: 'equipment',
    question: 'Which equipment should I buy?',
    answer: [
      {
        type: 'steps',
        steps: [
          { step: 1, title: 'Beginner', desc: 'CPU Miner Pro ($35) → Unlock your locked earnings and learn the basics.' },
          { step: 2, title: 'Entry Level', desc: 'GPU Miner ($50) → $4.8/day earnings, $50 withdrawal limit.' },
          { step: 3, title: 'Mid Level', desc: 'ASIC Miner ($200) → $12/day earnings, $25 withdrawal limit.' },
          { step: 4, title: 'Professional', desc: 'Mining Farm ($1,000+) → $30–$50/day earnings, $10–$15 withdrawal limit.' }
        ]
      },
      {
        type: 'info',
        title: 'Recommendation',
        content: 'For the fastest path to withdrawals, aim directly for the ASIC Miner ($200). With a $25 limit, withdrawals become much more accessible.'
      }
    ]
  },
  {
    id: 'eq2',
    category: 'equipment',
    question: 'Equipment in the Shop is locked. How do I unlock it?',
    answer: [
      {
        type: 'text',
        content: 'Some higher-tier equipment requires you to own the previous tier. This is part of the step-by-step progression system.'
      },
      {
        type: 'info',
        title: 'To Unlock',
        content: 'Long-press on the equipment or tap the info icon. You\'ll see exactly what condition is required to unlock it.'
      }
    ]
  },
  {
    id: 'eq3',
    category: 'equipment',
    question: 'Can I sell equipment I\'ve already purchased?',
    answer: [
      {
        type: 'warning',
        title: 'No, equipment cannot be sold.',
        content: 'Once purchased, equipment is permanently linked to your account. Transfers or sales are not possible.'
      },
      {
        type: 'success',
        title: 'Good News',
        content: 'Equipment never breaks or degrades. It continues earning at the same rate forever. Every purchase is a permanent passive income source.'
      }
    ]
  },
  {
    id: 'eq4',
    category: 'equipment',
    question: 'What does the session duration difference mean?',
    answer: [
      {
        type: 'text',
        content: 'Each piece of equipment runs for a set number of hours per session. When the time is up, it stops and you need to COLLECT.'
      },
      {
        type: 'table',
        rows: [
          { label: 'CPU Miner', value: '3 hours', note: 'Up to 8 sessions/day' },
          { label: 'GPU Miner', value: '6 hours', note: 'Up to 4 sessions/day' },
          { label: 'ASIC Miner', value: '12 hours', note: 'Up to 2 sessions/day' },
          { label: 'Mining Farm', value: '24 hours', note: '1 session/day' }
        ]
      },
      {
        type: 'info',
        title: 'Why longer is better',
        content: '24-hour equipment requires fewer COLLECTs, making it more truly passive. Shorter-duration equipment requires more frequent check-ins.'
      }
    ]
  },
  {
    id: 'w1',
    category: 'withdrawal',
    question: 'Why can\'t I withdraw? What is the withdrawal limit?',
    answer: [
      {
        type: 'text',
        content: 'Your withdrawal limit is determined by the highest-tier equipment you own. Your total balance (Available + Session Earnings) must exceed this limit.'
      },
      {
        type: 'table',
        rows: [
          { label: 'CPU Miner / Pro', value: '$100 limit', note: 'Minimum $100 balance required' },
          { label: 'GPU Miner', value: '$50 limit', note: 'Minimum $50 balance required' },
          { label: 'GPU Miner Pro', value: '$40 limit', note: 'Minimum $40 balance required' },
          { label: 'ASIC Miner', value: '$25 limit', note: 'Minimum $25 balance required' },
          { label: 'ASIC Pro', value: '$20 limit', note: 'Minimum $20 balance required' },
          { label: 'Mining Farm', value: '$15 limit', note: 'Minimum $15 balance required' },
          { label: 'Mining Farm Pro', value: '$10 limit', note: 'Minimum $10 balance required' }
        ]
      }
    ]
  },
  {
    id: 'w2',
    category: 'withdrawal',
    question: 'How do I make a withdrawal? Step-by-step guide.',
    answer: [
      {
        type: 'steps',
        steps: [
          { step: 1, title: 'Check Your Equipment Level', desc: 'Go to the Mining page. See which equipment you own and what your withdrawal limit is.' },
          { step: 2, title: 'Check Your Balance', desc: 'Your total balance (available + session earnings) must exceed the withdrawal limit.' },
          { step: 3, title: 'Collect Your Mining Earnings', desc: 'If the session timer has ended, tap COLLECT first. Session earnings are added to your balance.' },
          { step: 4, title: 'Go to Wallet', desc: 'Tap "My Wallet" from the bottom menu. Select "Withdraw".' },
          { step: 5, title: 'Submit Request', desc: 'Enter the amount, select network (TRC20/BEP20), enter your address, and submit. Processed within 24–48 hours.' }
        ]
      }
    ]
  },
  {
    id: 'w3',
    category: 'withdrawal',
    question: 'Why does withdrawal take 24–48 hours?',
    answer: [
      {
        type: 'text',
        content: 'All withdrawal requests are manually verified by the security team. This is the strongest defense against unauthorized transactions.'
      },
      {
        type: 'info',
        title: 'Processing Flow',
        content: 'Request received → Security verification → Blockchain confirmation → Delivered to your wallet\n\nAdditional confirmation time may apply depending on the blockchain network.'
      }
    ]
  },
  {
    id: 'w4',
    category: 'withdrawal',
    question: 'How often can I withdraw?',
    answer: [
      {
        type: 'success',
        title: 'No daily or weekly limits.',
        content: 'As long as your balance meets the withdrawal limit, you can withdraw anytime. There are no waiting periods or quota restrictions.'
      },
      {
        type: 'info',
        title: 'Pro Tip',
        content: 'Withdraw larger amounts at once instead of small amounts. This minimizes blockchain transaction fees.'
      }
    ]
  },
  {
    id: 'w5',
    category: 'withdrawal',
    question: 'My withdrawal request was rejected. What should I do?',
    answer: [
      {
        type: 'text',
        content: 'Common reasons for rejection include:'
      },
      {
        type: 'warning',
        title: 'Common Reasons',
        content: '• Balance dropped below the withdrawal limit\n• Wrong network selected (e.g., ERC20 instead of TRC20)\n• Incorrect or incomplete wallet address\n• Account verification required'
      },
      {
        type: 'info',
        title: 'Solution',
        content: 'Contact the support team. If you include your Request ID, we can assist you much faster.'
      }
    ]
  },
  {
    id: 's1',
    category: 'security',
    question: 'Can I lose money while mining?',
    answer: [
      {
        type: 'success',
        title: 'No, mining is completely risk-free.',
        content: 'The mining system carries zero risk. Your equipment never "breaks", your earnings never disappear, and your USDT balance never decreases due to mining.'
      },
      {
        type: 'info',
        title: 'Your earnings are always protected',
        content: '• Your USDT balance\n• Equipment you\'ve purchased\n• Accumulated earnings\n\nAll fully secured.'
      },
      {
        type: 'warning',
        title: 'Important Note',
        content: 'Withdrawal limits and upgrade requirements are a strategic progression mechanic, not fund loss. Your balance always belongs to you.'
      }
    ]
  },
  {
    id: 's2',
    category: 'security',
    question: 'Is my account safe? Can there be unauthorized access?',
    answer: [
      {
        type: 'steps',
        steps: [
          { step: 1, title: 'Use a Strong Password', desc: 'Choose a password with at least 12 characters including uppercase, lowercase, numbers, and symbols.' },
          { step: 2, title: 'Never Share Login Credentials', desc: 'Platform staff will never ask for your password. Do not give it to anyone who does.' },
          { step: 3, title: 'Report Suspicious Activity', desc: 'If you notice unusual activity in your account, contact the support team immediately.' }
        ]
      }
    ]
  },
  {
    id: 's3',
    category: 'security',
    question: 'Does withdrawing affect my equipment?',
    answer: [
      {
        type: 'success',
        title: 'No, equipment is not affected.',
        content: 'A withdrawal only affects your Available Balance. Your equipment continues to operate, earn, and count down exactly as before.'
      },
      {
        type: 'info',
        title: 'Tip',
        content: 'Before withdrawing, collect all pending Session Earnings. This way you can withdraw the maximum amount. Equipment continues mining after withdrawal.'
      }
    ]
  },
  {
    id: 'd1',
    category: 'demo',
    question: 'What is Demo Mode? Can I earn real money?',
    answer: [
      {
        type: 'text',
        content: 'Demo Mode is a free 15-minute trial you can try without registering.'
      },
      {
        type: 'table',
        rows: [
          { label: 'Duration', value: '15 minutes', note: 'No registration required' },
          { label: 'Equipment', value: 'Free CPU Miner', note: 'Provided automatically' },
          { label: 'Earnings', value: 'Real USDT', note: 'Added to account after registration' }
        ]
      },
      {
        type: 'info',
        title: 'Your Earnings Don\'t Disappear',
        content: 'When the demo ends or you tap COLLECT, the registration screen appears. After signing up, your demo earnings are automatically credited to your account.'
      }
    ]
  },
  {
    id: 'd2',
    category: 'demo',
    question: 'Demo ended, I registered. What do I do now?',
    answer: [
      {
        type: 'steps',
        steps: [
          { step: 1, title: 'Check Your Demo Earnings', desc: 'After registration, your demo earnings are automatically added to your balance.' },
          { step: 2, title: 'Free CPU Miner Pro is Waiting', desc: 'As a registration gift, you receive a CPU Miner Pro worth $35.' },
          { step: 3, title: 'Continue Mining', desc: 'Keep earning with your CPU Miner Pro.' },
          { step: 4, title: 'Save for Better Equipment', desc: 'Buy a GPU Miner ($50) to unlock higher earnings and a lower withdrawal limit.' }
        ]
      }
    ]
  },
  {
    id: 'd3',
    category: 'demo',
    question: 'The timer runs fast in Demo Mode. Is that normal?',
    answer: [
      {
        type: 'info',
        title: 'Yes, this is intentional.',
        content: 'The demo timer runs much faster than real time (3 hours → 5–10 minutes). This lets you experience your first mining session without a long wait.'
      },
      {
        type: 'text',
        content: 'Equipment you receive after registration runs on real time. The demo speed-up only applies to the initial trial experience.'
      }
    ]
  }
];

function AnswerContent({ blocks }: { blocks: AnswerBlock[] }) {
  return (
    <div className="space-y-3">
      {blocks.map((block, i) => {
        if (block.type === 'text') {
          return (
            <p key={i} className="text-[#B7BDC6] text-sm leading-relaxed">
              {block.content}
            </p>
          );
        }

        if (block.type === 'info') {
          return (
            <div key={i} className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <HelpCircle className="w-3 h-3 text-blue-400" />
                </div>
                <span className="text-blue-400 text-xs font-semibold uppercase tracking-wide">{block.title}</span>
              </div>
              <p className="text-[#B7BDC6] text-sm leading-relaxed whitespace-pre-line">{block.content}</p>
            </div>
          );
        }

        if (block.type === 'warning') {
          return (
            <div key={i} className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-3 h-3 text-orange-400" />
                </div>
                <span className="text-orange-400 text-xs font-semibold uppercase tracking-wide">{block.title}</span>
              </div>
              <p className="text-[#B7BDC6] text-sm leading-relaxed whitespace-pre-line">{block.content}</p>
            </div>
          );
        }

        if (block.type === 'success') {
          return (
            <div key={i} className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                </div>
                <span className="text-green-400 text-xs font-semibold uppercase tracking-wide">{block.title}</span>
              </div>
              <p className="text-[#B7BDC6] text-sm leading-relaxed whitespace-pre-line">{block.content}</p>
            </div>
          );
        }

        if (block.type === 'highlight') {
          return (
            <div key={i} className="bg-[#F0B90B]/10 border border-[#F0B90B]/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-full bg-[#F0B90B]/20 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-3 h-3 text-[#F0B90B]" />
                </div>
                <span className="text-[#F0B90B] text-xs font-semibold uppercase tracking-wide">{block.title}</span>
              </div>
              <p className="text-[#B7BDC6] text-sm leading-relaxed whitespace-pre-line">{block.content}</p>
            </div>
          );
        }

        if (block.type === 'table' && block.rows) {
          return (
            <div key={i} className="rounded-xl overflow-hidden border border-[#2B3139]">
              {block.rows.map((row, j) => (
                <div
                  key={j}
                  className={`flex items-start gap-3 p-3 ${j % 2 === 0 ? 'bg-[#1E2329]' : 'bg-[#181A20]'} ${j < block.rows!.length - 1 ? 'border-b border-[#2B3139]' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium">{row.label}</div>
                    {row.note && <div className="text-[#848E9C] text-xs mt-0.5">{row.note}</div>}
                  </div>
                  <div className="text-[#F0B90B] text-sm font-bold flex-shrink-0">{row.value}</div>
                </div>
              ))}
            </div>
          );
        }

        if (block.type === 'steps' && block.steps) {
          return (
            <div key={i} className="space-y-2">
              {block.steps.map((s, j) => (
                <div key={j} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#F0B90B] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-black text-xs font-bold">{s.step}</span>
                  </div>
                  <div className="flex-1 bg-[#1E2329] rounded-xl p-3 border border-[#2B3139]">
                    <div className="text-white text-sm font-semibold">{s.title}</div>
                    <div className="text-[#848E9C] text-xs mt-1 leading-relaxed">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

export default function MiningFAQModal({ isOpen, onClose, isDemoMode }: FAQModalProps) {
  const [screen, setScreen] = useState<Screen>('home');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedFAQ, setSelectedFAQ] = useState<FAQItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [helpful, setHelpful] = useState<boolean | null>(null);

  const categoryFAQs = useMemo(() => {
    if (!selectedCategory) return [];
    return faqData.filter(f => f.category === selectedCategory);
  }, [selectedCategory]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return faqData.filter(f =>
      f.question.toLowerCase().includes(q) ||
      f.answer.some(b => b.content?.toLowerCase().includes(q) || b.title?.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  const isSearching = searchQuery.trim().length > 0;

  const goCategory = (catId: string) => {
    setSelectedCategory(catId);
    setScreen('category');
    setHelpful(null);
  };

  const goAnswer = (faq: FAQItem) => {
    setSelectedFAQ(faq);
    setScreen('answer');
    setHelpful(null);
  };

  const goBack = () => {
    if (screen === 'answer') {
      setScreen(isSearching ? 'home' : 'category');
      setSelectedFAQ(null);
      setHelpful(null);
    } else if (screen === 'category') {
      setScreen('home');
      setSelectedCategory(null);
    }
  };

  if (!isOpen) return null;

  const currentCategory = categories.find(c => c.id === selectedCategory);

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-end justify-center"
      style={{ isolation: 'isolate' }}
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-lg bg-[#181A20] rounded-t-3xl flex flex-col"
        style={{ maxHeight: '92vh', animation: 'slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex-shrink-0 pt-3 pb-0 px-4">
          <div className="w-10 h-1 bg-[#2B3139] rounded-full mx-auto mb-4" />

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {screen !== 'home' && (
                <button
                  onClick={goBack}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#2B3139] active:bg-[#363C45] transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
              )}
              <div>
                <h2 className="text-white font-bold text-lg leading-tight">
                  {screen === 'home' && 'Help Center'}
                  {screen === 'category' && currentCategory?.title}
                  {screen === 'answer' && 'Answer'}
                </h2>
                {screen === 'home' && (
                  <p className="text-[#848E9C] text-xs">Everything about the mining system</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#2B3139] active:bg-[#363C45] transition-colors"
            >
              <X className="w-5 h-5 text-[#848E9C]" />
            </button>
          </div>

          {screen === 'home' && (
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#848E9C]" />
              <input
                type="text"
                placeholder="Search questions or topics..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#2B3139] rounded-xl pl-9 pr-4 py-3 text-white text-sm placeholder-[#848E9C] outline-none focus:ring-1 focus:ring-[#F0B90B]/40 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-[#848E9C]" />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-6">
          {screen === 'home' && !isSearching && (
            <div className="space-y-3">
              <p className="text-[#848E9C] text-xs font-medium uppercase tracking-wide mb-3">Categories</p>
              <div className="grid grid-cols-2 gap-2.5">
                {categories.map(cat => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => goCategory(cat.id)}
                      className={`${cat.bg} ${cat.border} border rounded-2xl p-4 text-left active:scale-95 transition-all`}
                    >
                      <div className={`w-9 h-9 rounded-xl ${cat.bg} border ${cat.border} flex items-center justify-center mb-3`}>
                        <Icon className={`w-5 h-5 ${cat.color}`} />
                      </div>
                      <div className="text-white font-semibold text-sm leading-tight">{cat.title}</div>
                      <div className="text-[#848E9C] text-xs mt-1">{cat.count} questions</div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 bg-[#1E2329] rounded-2xl border border-[#2B3139] overflow-hidden">
                <div className="p-4 border-b border-[#2B3139]">
                  <div className="flex items-center gap-2 mb-1">
                    <Lightbulb className="w-4 h-4 text-[#F0B90B]" />
                    <span className="text-white font-semibold text-sm">Quick Guide</span>
                  </div>
                  <p className="text-[#848E9C] text-xs">Learn the withdrawal path quickly</p>
                </div>
                <button
                  onClick={() => goAnswer(faqData.find(f => f.id === 'w2')!)}
                  className="w-full flex items-center justify-between p-4 active:bg-[#2B3139] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                      <ArrowRight className="w-4 h-4 text-orange-400" />
                    </div>
                    <div className="text-left">
                      <div className="text-white text-sm font-medium">Withdrawal steps</div>
                      <div className="text-[#848E9C] text-xs">5-step guide</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#848E9C]" />
                </button>
                <button
                  onClick={() => goAnswer(faqData.find(f => f.id === 'w1')!)}
                  className="w-full flex items-center justify-between p-4 border-t border-[#2B3139] active:bg-[#2B3139] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                      <Lock className="w-4 h-4 text-orange-400" />
                    </div>
                    <div className="text-left">
                      <div className="text-white text-sm font-medium">Withdrawal limits</div>
                      <div className="text-[#848E9C] text-xs">Limits table by equipment</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#848E9C]" />
                </button>
                <button
                  onClick={() => goAnswer(faqData.find(f => f.id === 'hw1')!)}
                  className="w-full flex items-center justify-between p-4 border-t border-[#2B3139] active:bg-[#2B3139] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-yellow-400" />
                    </div>
                    <div className="text-left">
                      <div className="text-white text-sm font-medium">How does mining work?</div>
                      <div className="text-[#848E9C] text-xs">4-step beginner guide</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#848E9C]" />
                </button>
              </div>
            </div>
          )}

          {screen === 'home' && isSearching && (
            <div>
              {searchResults.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-14 h-14 rounded-full bg-[#2B3139] flex items-center justify-center mx-auto mb-4">
                    <Search className="w-7 h-7 text-[#848E9C]" />
                  </div>
                  <p className="text-white font-medium">No results found</p>
                  <p className="text-[#848E9C] text-sm mt-1">Try different keywords</p>
                </div>
              ) : (
                <div>
                  <p className="text-[#848E9C] text-xs mb-3">{searchResults.length} results found</p>
                  <div className="space-y-2">
                    {searchResults.map(faq => {
                      const cat = categories.find(c => c.id === faq.category);
                      return (
                        <button
                          key={faq.id}
                          onClick={() => goAnswer(faq)}
                          className="w-full bg-[#1E2329] border border-[#2B3139] rounded-2xl p-4 text-left active:bg-[#2B3139] transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className="text-white text-sm font-medium">{faq.question}</p>
                              {cat && (
                                <span className={`inline-block text-xs mt-1.5 ${cat.color}`}>{cat.title}</span>
                              )}
                            </div>
                            <ChevronRight className="w-4 h-4 text-[#848E9C] flex-shrink-0 mt-0.5" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {screen === 'category' && (
            <div className="space-y-2">
              {categoryFAQs.map((faq, i) => (
                <button
                  key={faq.id}
                  onClick={() => goAnswer(faq)}
                  className="w-full bg-[#1E2329] border border-[#2B3139] rounded-2xl p-4 text-left active:bg-[#2B3139] transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`w-7 h-7 rounded-lg ${currentCategory?.bg} border ${currentCategory?.border} flex items-center justify-center flex-shrink-0`}>
                        <span className={`text-xs font-bold ${currentCategory?.color}`}>{i + 1}</span>
                      </div>
                      <p className="text-white text-sm font-medium leading-snug">{faq.question}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#848E9C] flex-shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {screen === 'answer' && selectedFAQ && (
            <div>
              <div className="bg-[#1E2329] rounded-2xl border border-[#2B3139] p-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#F0B90B]/10 border border-[#F0B90B]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <HelpCircle className="w-4 h-4 text-[#F0B90B]" />
                  </div>
                  <p className="text-white font-semibold text-sm leading-snug flex-1">{selectedFAQ.question}</p>
                </div>
              </div>

              <AnswerContent blocks={selectedFAQ.answer} />

              <div className="mt-6 bg-[#1E2329] rounded-2xl border border-[#2B3139] p-4">
                <p className="text-white text-sm font-medium text-center mb-3">Was this answer helpful?</p>
                {helpful === null ? (
                  <div className="flex gap-3">
                    <button
                      onClick={() => setHelpful(true)}
                      className="flex-1 flex items-center justify-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl py-2.5 active:bg-green-500/20 transition-colors"
                    >
                      <ThumbsUp className="w-4 h-4 text-green-400" />
                      <span className="text-green-400 text-sm font-medium">Yes</span>
                    </button>
                    <button
                      onClick={() => setHelpful(false)}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl py-2.5 active:bg-red-500/20 transition-colors"
                    >
                      <ThumbsUp className="w-4 h-4 text-red-400 rotate-180" />
                      <span className="text-red-400 text-sm font-medium">No</span>
                    </button>
                  </div>
                ) : helpful ? (
                  <div className="text-center">
                    <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    <p className="text-green-400 text-sm font-medium">Thank you for your feedback!</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-[#848E9C] text-xs text-center mb-3">Sorry about that. Our live support team can help you.</p>
                    <div className="flex gap-2">
                      <button
                        onClick={onClose}
                        className="flex-1 flex items-center justify-center gap-2 bg-[#F0B90B]/10 border border-[#F0B90B]/20 rounded-xl py-2.5 active:bg-[#F0B90B]/20 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4 text-[#F0B90B]" />
                        <span className="text-[#F0B90B] text-sm font-medium">Live Support</span>
                      </button>
                      <button
                        onClick={onClose}
                        className="flex-1 flex items-center justify-center gap-2 bg-[#2B3139] rounded-xl py-2.5 active:bg-[#363C45] transition-colors"
                      >
                        <Ticket className="w-4 h-4 text-[#848E9C]" />
                        <span className="text-[#848E9C] text-sm font-medium">Open Ticket</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-3 bg-[#1E2329] rounded-2xl border border-[#2B3139] p-4">
                <p className="text-[#848E9C] text-xs font-medium uppercase tracking-wide mb-3">Related Questions</p>
                <div className="space-y-1">
                  {faqData
                    .filter(f => f.category === selectedFAQ.category && f.id !== selectedFAQ.id)
                    .slice(0, 3)
                    .map(f => (
                      <button
                        key={f.id}
                        onClick={() => { setSelectedFAQ(f); setHelpful(null); }}
                        className="w-full flex items-center justify-between py-2.5 active:opacity-70 transition-opacity"
                      >
                        <span className="text-[#B7BDC6] text-sm text-left flex-1 leading-snug">{f.question}</span>
                        <ChevronRight className="w-4 h-4 text-[#848E9C] flex-shrink-0 ml-2" />
                      </button>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {screen !== 'answer' && (
          <div className="flex-shrink-0 px-4 pb-6 pt-3 border-t border-[#2B3139] bg-[#181A20]">
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 flex items-center justify-center gap-2 bg-[#F0B90B]/10 border border-[#F0B90B]/20 rounded-xl py-3 active:bg-[#F0B90B]/20 transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-[#F0B90B]" />
                <span className="text-[#F0B90B] text-sm font-medium">Live Support</span>
              </button>
              <button
                onClick={onClose}
                className="flex-1 flex items-center justify-center gap-2 bg-[#2B3139] rounded-xl py-3 active:bg-[#363C45] transition-colors"
              >
                <Ticket className="w-4 h-4 text-[#848E9C]" />
                <span className="text-[#848E9C] text-sm font-medium">Open Ticket</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
