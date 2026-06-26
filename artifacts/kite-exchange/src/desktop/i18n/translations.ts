// Desktop-only i18n. Mobile is untouched and keeps its own (English) UI.
// Missing keys fall back to English, so no string is ever blank.

export interface LangMeta { code: string; native: string; flag: string; name?: string }

import LANGUAGES_JSON from './languages.json';

// Single source of truth for the language dropdown (also read by
// scripts/i18n-generate.mjs so generation and UI never drift).
export const LANGUAGES: LangMeta[] = LANGUAGES_JSON as LangMeta[];

export type TKey =
  | 'buyCrypto' | 'markets' | 'trade' | 'futures' | 'earn' | 'sports' | 'market'
  | 'spot' | 'aiTradingBot' | 'mining' | 'aiBot'
  | 'login' | 'signup' | 'deposit'
  | 'searchPlaceholder' | 'noResults' | 'language' | 'getApp' | 'scanToTrade'
  | 'colAbout' | 'colProducts' | 'colService' | 'colSupport' | 'colLearn'
  | 'footerDesc' | 'rights'
  | 'about' | 'careers' | 'announcements' | 'news' | 'press' | 'community'
  | 'affiliate' | 'referral' | 'api' | 'fees' | 'tradingRules' | 'status'
  | 'helpCenter' | 'chatSupport' | 'submitRequest' | 'lawEnforcement' | 'notices'
  | 'buyBitcoin' | 'buyEthereum' | 'cryptoGlossary' | 'tradingGuide' | 'marketsOverview'
  | 'terms' | 'privacy' | 'cookies' | 'riskWarning'
  | 'close' | 'comingSoon' | 'statusOk' | 'more'
  | 'systemStatus' | 'footerLegal' | 'currencyLabel'
  | 'secTitle' | 'secSub' | 'porTitle' | 'porSub'
  | 'safuTitle' | 'safuSub' | 'supTitle' | 'supSub'
  | 'statUsersLabel' | 'statVolumeLabel' | 'statCoinsLabel' | 'statCountriesLabel'
  | 'appTitle' | 'appDesc' | 'scanToDownload' | 'popularTitle' | 'popularDesc'
  | 'buyWord' | 'newsletterTitle' | 'newsletterDesc' | 'subscribe' | 'emailPlaceholder';

type Dict = Partial<Record<TKey, string>>;

const en: Record<TKey, string> = {
  buyCrypto: 'Buy Crypto', markets: 'Markets', trade: 'Trade', futures: 'Futures', earn: 'Earn', sports: 'Sports', market: 'Basonce Markets',
  spot: 'Spot', aiTradingBot: 'AI Trading Bot', mining: 'Mining', aiBot: 'AI Bot',
  login: 'Log In', signup: 'Sign Up', deposit: 'Deposit',
  searchPlaceholder: 'Search coin or pair', noResults: 'No results', language: 'Language', getApp: 'Get the app', scanToTrade: 'Scan to trade on mobile',
  colAbout: 'About Us', colProducts: 'Products', colService: 'Service', colSupport: 'Support', colLearn: 'Learn',
  footerDesc: 'The world-class digital asset exchange. Trade Bitcoin, Ethereum and 350+ cryptocurrencies with confidence.',
  rights: 'All rights reserved.',
  about: 'About', careers: 'Careers', announcements: 'Announcements', news: 'News', press: 'Press', community: 'Community',
  affiliate: 'Affiliate', referral: 'Referral', api: 'API', fees: 'Fees', tradingRules: 'Trading Rules', status: 'Status',
  helpCenter: 'Help Center', chatSupport: '24/7 Chat Support', submitRequest: 'Submit a Request', lawEnforcement: 'Law Enforcement', notices: 'Notices',
  buyBitcoin: 'Buy Bitcoin', buyEthereum: 'Buy Ethereum', cryptoGlossary: 'Crypto Glossary', tradingGuide: 'Trading Guide', marketsOverview: 'Markets Overview',
  terms: 'Terms', privacy: 'Privacy', cookies: 'Cookies', riskWarning: 'Risk Warning',
  close: 'Close', comingSoon: 'Detailed information will be available soon.', statusOk: 'All systems operational.', more: 'More',
  systemStatus: 'All systems operational', currencyLabel: 'USD',
  footerLegal: 'Crypto products and trading carry significant risk and may not be suitable for every investor. Past performance is not indicative of future results. Trade responsibly and only with funds you can afford to risk.',
  secTitle: 'Institutional Security', secSub: 'Cold storage & MPC custody',
  porTitle: 'Proof of Reserves', porSub: '1:1 backing, on-chain verifiable',
  safuTitle: 'Asset Protection Fund', safuSub: 'A dedicated reserve safeguarding users',
  supTitle: '24/7 Global Support', supSub: 'Live help in every time zone',
  statUsersLabel: 'Registered Users', statVolumeLabel: '24h Trading Volume', statCoinsLabel: 'Listed Cryptocurrencies', statCountriesLabel: 'Supported Countries',
  appTitle: 'Trade Anytime, Anywhere', appDesc: 'Scan the QR code to download the Basonce app for iOS and Android.', scanToDownload: 'Scan to download',
  popularTitle: 'Popular Cryptocurrencies', popularDesc: 'Buy and sell the most traded digital assets on the markets millions trust.',
  buyWord: 'Buy',
  newsletterTitle: 'Stay ahead of the market', newsletterDesc: 'Get product updates, market insights and exclusive offers delivered to your inbox.',
  subscribe: 'Subscribe', emailPlaceholder: 'Enter your email',
};

const tr: Dict = {
  buyCrypto: 'Kripto Al', markets: 'Piyasalar', trade: 'Al-Sat', futures: 'Vadeli', earn: 'Kazan', sports: 'Spor',
  spot: 'Spot', aiTradingBot: 'AI Alım-Satım Botu', mining: 'Madencilik', aiBot: 'AI Bot',
  login: 'Giriş Yap', signup: 'Kayıt Ol', deposit: 'Para Yatır',
  searchPlaceholder: 'Coin veya parite ara', noResults: 'Sonuç yok', language: 'Dil', getApp: 'Uygulamayı edinin', scanToTrade: 'Mobilde işlem için tarayın',
  colAbout: 'Hakkımızda', colProducts: 'Ürünler', colService: 'Hizmetler', colSupport: 'Destek', colLearn: 'Öğren',
  footerDesc: 'Dünya standartlarında dijital varlık borsası. Bitcoin, Ethereum ve 350+ kripto parayı güvenle alıp satın.',
  rights: 'Tüm hakları saklıdır.',
  about: 'Hakkında', careers: 'Kariyer', announcements: 'Duyurular', news: 'Haberler', press: 'Basın', community: 'Topluluk',
  affiliate: 'Ortaklık', referral: 'Referans', api: 'API', fees: 'Komisyonlar', tradingRules: 'İşlem Kuralları', status: 'Durum',
  helpCenter: 'Yardım Merkezi', chatSupport: '7/24 Canlı Destek', submitRequest: 'Talep Oluştur', lawEnforcement: 'Kolluk Kuvvetleri', notices: 'Bildirimler',
  buyBitcoin: 'Bitcoin Al', buyEthereum: 'Ethereum Al', cryptoGlossary: 'Kripto Sözlüğü', tradingGuide: 'İşlem Rehberi', marketsOverview: 'Piyasa Genel Bakış',
  terms: 'Şartlar', privacy: 'Gizlilik', cookies: 'Çerezler', riskWarning: 'Risk Uyarısı',
  close: 'Kapat', comingSoon: 'Detaylı bilgi yakında eklenecek.', statusOk: 'Tüm sistemler çalışıyor.', more: 'Daha Fazla',
};

const es: Dict = {
  buyCrypto: 'Comprar Cripto', markets: 'Mercados', trade: 'Operar', futures: 'Futuros', earn: 'Ganar', sports: 'Deportes',
  spot: 'Spot', aiTradingBot: 'Bot de IA', mining: 'Minería', aiBot: 'Bot IA',
  login: 'Iniciar sesión', signup: 'Registrarse', deposit: 'Depositar',
  searchPlaceholder: 'Buscar moneda o par', noResults: 'Sin resultados', language: 'Idioma', getApp: 'Obtener la app', scanToTrade: 'Escanea para operar en el móvil',
  colAbout: 'Acerca de', colProducts: 'Productos', colService: 'Servicios', colSupport: 'Soporte', colLearn: 'Aprender',
  footerDesc: 'El intercambio de activos digitales de clase mundial. Opera Bitcoin, Ethereum y más de 350 criptomonedas con confianza.',
  rights: 'Todos los derechos reservados.',
  about: 'Acerca de', careers: 'Empleo', announcements: 'Anuncios', news: 'Noticias', press: 'Prensa', community: 'Comunidad',
  affiliate: 'Afiliados', referral: 'Referidos', fees: 'Comisiones', tradingRules: 'Reglas de trading', status: 'Estado',
  helpCenter: 'Centro de ayuda', chatSupport: 'Chat 24/7', submitRequest: 'Enviar solicitud', lawEnforcement: 'Autoridades', notices: 'Avisos',
  buyBitcoin: 'Comprar Bitcoin', buyEthereum: 'Comprar Ethereum', cryptoGlossary: 'Glosario cripto', tradingGuide: 'Guía de trading', marketsOverview: 'Resumen de mercados',
  terms: 'Términos', privacy: 'Privacidad', cookies: 'Cookies', riskWarning: 'Aviso de riesgo',
  close: 'Cerrar', comingSoon: 'La información detallada estará disponible pronto.', statusOk: 'Todos los sistemas operativos.',
};

const pt: Dict = {
  buyCrypto: 'Comprar Cripto', markets: 'Mercados', trade: 'Negociar', futures: 'Futuros', earn: 'Ganhar', sports: 'Esportes',
  spot: 'Spot', aiTradingBot: 'Bot de IA', mining: 'Mineração', aiBot: 'Bot IA',
  login: 'Entrar', signup: 'Cadastrar', deposit: 'Depositar',
  searchPlaceholder: 'Buscar moeda ou par', noResults: 'Sem resultados', language: 'Idioma', getApp: 'Baixar o app', scanToTrade: 'Escaneie para negociar no celular',
  colAbout: 'Sobre nós', colProducts: 'Produtos', colService: 'Serviços', colSupport: 'Suporte', colLearn: 'Aprender',
  footerDesc: 'A corretora de ativos digitais de classe mundial. Negocie Bitcoin, Ethereum e mais de 350 criptomoedas com confiança.',
  rights: 'Todos os direitos reservados.',
  about: 'Sobre', careers: 'Carreiras', announcements: 'Anúncios', news: 'Notícias', press: 'Imprensa', community: 'Comunidade',
  affiliate: 'Afiliados', referral: 'Indicação', fees: 'Taxas', tradingRules: 'Regras de negociação', status: 'Status',
  helpCenter: 'Central de ajuda', chatSupport: 'Chat 24/7', submitRequest: 'Enviar solicitação', lawEnforcement: 'Autoridades', notices: 'Avisos',
  buyBitcoin: 'Comprar Bitcoin', buyEthereum: 'Comprar Ethereum', cryptoGlossary: 'Glossário cripto', tradingGuide: 'Guia de trading', marketsOverview: 'Visão dos mercados',
  terms: 'Termos', privacy: 'Privacidade', cookies: 'Cookies', riskWarning: 'Aviso de risco',
  close: 'Fechar', comingSoon: 'Informações detalhadas estarão disponíveis em breve.', statusOk: 'Todos os sistemas operacionais.',
};

const fr: Dict = {
  buyCrypto: 'Acheter Crypto', markets: 'Marchés', trade: 'Trader', futures: 'Futures', earn: 'Gagner', sports: 'Sports',
  spot: 'Spot', aiTradingBot: 'Bot de trading IA', mining: 'Minage', aiBot: 'Bot IA',
  login: 'Connexion', signup: "S'inscrire", deposit: 'Déposer',
  searchPlaceholder: 'Rechercher une crypto', noResults: 'Aucun résultat', language: 'Langue', getApp: "Obtenir l'app", scanToTrade: 'Scannez pour trader sur mobile',
  colAbout: 'À propos', colProducts: 'Produits', colService: 'Services', colSupport: 'Assistance', colLearn: 'Apprendre',
  footerDesc: "La plateforme d'échange d'actifs numériques de classe mondiale. Tradez Bitcoin, Ethereum et plus de 350 cryptomonnaies en toute confiance.",
  rights: 'Tous droits réservés.',
  about: 'À propos', careers: 'Carrières', announcements: 'Annonces', news: 'Actualités', press: 'Presse', community: 'Communauté',
  affiliate: 'Affiliation', referral: 'Parrainage', fees: 'Frais', tradingRules: 'Règles de trading', status: 'Statut',
  helpCenter: "Centre d'aide", chatSupport: 'Chat 24/7', submitRequest: 'Envoyer une demande', lawEnforcement: 'Autorités', notices: 'Avis',
  buyBitcoin: 'Acheter Bitcoin', buyEthereum: 'Acheter Ethereum', cryptoGlossary: 'Glossaire crypto', tradingGuide: 'Guide de trading', marketsOverview: 'Aperçu des marchés',
  terms: 'Conditions', privacy: 'Confidentialité', cookies: 'Cookies', riskWarning: 'Avertissement sur les risques',
  close: 'Fermer', comingSoon: 'Les informations détaillées seront bientôt disponibles.', statusOk: 'Tous les systèmes opérationnels.',
};

const de: Dict = {
  buyCrypto: 'Krypto kaufen', markets: 'Märkte', trade: 'Handeln', futures: 'Futures', earn: 'Verdienen', sports: 'Sport',
  spot: 'Spot', aiTradingBot: 'KI-Trading-Bot', mining: 'Mining', aiBot: 'KI-Bot',
  login: 'Anmelden', signup: 'Registrieren', deposit: 'Einzahlen',
  searchPlaceholder: 'Coin oder Paar suchen', noResults: 'Keine Ergebnisse', language: 'Sprache', getApp: 'App holen', scanToTrade: 'Scannen, um mobil zu handeln',
  colAbout: 'Über uns', colProducts: 'Produkte', colService: 'Service', colSupport: 'Support', colLearn: 'Lernen',
  footerDesc: 'Die erstklassige Börse für digitale Vermögenswerte. Handeln Sie Bitcoin, Ethereum und über 350 Kryptowährungen mit Vertrauen.',
  rights: 'Alle Rechte vorbehalten.',
  about: 'Über uns', careers: 'Karriere', announcements: 'Ankündigungen', news: 'Neuigkeiten', press: 'Presse', community: 'Community',
  affiliate: 'Partnerprogramm', referral: 'Empfehlung', fees: 'Gebühren', tradingRules: 'Handelsregeln', status: 'Status',
  helpCenter: 'Hilfecenter', chatSupport: '24/7-Chat', submitRequest: 'Anfrage senden', lawEnforcement: 'Strafverfolgung', notices: 'Hinweise',
  buyBitcoin: 'Bitcoin kaufen', buyEthereum: 'Ethereum kaufen', cryptoGlossary: 'Krypto-Glossar', tradingGuide: 'Trading-Leitfaden', marketsOverview: 'Marktübersicht',
  terms: 'Bedingungen', privacy: 'Datenschutz', cookies: 'Cookies', riskWarning: 'Risikohinweis',
  close: 'Schließen', comingSoon: 'Detaillierte Informationen folgen in Kürze.', statusOk: 'Alle Systeme betriebsbereit.',
};

const it: Dict = {
  buyCrypto: 'Compra Cripto', markets: 'Mercati', trade: 'Fai trading', futures: 'Futures', earn: 'Guadagna', sports: 'Sport',
  spot: 'Spot', aiTradingBot: 'Bot di trading IA', mining: 'Mining', aiBot: 'Bot IA',
  login: 'Accedi', signup: 'Registrati', deposit: 'Deposita',
  searchPlaceholder: 'Cerca moneta o coppia', noResults: 'Nessun risultato', language: 'Lingua', getApp: "Scarica l'app", scanToTrade: 'Scansiona per fare trading su mobile',
  colAbout: 'Chi siamo', colProducts: 'Prodotti', colService: 'Servizi', colSupport: 'Supporto', colLearn: 'Impara',
  footerDesc: 'La borsa di asset digitali di livello mondiale. Fai trading di Bitcoin, Ethereum e oltre 350 criptovalute con fiducia.',
  rights: 'Tutti i diritti riservati.',
  about: 'Chi siamo', careers: 'Carriere', announcements: 'Annunci', news: 'Notizie', press: 'Stampa', community: 'Community',
  affiliate: 'Affiliazione', referral: 'Referral', fees: 'Commissioni', tradingRules: 'Regole di trading', status: 'Stato',
  helpCenter: 'Centro assistenza', chatSupport: 'Chat 24/7', submitRequest: 'Invia richiesta', lawEnforcement: 'Forze dell\'ordine', notices: 'Avvisi',
  buyBitcoin: 'Compra Bitcoin', buyEthereum: 'Compra Ethereum', cryptoGlossary: 'Glossario cripto', tradingGuide: 'Guida al trading', marketsOverview: 'Panoramica mercati',
  terms: 'Termini', privacy: 'Privacy', cookies: 'Cookie', riskWarning: 'Avviso di rischio',
  close: 'Chiudi', comingSoon: 'Informazioni dettagliate saranno presto disponibili.', statusOk: 'Tutti i sistemi operativi.',
};

const ru: Dict = {
  buyCrypto: 'Купить крипто', markets: 'Рынки', trade: 'Торговля', futures: 'Фьючерсы', earn: 'Заработок', sports: 'Спорт',
  spot: 'Спот', aiTradingBot: 'ИИ торговый бот', mining: 'Майнинг', aiBot: 'ИИ-бот',
  login: 'Войти', signup: 'Регистрация', deposit: 'Пополнить',
  searchPlaceholder: 'Поиск монеты или пары', noResults: 'Нет результатов', language: 'Язык', getApp: 'Скачать приложение', scanToTrade: 'Сканируйте для торговли на телефоне',
  colAbout: 'О нас', colProducts: 'Продукты', colService: 'Сервисы', colSupport: 'Поддержка', colLearn: 'Обучение',
  footerDesc: 'Биржа цифровых активов мирового класса. Торгуйте Bitcoin, Ethereum и более чем 350 криптовалютами с уверенностью.',
  rights: 'Все права защищены.',
  about: 'О нас', careers: 'Карьера', announcements: 'Объявления', news: 'Новости', press: 'Пресса', community: 'Сообщество',
  affiliate: 'Партнёрам', referral: 'Рефералы', fees: 'Комиссии', tradingRules: 'Правила торговли', status: 'Статус',
  helpCenter: 'Центр помощи', chatSupport: 'Чат 24/7', submitRequest: 'Создать запрос', lawEnforcement: 'Правоохранителям', notices: 'Уведомления',
  buyBitcoin: 'Купить Bitcoin', buyEthereum: 'Купить Ethereum', cryptoGlossary: 'Крипто-словарь', tradingGuide: 'Руководство по торговле', marketsOverview: 'Обзор рынков',
  terms: 'Условия', privacy: 'Конфиденциальность', cookies: 'Cookie', riskWarning: 'Предупреждение о рисках',
  close: 'Закрыть', comingSoon: 'Подробная информация появится в ближайшее время.', statusOk: 'Все системы работают.',
};

const ar: Dict = {
  buyCrypto: 'شراء العملات', markets: 'الأسواق', trade: 'تداول', futures: 'العقود الآجلة', earn: 'اربح', sports: 'الرياضة',
  spot: 'الفوري', aiTradingBot: 'روبوت تداول AI', mining: 'التعدين', aiBot: 'روبوت AI',
  login: 'تسجيل الدخول', signup: 'إنشاء حساب', deposit: 'إيداع',
  searchPlaceholder: 'ابحث عن عملة أو زوج', noResults: 'لا نتائج', language: 'اللغة', getApp: 'احصل على التطبيق', scanToTrade: 'امسح للتداول على الجوال',
  colAbout: 'من نحن', colProducts: 'المنتجات', colService: 'الخدمات', colSupport: 'الدعم', colLearn: 'تعلّم',
  footerDesc: 'منصة تداول الأصول الرقمية عالمية المستوى. تداول Bitcoin وEthereum وأكثر من 350 عملة رقمية بثقة.',
  rights: 'جميع الحقوق محفوظة.',
  about: 'حول', careers: 'الوظائف', announcements: 'الإعلانات', news: 'الأخبار', press: 'الصحافة', community: 'المجتمع',
  affiliate: 'الشراكة', referral: 'الإحالة', fees: 'الرسوم', tradingRules: 'قواعد التداول', status: 'الحالة',
  helpCenter: 'مركز المساعدة', chatSupport: 'دردشة 24/7', submitRequest: 'إرسال طلب', lawEnforcement: 'الجهات القانونية', notices: 'الإشعارات',
  buyBitcoin: 'شراء Bitcoin', buyEthereum: 'شراء Ethereum', cryptoGlossary: 'قاموس الكريبتو', tradingGuide: 'دليل التداول', marketsOverview: 'نظرة على الأسواق',
  terms: 'الشروط', privacy: 'الخصوصية', cookies: 'الكوكيز', riskWarning: 'تحذير المخاطر',
  close: 'إغلاق', comingSoon: 'ستتوفر المعلومات التفصيلية قريبًا.', statusOk: 'جميع الأنظمة تعمل.',
};

const zh: Dict = {
  buyCrypto: '购买加密货币', markets: '行情', trade: '交易', futures: '合约', earn: '赚币', sports: '体育',
  spot: '现货', aiTradingBot: 'AI 交易机器人', mining: '挖矿', aiBot: 'AI 机器人',
  login: '登录', signup: '注册', deposit: '充值',
  searchPlaceholder: '搜索币种或交易对', noResults: '无结果', language: '语言', getApp: '获取应用', scanToTrade: '扫码在手机上交易',
  colAbout: '关于我们', colProducts: '产品', colService: '服务', colSupport: '支持', colLearn: '学习',
  footerDesc: '世界一流的数字资产交易所。安心交易比特币、以太坊及 350+ 种加密货币。',
  rights: '版权所有。',
  about: '关于', careers: '招聘', announcements: '公告', news: '新闻', press: '媒体', community: '社区',
  affiliate: '联盟计划', referral: '推荐', fees: '费率', tradingRules: '交易规则', status: '系统状态',
  helpCenter: '帮助中心', chatSupport: '24/7 在线客服', submitRequest: '提交请求', lawEnforcement: '执法协助', notices: '通知',
  buyBitcoin: '购买比特币', buyEthereum: '购买以太坊', cryptoGlossary: '加密词汇表', tradingGuide: '交易指南', marketsOverview: '市场概览',
  terms: '条款', privacy: '隐私', cookies: 'Cookie', riskWarning: '风险提示',
  close: '关闭', comingSoon: '详细信息即将上线。', statusOk: '所有系统运行正常。',
};

const zhTW: Dict = {
  buyCrypto: '購買加密貨幣', markets: '行情', trade: '交易', futures: '合約', earn: '賺幣', sports: '體育',
  spot: '現貨', aiTradingBot: 'AI 交易機器人', mining: '挖礦', aiBot: 'AI 機器人',
  login: '登入', signup: '註冊', deposit: '充值',
  searchPlaceholder: '搜尋幣種或交易對', noResults: '無結果', language: '語言', getApp: '取得應用程式', scanToTrade: '掃碼在手機上交易',
  colAbout: '關於我們', colProducts: '產品', colService: '服務', colSupport: '支援', colLearn: '學習',
  footerDesc: '世界一流的數位資產交易所。安心交易比特幣、以太坊及 350+ 種加密貨幣。',
  rights: '版權所有。',
  about: '關於', careers: '招聘', announcements: '公告', news: '新聞', press: '媒體', community: '社群',
  affiliate: '聯盟計畫', referral: '推薦', fees: '費率', tradingRules: '交易規則', status: '系統狀態',
  helpCenter: '幫助中心', chatSupport: '24/7 線上客服', submitRequest: '提交請求', lawEnforcement: '執法協助', notices: '通知',
  buyBitcoin: '購買比特幣', buyEthereum: '購買以太坊', cryptoGlossary: '加密詞彙表', tradingGuide: '交易指南', marketsOverview: '市場概覽',
  terms: '條款', privacy: '隱私', cookies: 'Cookie', riskWarning: '風險提示',
  close: '關閉', comingSoon: '詳細資訊即將上線。', statusOk: '所有系統運行正常。',
};

const ja: Dict = {
  buyCrypto: '暗号資産を購入', markets: 'マーケット', trade: '取引', futures: '先物', earn: '稼ぐ', sports: 'スポーツ',
  spot: '現物', aiTradingBot: 'AIトレードボット', mining: 'マイニング', aiBot: 'AIボット',
  login: 'ログイン', signup: '登録', deposit: '入金',
  searchPlaceholder: '銘柄やペアを検索', noResults: '結果なし', language: '言語', getApp: 'アプリを入手', scanToTrade: 'スキャンしてモバイルで取引',
  colAbout: '会社情報', colProducts: 'プロダクト', colService: 'サービス', colSupport: 'サポート', colLearn: '学ぶ',
  footerDesc: '世界トップクラスのデジタル資産取引所。Bitcoin、Ethereum、350以上の暗号資産を安心して取引できます。',
  rights: '全著作権所有。',
  about: '概要', careers: '採用', announcements: 'お知らせ', news: 'ニュース', press: 'プレス', community: 'コミュニティ',
  affiliate: 'アフィリエイト', referral: '紹介', fees: '手数料', tradingRules: '取引ルール', status: 'ステータス',
  helpCenter: 'ヘルプセンター', chatSupport: '24時間チャット', submitRequest: 'リクエスト送信', lawEnforcement: '法執行機関', notices: 'お知らせ',
  buyBitcoin: 'Bitcoinを購入', buyEthereum: 'Ethereumを購入', cryptoGlossary: '暗号用語集', tradingGuide: '取引ガイド', marketsOverview: 'マーケット概要',
  terms: '規約', privacy: 'プライバシー', cookies: 'Cookie', riskWarning: 'リスク警告',
  close: '閉じる', comingSoon: '詳細情報は近日公開予定です。', statusOk: 'すべてのシステムが正常です。',
};

const ko: Dict = {
  buyCrypto: '암호화폐 구매', markets: '마켓', trade: '거래', futures: '선물', earn: '수익', sports: '스포츠',
  spot: '현물', aiTradingBot: 'AI 트레이딩 봇', mining: '채굴', aiBot: 'AI 봇',
  login: '로그인', signup: '가입', deposit: '입금',
  searchPlaceholder: '코인 또는 페어 검색', noResults: '결과 없음', language: '언어', getApp: '앱 다운로드', scanToTrade: '스캔하여 모바일에서 거래',
  colAbout: '회사 소개', colProducts: '상품', colService: '서비스', colSupport: '지원', colLearn: '학습',
  footerDesc: '세계적 수준의 디지털 자산 거래소. Bitcoin, Ethereum 및 350개 이상의 암호화폐를 안심하고 거래하세요.',
  rights: '모든 권리 보유.',
  about: '소개', careers: '채용', announcements: '공지', news: '뉴스', press: '보도자료', community: '커뮤니티',
  affiliate: '제휴', referral: '추천', fees: '수수료', tradingRules: '거래 규칙', status: '상태',
  helpCenter: '고객센터', chatSupport: '24/7 채팅', submitRequest: '요청 제출', lawEnforcement: '법 집행', notices: '공지사항',
  buyBitcoin: 'Bitcoin 구매', buyEthereum: 'Ethereum 구매', cryptoGlossary: '암호화폐 용어집', tradingGuide: '거래 가이드', marketsOverview: '마켓 개요',
  terms: '약관', privacy: '개인정보', cookies: '쿠키', riskWarning: '위험 경고',
  close: '닫기', comingSoon: '자세한 정보가 곧 제공됩니다.', statusOk: '모든 시스템 정상.',
};

const hi: Dict = {
  buyCrypto: 'क्रिप्टो खरीदें', markets: 'मार्केट', trade: 'ट्रेड', futures: 'फ्यूचर्स', earn: 'कमाएँ', sports: 'खेल',
  spot: 'स्पॉट', aiTradingBot: 'AI ट्रेडिंग बॉट', mining: 'माइनिंग', aiBot: 'AI बॉट',
  login: 'लॉग इन', signup: 'साइन अप', deposit: 'जमा करें',
  searchPlaceholder: 'कॉइन या पेयर खोजें', noResults: 'कोई परिणाम नहीं', language: 'भाषा', getApp: 'ऐप पाएं', scanToTrade: 'मोबाइल पर ट्रेड के लिए स्कैन करें',
  colAbout: 'हमारे बारे में', colProducts: 'उत्पाद', colService: 'सेवाएँ', colSupport: 'सहायता', colLearn: 'सीखें',
  footerDesc: 'विश्वस्तरीय डिजिटल एसेट एक्सचेंज। Bitcoin, Ethereum और 350+ क्रिप्टोकरेंसी आत्मविश्वास से ट्रेड करें।',
  rights: 'सर्वाधिकार सुरक्षित।',
  about: 'परिचय', careers: 'करियर', announcements: 'घोषणाएँ', news: 'समाचार', press: 'प्रेस', community: 'समुदाय',
  affiliate: 'एफिलिएट', referral: 'रेफरल', fees: 'शुल्क', tradingRules: 'ट्रेडिंग नियम', status: 'स्थिति',
  helpCenter: 'सहायता केंद्र', chatSupport: '24/7 चैट', submitRequest: 'अनुरोध भेजें', lawEnforcement: 'कानून प्रवर्तन', notices: 'सूचनाएँ',
  buyBitcoin: 'Bitcoin खरीदें', buyEthereum: 'Ethereum खरीदें', cryptoGlossary: 'क्रिप्टो शब्दावली', tradingGuide: 'ट्रेडिंग गाइड', marketsOverview: 'मार्केट अवलोकन',
  terms: 'शर्तें', privacy: 'गोपनीयता', cookies: 'कुकीज़', riskWarning: 'जोखिम चेतावनी',
  close: 'बंद करें', comingSoon: 'विस्तृत जानकारी जल्द उपलब्ध होगी।', statusOk: 'सभी सिस्टम चालू हैं।',
};

const id: Dict = {
  buyCrypto: 'Beli Kripto', markets: 'Pasar', trade: 'Trading', futures: 'Futures', earn: 'Hasilkan', sports: 'Olahraga',
  spot: 'Spot', aiTradingBot: 'Bot Trading AI', mining: 'Mining', aiBot: 'Bot AI',
  login: 'Masuk', signup: 'Daftar', deposit: 'Setor',
  searchPlaceholder: 'Cari koin atau pasangan', noResults: 'Tidak ada hasil', language: 'Bahasa', getApp: 'Dapatkan aplikasi', scanToTrade: 'Pindai untuk trading di ponsel',
  colAbout: 'Tentang Kami', colProducts: 'Produk', colService: 'Layanan', colSupport: 'Dukungan', colLearn: 'Belajar',
  footerDesc: 'Bursa aset digital kelas dunia. Trading Bitcoin, Ethereum, dan 350+ mata uang kripto dengan percaya diri.',
  rights: 'Semua hak dilindungi.',
  about: 'Tentang', careers: 'Karier', announcements: 'Pengumuman', news: 'Berita', press: 'Pers', community: 'Komunitas',
  affiliate: 'Afiliasi', referral: 'Referral', fees: 'Biaya', tradingRules: 'Aturan trading', status: 'Status',
  helpCenter: 'Pusat Bantuan', chatSupport: 'Chat 24/7', submitRequest: 'Kirim Permintaan', lawEnforcement: 'Penegak Hukum', notices: 'Pemberitahuan',
  buyBitcoin: 'Beli Bitcoin', buyEthereum: 'Beli Ethereum', cryptoGlossary: 'Glosarium Kripto', tradingGuide: 'Panduan Trading', marketsOverview: 'Ikhtisar Pasar',
  terms: 'Ketentuan', privacy: 'Privasi', cookies: 'Cookie', riskWarning: 'Peringatan Risiko',
  close: 'Tutup', comingSoon: 'Informasi detail akan segera tersedia.', statusOk: 'Semua sistem beroperasi.',
};

const vi: Dict = {
  buyCrypto: 'Mua Crypto', markets: 'Thị trường', trade: 'Giao dịch', futures: 'Hợp đồng tương lai', earn: 'Kiếm tiền', sports: 'Thể thao',
  spot: 'Spot', aiTradingBot: 'Bot giao dịch AI', mining: 'Đào coin', aiBot: 'Bot AI',
  login: 'Đăng nhập', signup: 'Đăng ký', deposit: 'Nạp tiền',
  searchPlaceholder: 'Tìm coin hoặc cặp', noResults: 'Không có kết quả', language: 'Ngôn ngữ', getApp: 'Tải ứng dụng', scanToTrade: 'Quét để giao dịch trên di động',
  colAbout: 'Về chúng tôi', colProducts: 'Sản phẩm', colService: 'Dịch vụ', colSupport: 'Hỗ trợ', colLearn: 'Học',
  footerDesc: 'Sàn giao dịch tài sản số đẳng cấp thế giới. Giao dịch Bitcoin, Ethereum và hơn 350 loại tiền mã hóa một cách tự tin.',
  rights: 'Bảo lưu mọi quyền.',
  about: 'Giới thiệu', careers: 'Tuyển dụng', announcements: 'Thông báo', news: 'Tin tức', press: 'Báo chí', community: 'Cộng đồng',
  affiliate: 'Đối tác', referral: 'Giới thiệu', fees: 'Phí', tradingRules: 'Quy tắc giao dịch', status: 'Trạng thái',
  helpCenter: 'Trung tâm trợ giúp', chatSupport: 'Chat 24/7', submitRequest: 'Gửi yêu cầu', lawEnforcement: 'Cơ quan thực thi', notices: 'Thông báo',
  buyBitcoin: 'Mua Bitcoin', buyEthereum: 'Mua Ethereum', cryptoGlossary: 'Thuật ngữ crypto', tradingGuide: 'Hướng dẫn giao dịch', marketsOverview: 'Tổng quan thị trường',
  terms: 'Điều khoản', privacy: 'Quyền riêng tư', cookies: 'Cookie', riskWarning: 'Cảnh báo rủi ro',
  close: 'Đóng', comingSoon: 'Thông tin chi tiết sẽ sớm có.', statusOk: 'Tất cả hệ thống hoạt động.',
};

const th: Dict = {
  buyCrypto: 'ซื้อคริปโต', markets: 'ตลาด', trade: 'เทรด', futures: 'ฟิวเจอร์ส', earn: 'รับรายได้', sports: 'กีฬา',
  spot: 'สปอต', aiTradingBot: 'บอทเทรด AI', mining: 'ขุดเหรียญ', aiBot: 'บอท AI',
  login: 'เข้าสู่ระบบ', signup: 'สมัคร', deposit: 'ฝากเงิน',
  searchPlaceholder: 'ค้นหาเหรียญหรือคู่', noResults: 'ไม่พบผลลัพธ์', language: 'ภาษา', getApp: 'รับแอป', scanToTrade: 'สแกนเพื่อเทรดบนมือถือ',
  colAbout: 'เกี่ยวกับเรา', colProducts: 'ผลิตภัณฑ์', colService: 'บริการ', colSupport: 'ช่วยเหลือ', colLearn: 'เรียนรู้',
  footerDesc: 'แพลตฟอร์มซื้อขายสินทรัพย์ดิจิทัลระดับโลก เทรด Bitcoin, Ethereum และคริปโตกว่า 350 สกุลอย่างมั่นใจ',
  rights: 'สงวนลิขสิทธิ์',
  about: 'เกี่ยวกับ', careers: 'ร่วมงาน', announcements: 'ประกาศ', news: 'ข่าว', press: 'สื่อ', community: 'ชุมชน',
  affiliate: 'พันธมิตร', referral: 'แนะนำเพื่อน', fees: 'ค่าธรรมเนียม', tradingRules: 'กฎการเทรด', status: 'สถานะ',
  helpCenter: 'ศูนย์ช่วยเหลือ', chatSupport: 'แชท 24/7', submitRequest: 'ส่งคำขอ', lawEnforcement: 'หน่วยงานบังคับใช้กฎหมาย', notices: 'ประกาศ',
  buyBitcoin: 'ซื้อ Bitcoin', buyEthereum: 'ซื้อ Ethereum', cryptoGlossary: 'อภิธานคริปโต', tradingGuide: 'คู่มือการเทรด', marketsOverview: 'ภาพรวมตลาด',
  terms: 'ข้อกำหนด', privacy: 'ความเป็นส่วนตัว', cookies: 'คุกกี้', riskWarning: 'คำเตือนความเสี่ยง',
  close: 'ปิด', comingSoon: 'ข้อมูลรายละเอียดจะพร้อมเร็ว ๆ นี้', statusOk: 'ทุกระบบทำงานปกติ',
};

const nl: Dict = {
  buyCrypto: 'Crypto kopen', markets: 'Markten', trade: 'Handelen', futures: 'Futures', earn: 'Verdienen', sports: 'Sport',
  spot: 'Spot', aiTradingBot: 'AI-handelsbot', mining: 'Mining', aiBot: 'AI-bot',
  login: 'Inloggen', signup: 'Registreren', deposit: 'Storten',
  searchPlaceholder: 'Zoek munt of paar', noResults: 'Geen resultaten', language: 'Taal', getApp: 'App downloaden', scanToTrade: 'Scan om mobiel te handelen',
  colAbout: 'Over ons', colProducts: 'Producten', colService: 'Service', colSupport: 'Ondersteuning', colLearn: 'Leren',
  footerDesc: 'De toonaangevende beurs voor digitale activa. Handel met vertrouwen in Bitcoin, Ethereum en 350+ cryptovaluta.',
  rights: 'Alle rechten voorbehouden.',
  about: 'Over', careers: 'Vacatures', announcements: 'Aankondigingen', news: 'Nieuws', press: 'Pers', community: 'Community',
  affiliate: 'Affiliate', referral: 'Verwijzing', fees: 'Kosten', tradingRules: 'Handelsregels', status: 'Status',
  helpCenter: 'Helpcentrum', chatSupport: '24/7 chat', submitRequest: 'Verzoek indienen', lawEnforcement: 'Rechtshandhaving', notices: 'Meldingen',
  buyBitcoin: 'Bitcoin kopen', buyEthereum: 'Ethereum kopen', cryptoGlossary: 'Cryptowoordenlijst', tradingGuide: 'Handelsgids', marketsOverview: 'Marktoverzicht',
  terms: 'Voorwaarden', privacy: 'Privacy', cookies: 'Cookies', riskWarning: 'Risicowaarschuwing',
  close: 'Sluiten', comingSoon: 'Gedetailleerde informatie is binnenkort beschikbaar.', statusOk: 'Alle systemen operationeel.',
};

const pl: Dict = {
  buyCrypto: 'Kup krypto', markets: 'Rynki', trade: 'Handel', futures: 'Kontrakty', earn: 'Zarabiaj', sports: 'Sport',
  spot: 'Spot', aiTradingBot: 'Bot handlowy AI', mining: 'Kopanie', aiBot: 'Bot AI',
  login: 'Zaloguj', signup: 'Zarejestruj', deposit: 'Wpłać',
  searchPlaceholder: 'Szukaj monety lub pary', noResults: 'Brak wyników', language: 'Język', getApp: 'Pobierz aplikację', scanToTrade: 'Zeskanuj, aby handlować na telefonie',
  colAbout: 'O nas', colProducts: 'Produkty', colService: 'Usługi', colSupport: 'Wsparcie', colLearn: 'Naucz się',
  footerDesc: 'Światowej klasy giełda aktywów cyfrowych. Handluj Bitcoinem, Ethereum i ponad 350 kryptowalutami z pewnością.',
  rights: 'Wszelkie prawa zastrzeżone.',
  about: 'O nas', careers: 'Kariera', announcements: 'Ogłoszenia', news: 'Aktualności', press: 'Prasa', community: 'Społeczność',
  affiliate: 'Program partnerski', referral: 'Polecenia', fees: 'Opłaty', tradingRules: 'Zasady handlu', status: 'Status',
  helpCenter: 'Centrum pomocy', chatSupport: 'Czat 24/7', submitRequest: 'Wyślij zgłoszenie', lawEnforcement: 'Organy ścigania', notices: 'Powiadomienia',
  buyBitcoin: 'Kup Bitcoin', buyEthereum: 'Kup Ethereum', cryptoGlossary: 'Słownik krypto', tradingGuide: 'Poradnik handlu', marketsOverview: 'Przegląd rynków',
  terms: 'Warunki', privacy: 'Prywatność', cookies: 'Pliki cookie', riskWarning: 'Ostrzeżenie o ryzyku',
  close: 'Zamknij', comingSoon: 'Szczegółowe informacje wkrótce.', statusOk: 'Wszystkie systemy działają.',
};

const uk: Dict = {
  buyCrypto: 'Купити крипто', markets: 'Ринки', trade: 'Торгівля', futures: 'Фʼючерси', earn: 'Заробляй', sports: 'Спорт',
  spot: 'Спот', aiTradingBot: 'AI торговий бот', mining: 'Майнінг', aiBot: 'AI-бот',
  login: 'Увійти', signup: 'Реєстрація', deposit: 'Поповнити',
  searchPlaceholder: 'Пошук монети або пари', noResults: 'Немає результатів', language: 'Мова', getApp: 'Завантажити застосунок', scanToTrade: 'Скануйте для торгівлі на телефоні',
  colAbout: 'Про нас', colProducts: 'Продукти', colService: 'Сервіси', colSupport: 'Підтримка', colLearn: 'Навчання',
  footerDesc: 'Біржа цифрових активів світового рівня. Торгуйте Bitcoin, Ethereum та понад 350 криптовалютами впевнено.',
  rights: 'Усі права захищені.',
  about: 'Про нас', careers: 'Карʼєра', announcements: 'Оголошення', news: 'Новини', press: 'Преса', community: 'Спільнота',
  affiliate: 'Партнерам', referral: 'Реферали', fees: 'Комісії', tradingRules: 'Правила торгівлі', status: 'Статус',
  helpCenter: 'Центр допомоги', chatSupport: 'Чат 24/7', submitRequest: 'Створити запит', lawEnforcement: 'Правоохоронцям', notices: 'Сповіщення',
  buyBitcoin: 'Купити Bitcoin', buyEthereum: 'Купити Ethereum', cryptoGlossary: 'Крипто-словник', tradingGuide: 'Посібник з торгівлі', marketsOverview: 'Огляд ринків',
  terms: 'Умови', privacy: 'Конфіденційність', cookies: 'Cookie', riskWarning: 'Попередження про ризики',
  close: 'Закрити', comingSoon: 'Детальна інформація зʼявиться найближчим часом.', statusOk: 'Усі системи працюють.',
};

export const TRANSLATIONS: Record<string, Dict> = {
  en, tr, es, pt, fr, de, it, ru, ar, zh, 'zh-TW': zhTW, ja, ko, hi, id, vi, th, nl, pl, uk,
};

export const EN = en;
