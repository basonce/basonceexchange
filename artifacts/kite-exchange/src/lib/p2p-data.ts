export interface Country {
  code: string;
  name: string;
  currency: string;
  currencySymbol: string;
  flag: string;
  usdRate: number;
  paymentMethods: string[];
}

export interface P2PMerchant {
  id: string;
  username: string;
  avatar: string;
  trades: number;
  completion: number;
  verified: boolean;
  price: number;
  minLimit: number;
  maxLimit: number;
  available: number;
  paymentMethod: string;
  timeLimit: number;
  country: string;
  currency: string;
  onlineStatus: 'online' | 'recently';
}

export const COUNTRIES: Country[] = [
  { code: 'US', name: 'United States', currency: 'USD', currencySymbol: '$', flag: '🇺🇸', usdRate: 1.00, paymentMethods: ['Bank Transfer', 'Zelle', 'Venmo', 'Cash App', 'PayPal', 'Chase Bank', 'Wells Fargo'] },
  { code: 'TR', name: 'Turkey', currency: 'TRY', currencySymbol: '₺', flag: '🇹🇷', usdRate: 32.85, paymentMethods: ['Garanti Bank', 'İş Bankası', 'Akbank', 'Yapı Kredi', 'Vakıfbank', 'Halkbank', 'Ziraat Bankası', 'QNB Finansbank', 'TEB', 'DenizBank'] },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', currencySymbol: '£', flag: '🇬🇧', usdRate: 0.79, paymentMethods: ['Barclays', 'HSBC', 'Lloyds', 'Monzo', 'Starling Bank', 'Revolut', 'NatWest'] },
  { code: 'EU', name: 'European Union', currency: 'EUR', currencySymbol: '€', flag: '🇪🇺', usdRate: 0.92, paymentMethods: ['SEPA Transfer', 'Wise', 'Revolut', 'N26', 'ING Bank', 'Paysera'] },
  { code: 'NG', name: 'Nigeria', currency: 'NGN', currencySymbol: '₦', flag: '🇳🇬', usdRate: 1540.00, paymentMethods: ['GTBank', 'Access Bank', 'Zenith Bank', 'First Bank', 'UBA', 'Opay', 'Moniepoint'] },
  { code: 'IN', name: 'India', currency: 'INR', currencySymbol: '₹', flag: '🇮🇳', usdRate: 83.90, paymentMethods: ['UPI', 'Paytm', 'PhonePe', 'GPay', 'IMPS', 'NEFT', 'HDFC Bank', 'SBI'] },
  { code: 'CN', name: 'China', currency: 'CNY', currencySymbol: '¥', flag: '🇨🇳', usdRate: 7.24, paymentMethods: ['Alipay', 'WeChat Pay', 'Bank Transfer', 'ICBC', 'CCB'] },
  { code: 'RU', name: 'Russia', currency: 'RUB', currencySymbol: '₽', flag: '🇷🇺', usdRate: 91.50, paymentMethods: ['Sberbank', 'Tinkoff', 'Alfa Bank', 'VTB', 'SBP Transfer'] },
  { code: 'BR', name: 'Brazil', currency: 'BRL', currencySymbol: 'R$', flag: '🇧🇷', usdRate: 5.02, paymentMethods: ['PIX', 'Itaú', 'Bradesco', 'Nubank', 'Banco do Brasil'] },
  { code: 'PK', name: 'Pakistan', currency: 'PKR', currencySymbol: '₨', flag: '🇵🇰', usdRate: 278.50, paymentMethods: ['HBL', 'MCB Bank', 'JazzCash', 'Easypaisa', 'Bank Alfalah'] },
  { code: 'VN', name: 'Vietnam', currency: 'VND', currencySymbol: '₫', flag: '🇻🇳', usdRate: 25200.00, paymentMethods: ['Vietcombank', 'Momo', 'ZaloPay', 'VPBank', 'Techcombank'] },
  { code: 'PH', name: 'Philippines', currency: 'PHP', currencySymbol: '₱', flag: '🇵🇭', usdRate: 58.20, paymentMethods: ['GCash', 'Maya', 'BDO', 'BPI', 'UnionBank'] },
  { code: 'ID', name: 'Indonesia', currency: 'IDR', currencySymbol: 'Rp', flag: '🇮🇩', usdRate: 15750.00, paymentMethods: ['GoPay', 'OVO', 'DANA', 'BCA', 'Mandiri', 'BNI'] },
  { code: 'MX', name: 'Mexico', currency: 'MXN', currencySymbol: '$', flag: '🇲🇽', usdRate: 17.15, paymentMethods: ['SPEI', 'BBVA Mexico', 'Santander Mexico', 'Banamex', 'Banorte'] },
  { code: 'AR', name: 'Argentina', currency: 'ARS', currencySymbol: '$', flag: '🇦🇷', usdRate: 895.00, paymentMethods: ['Mercado Pago', 'Ualá', 'Banco Nación', 'Galicia', 'ICBC Argentina'] },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR', currencySymbol: 'R', flag: '🇿🇦', usdRate: 18.95, paymentMethods: ['FNB', 'Standard Bank', 'Nedbank', 'Absa', 'Capitec'] },
  { code: 'KE', name: 'Kenya', currency: 'KES', currencySymbol: 'KSh', flag: '🇰🇪', usdRate: 129.50, paymentMethods: ['M-Pesa', 'Equity Bank', 'KCB', 'Airtel Money'] },
  { code: 'GH', name: 'Ghana', currency: 'GHS', currencySymbol: 'GH₵', flag: '🇬🇭', usdRate: 14.80, paymentMethods: ['MTN Mobile Money', 'Vodafone Cash', 'GCB Bank', 'Ecobank'] },
  { code: 'EG', name: 'Egypt', currency: 'EGP', currencySymbol: 'E£', flag: '🇪🇬', usdRate: 47.85, paymentMethods: ['Vodafone Cash', 'CIB', 'NBE', 'InstaPay', 'Fawry'] },
  { code: 'MA', name: 'Morocco', currency: 'MAD', currencySymbol: 'MAD', flag: '🇲🇦', usdRate: 9.98, paymentMethods: ['CIH Bank', 'Attijariwafa', 'BMCE Bank', 'Orange Money'] },
  { code: 'KZ', name: 'Kazakhstan', currency: 'KZT', currencySymbol: '₸', flag: '🇰🇿', usdRate: 449.50, paymentMethods: ['Kaspi Bank', 'Halyk Bank', 'ForteBank'] },
  { code: 'UA', name: 'Ukraine', currency: 'UAH', currencySymbol: '₴', flag: '🇺🇦', usdRate: 38.20, paymentMethods: ['PrivatBank', 'Monobank', 'Ukrsibbank', 'PUMB'] },
  { code: 'TH', name: 'Thailand', currency: 'THB', currencySymbol: '฿', flag: '🇹🇭', usdRate: 35.80, paymentMethods: ['PromptPay', 'SCB', 'Kasikorn Bank', 'Bangkok Bank', 'TrueMoney'] },
  { code: 'MY', name: 'Malaysia', currency: 'MYR', currencySymbol: 'RM', flag: '🇲🇾', usdRate: 4.72, paymentMethods: ['DuitNow', 'Maybank', 'CIMB', 'Touch n Go', 'Boost'] },
  { code: 'SG', name: 'Singapore', currency: 'SGD', currencySymbol: 'S$', flag: '🇸🇬', usdRate: 1.35, paymentMethods: ['PayNow', 'DBS', 'OCBC', 'UOB', 'GrabPay'] },
  { code: 'AE', name: 'UAE', currency: 'AED', currencySymbol: 'د.إ', flag: '🇦🇪', usdRate: 3.67, paymentMethods: ['Emirates NBD', 'FAB', 'ADCB', 'Mashreq', 'Bank Transfer'] },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR', currencySymbol: '﷼', flag: '🇸🇦', usdRate: 3.75, paymentMethods: ['STC Pay', 'Al Rajhi Bank', 'NCB', 'Riyad Bank', 'SABB'] },
  { code: 'BD', name: 'Bangladesh', currency: 'BDT', currencySymbol: '৳', flag: '🇧🇩', usdRate: 110.50, paymentMethods: ['bKash', 'Nagad', 'Rocket', 'Dutch Bangla Bank'] },
  { code: 'NP', name: 'Nepal', currency: 'NPR', currencySymbol: '₨', flag: '🇳🇵', usdRate: 133.50, paymentMethods: ['eSewa', 'Khalti', 'IME Pay', 'NIC Asia Bank'] },
  { code: 'LK', name: 'Sri Lanka', currency: 'LKR', currencySymbol: '₨', flag: '🇱🇰', usdRate: 298.00, paymentMethods: ['Bank Transfer', 'Dialog genie', 'eZCash', 'Sampath Bank'] },
  { code: 'MN', name: 'Mongolia', currency: 'MNT', currencySymbol: '₮', flag: '🇲🇳', usdRate: 3415.00, paymentMethods: ['Golomt Bank', 'Khan Bank', 'TDB', 'Monpay'] },
  { code: 'KH', name: 'Cambodia', currency: 'KHR', currencySymbol: '៛', flag: '🇰🇭', usdRate: 4090.00, paymentMethods: ['Wing', 'Pi Pay', 'ACLEDA Bank', 'ABA Bank'] },
  { code: 'MM', name: 'Myanmar', currency: 'MMK', currencySymbol: 'K', flag: '🇲🇲', usdRate: 2100.00, paymentMethods: ['KBZ Pay', 'Wave Money', 'CB Pay', 'OK Dollar'] },
  { code: 'KR', name: 'South Korea', currency: 'KRW', currencySymbol: '₩', flag: '🇰🇷', usdRate: 1325.00, paymentMethods: ['Kakao Pay', 'Toss', 'Kookmin Bank', 'Shinhan Bank', 'KEB Hana'] },
  { code: 'JP', name: 'Japan', currency: 'JPY', currencySymbol: '¥', flag: '🇯🇵', usdRate: 153.20, paymentMethods: ['PayPay', 'LINE Pay', 'Mizuho Bank', 'SMBC', 'Bank Transfer'] },
  { code: 'AU', name: 'Australia', currency: 'AUD', currencySymbol: 'A$', flag: '🇦🇺', usdRate: 1.54, paymentMethods: ['PayID', 'CommBank', 'ANZ', 'Westpac', 'NAB', 'Osko'] },
  { code: 'CA', name: 'Canada', currency: 'CAD', currencySymbol: 'C$', flag: '🇨🇦', usdRate: 1.36, paymentMethods: ['Interac', 'TD Bank', 'RBC', 'Scotiabank', 'BMO'] },
  { code: 'CH', name: 'Switzerland', currency: 'CHF', currencySymbol: 'Fr', flag: '🇨🇭', usdRate: 0.90, paymentMethods: ['TWINT', 'PostFinance', 'UBS', 'Credit Suisse', 'Raiffeisen'] },
  { code: 'NO', name: 'Norway', currency: 'NOK', currencySymbol: 'kr', flag: '🇳🇴', usdRate: 10.75, paymentMethods: ['Vipps', 'DNB', 'Nordea', 'SpareBank', 'Bank Transfer'] },
  { code: 'SE', name: 'Sweden', currency: 'SEK', currencySymbol: 'kr', flag: '🇸🇪', usdRate: 10.55, paymentMethods: ['Swish', 'Klarna', 'Nordea', 'SEB', 'Handelsbanken'] },
  { code: 'DK', name: 'Denmark', currency: 'DKK', currencySymbol: 'kr', flag: '🇩🇰', usdRate: 6.88, paymentMethods: ['MobilePay', 'Danske Bank', 'Nordea', 'Jyske Bank'] },
  { code: 'PL', name: 'Poland', currency: 'PLN', currencySymbol: 'zł', flag: '🇵🇱', usdRate: 3.98, paymentMethods: ['BLIK', 'PKO BP', 'mBank', 'ING Bank Slaski', 'Santander Poland'] },
  { code: 'CZ', name: 'Czech Republic', currency: 'CZK', currencySymbol: 'Kč', flag: '🇨🇿', usdRate: 23.20, paymentMethods: ['Česká spořitelna', 'KB', 'Revolut', 'Bank Transfer'] },
  { code: 'HU', name: 'Hungary', currency: 'HUF', currencySymbol: 'Ft', flag: '🇭🇺', usdRate: 360.50, paymentMethods: ['OTP Bank', 'K&H Bank', 'Raiffeisen Hungary', 'Revolut'] },
  { code: 'RO', name: 'Romania', currency: 'RON', currencySymbol: 'lei', flag: '🇷🇴', usdRate: 4.69, paymentMethods: ['BCR', 'BRD', 'ING Romania', 'Revolut', 'Bank Transfer'] },
  { code: 'BG', name: 'Bulgaria', currency: 'BGN', currencySymbol: 'лв', flag: '🇧🇬', usdRate: 1.80, paymentMethods: ['UniCredit Bulbank', 'DSK Bank', 'Bank Transfer'] },
  { code: 'HR', name: 'Croatia', currency: 'EUR', currencySymbol: '€', flag: '🇭🇷', usdRate: 0.92, paymentMethods: ['Zagrebačka banka', 'Privredna banka', 'SEPA Transfer'] },
  { code: 'RS', name: 'Serbia', currency: 'RSD', currencySymbol: 'дин', flag: '🇷🇸', usdRate: 107.50, paymentMethods: ['Banca Intesa', 'Raiffeisen Serbia', 'Bank Transfer'] },
  { code: 'GE', name: 'Georgia', currency: 'GEL', currencySymbol: '₾', flag: '🇬🇪', usdRate: 2.69, paymentMethods: ['Bank of Georgia', 'TBC Bank', 'Liberty Bank'] },
  { code: 'AM', name: 'Armenia', currency: 'AMD', currencySymbol: '֏', flag: '🇦🇲', usdRate: 388.50, paymentMethods: ['Ameriabank', 'ACBA Bank', 'IDBank', 'Ineco Bank'] },
  { code: 'AZ', name: 'Azerbaijan', currency: 'AZN', currencySymbol: '₼', flag: '🇦🇿', usdRate: 1.70, paymentMethods: ['ABB', 'Kapital Bank', 'Pasha Bank', 'PAYM'] },
  { code: 'UZ', name: 'Uzbekistan', currency: 'UZS', currencySymbol: 'сўм', flag: '🇺🇿', usdRate: 12600.00, paymentMethods: ['Click', 'Payme', 'Uzcard', 'Humo', 'Bank Transfer'] },
  { code: 'MK', name: 'North Macedonia', currency: 'MKD', currencySymbol: 'ден', flag: '🇲🇰', usdRate: 56.80, paymentMethods: ['Komercijalna Banka', 'NLB Banka', 'Bank Transfer'] },
  { code: 'TZ', name: 'Tanzania', currency: 'TZS', currencySymbol: 'TSh', flag: '🇹🇿', usdRate: 2560.00, paymentMethods: ['M-Pesa Tanzania', 'Tigo Pesa', 'Airtel Money', 'CRDB Bank'] },
  { code: 'UG', name: 'Uganda', currency: 'UGX', currencySymbol: 'USh', flag: '🇺🇬', usdRate: 3775.00, paymentMethods: ['MTN Mobile Money', 'Airtel Money Uganda', 'Stanbic Bank'] },
  { code: 'ET', name: 'Ethiopia', currency: 'ETB', currencySymbol: 'Br', flag: '🇪🇹', usdRate: 57.50, paymentMethods: ['Commercial Bank of Ethiopia', 'Dashen Bank', 'CBE Birr'] },
  { code: 'SN', name: 'Senegal', currency: 'XOF', currencySymbol: 'CFA', flag: '🇸🇳', usdRate: 604.00, paymentMethods: ['Orange Money', 'Wave', 'Free Money', 'Bank Transfer'] },
  { code: 'CI', name: 'Ivory Coast', currency: 'XOF', currencySymbol: 'CFA', flag: '🇨🇮', usdRate: 604.00, paymentMethods: ['Orange Money', 'MTN CI', 'Wave', 'Bank Transfer'] },
  { code: 'CM', name: 'Cameroon', currency: 'XAF', currencySymbol: 'FCFA', flag: '🇨🇲', usdRate: 604.00, paymentMethods: ['MTN Mobile Money', 'Orange Money', 'Bank Transfer'] },
  { code: 'BO', name: 'Bolivia', currency: 'BOB', currencySymbol: 'Bs.', flag: '🇧🇴', usdRate: 6.91, paymentMethods: ['Banco Unión', 'BCP Bolivia', 'Tigo Money', 'Bank Transfer'] },
  { code: 'CL', name: 'Chile', currency: 'CLP', currencySymbol: '$', flag: '🇨🇱', usdRate: 950.00, paymentMethods: ['Mercado Pago', 'MACH', 'Banco de Chile', 'Santander Chile'] },
  { code: 'CO', name: 'Colombia', currency: 'COP', currencySymbol: '$', flag: '🇨🇴', usdRate: 3950.00, paymentMethods: ['Nequi', 'Daviplata', 'Bancolombia', 'PSE'] },
  { code: 'PE', name: 'Peru', currency: 'PEN', currencySymbol: 'S/.', flag: '🇵🇪', usdRate: 3.73, paymentMethods: ['Yape', 'Plin', 'BCP Peru', 'Interbank', 'BBVA Peru'] },
  { code: 'VE', name: 'Venezuela', currency: 'VES', currencySymbol: 'Bs.', flag: '🇻🇪', usdRate: 36.80, paymentMethods: ['Pago Movil', 'Mercantil Bank', 'Banesco', 'Bank Transfer'] },
  { code: 'EC', name: 'Ecuador', currency: 'USD', currencySymbol: '$', flag: '🇪🇨', usdRate: 1.00, paymentMethods: ['Bank Transfer', 'Banco Pichincha', 'PayPhone'] },
  { code: 'PY', name: 'Paraguay', currency: 'PYG', currencySymbol: '₲', flag: '🇵🇾', usdRate: 7450.00, paymentMethods: ['Tigo Money Paraguay', 'PagoExpress', 'Bank Transfer'] },
  { code: 'UY', name: 'Uruguay', currency: 'UYU', currencySymbol: '$U', flag: '🇺🇾', usdRate: 39.20, paymentMethods: ['RedPagos', 'BROU', 'Abitab', 'Mercado Pago Uruguay'] },
  { code: 'CU', name: 'Cuba', currency: 'CUP', currencySymbol: '$', flag: '🇨🇺', usdRate: 24.00, paymentMethods: ['Transfermóvil', 'EnZona', 'Bank Transfer'] },
  { code: 'DO', name: 'Dominican Republic', currency: 'DOP', currencySymbol: 'RD$', flag: '🇩🇴', usdRate: 59.20, paymentMethods: ['Banreservas', 'Banco Popular', 'PayCash'] },
  { code: 'GT', name: 'Guatemala', currency: 'GTQ', currencySymbol: 'Q', flag: '🇬🇹', usdRate: 7.78, paymentMethods: ['Banrural', 'Banco Industrial', 'Bank Transfer'] },
  { code: 'HN', name: 'Honduras', currency: 'HNL', currencySymbol: 'L', flag: '🇭🇳', usdRate: 24.70, paymentMethods: ['Bank Transfer', 'Banco Atlántida', 'BAC Honduras'] },
  { code: 'CR', name: 'Costa Rica', currency: 'CRC', currencySymbol: '₡', flag: '🇨🇷', usdRate: 519.00, paymentMethods: ['SINPE Movil', 'Banco Nacional', 'BCR'] },
  { code: 'PA', name: 'Panama', currency: 'USD', currencySymbol: '$', flag: '🇵🇦', usdRate: 1.00, paymentMethods: ['Yappy', 'BAC Panama', 'Banistmo'] },
  { code: 'TN', name: 'Tunisia', currency: 'TND', currencySymbol: 'د.ت', flag: '🇹🇳', usdRate: 3.13, paymentMethods: ['D17', 'Floussy', 'PostePay', 'Bank Transfer'] },
  { code: 'DZ', name: 'Algeria', currency: 'DZD', currencySymbol: 'دج', flag: '🇩🇿', usdRate: 134.50, paymentMethods: ['CCP', 'BADR', 'BNA', 'Bank Transfer'] },
  { code: 'LY', name: 'Libya', currency: 'LYD', currencySymbol: 'ل.د', flag: '🇱🇾', usdRate: 4.83, paymentMethods: ['Bank Transfer', 'Mobi Cash', 'National Commercial Bank'] },
  { code: 'SD', name: 'Sudan', currency: 'SDG', currencySymbol: 'ج.س.', flag: '🇸🇩', usdRate: 585.00, paymentMethods: ['Bank Transfer', 'Sudanese French Bank'] },
  { code: 'IQ', name: 'Iraq', currency: 'IQD', currencySymbol: 'ع.د', flag: '🇮🇶', usdRate: 1310.00, paymentMethods: ['ZainCash', 'Asia Hawala', 'Bank Transfer', 'Qi Card'] },
  { code: 'IR', name: 'Iran', currency: 'IRR', currencySymbol: '﷼', flag: '🇮🇷', usdRate: 42000.00, paymentMethods: ['Sheba Transfer', 'Mellat Bank', 'Saderat Bank'] },
  { code: 'JO', name: 'Jordan', currency: 'JOD', currencySymbol: 'د.ا', flag: '🇯🇴', usdRate: 0.71, paymentMethods: ['eFAWATEERcom', 'Arab Bank', 'Bank al Etihad'] },
  { code: 'LB', name: 'Lebanon', currency: 'LBP', currencySymbol: 'ل.ل', flag: '🇱🇧', usdRate: 89500.00, paymentMethods: ['OMT', 'Western Union', 'Bank Transfer'] },
  { code: 'SY', name: 'Syria', currency: 'SYP', currencySymbol: '£', flag: '🇸🇾', usdRate: 12800.00, paymentMethods: ['Western Union', 'Bank Transfer'] },
  { code: 'YE', name: 'Yemen', currency: 'YER', currencySymbol: '﷼', flag: '🇾🇪', usdRate: 532.00, paymentMethods: ['Bank Transfer', 'CAC Bank'] },
  { code: 'KW', name: 'Kuwait', currency: 'KWD', currencySymbol: 'د.ك', flag: '🇰🇼', usdRate: 0.31, paymentMethods: ['KNET', 'NBK', 'Gulf Bank', 'Boubyan Bank'] },
  { code: 'QA', name: 'Qatar', currency: 'QAR', currencySymbol: 'ر.ق', flag: '🇶🇦', usdRate: 3.64, paymentMethods: ['QNB', 'QPAY', 'Al Ahli Bank', 'Masraf Al Rayan'] },
  { code: 'BH', name: 'Bahrain', currency: 'BHD', currencySymbol: '.د.ب', flag: '🇧🇭', usdRate: 0.38, paymentMethods: ['BenefitPay', 'NBB', 'BBK', 'Bank Transfer'] },
  { code: 'OM', name: 'Oman', currency: 'OMR', currencySymbol: 'ر.ع.', flag: '🇴🇲', usdRate: 0.38, paymentMethods: ['Bank Muscat', 'Oman Arab Bank', 'Bank Dhofar'] },
  { code: 'IL', name: 'Israel', currency: 'ILS', currencySymbol: '₪', flag: '🇮🇱', usdRate: 3.73, paymentMethods: ['Bit', 'PayBox', 'Bank Leumi', 'Bank Hapoalim'] },
  { code: 'AF', name: 'Afghanistan', currency: 'AFN', currencySymbol: '؋', flag: '🇦🇫', usdRate: 71.00, paymentMethods: ['M-Paisa', 'Afghan United Bank'] },
  { code: 'NZ', name: 'New Zealand', currency: 'NZD', currencySymbol: 'NZ$', flag: '🇳🇿', usdRate: 1.65, paymentMethods: ['ANZ NZ', 'ASB Bank', 'BNZ', 'Kiwibank'] },
  { code: 'FJ', name: 'Fiji', currency: 'FJD', currencySymbol: 'FJ$', flag: '🇫🇯', usdRate: 2.26, paymentMethods: ['ANZ Fiji', 'Westpac Fiji', 'Bank Transfer'] },
  { code: 'TT', name: 'Trinidad & Tobago', currency: 'TTD', currencySymbol: 'TT$', flag: '🇹🇹', usdRate: 6.78, paymentMethods: ['RBC TT', 'Republic Bank', 'Bank Transfer'] },
  { code: 'JM', name: 'Jamaica', currency: 'JMD', currencySymbol: 'J$', flag: '🇯🇲', usdRate: 156.00, paymentMethods: ['NCB Jamaica', 'Scotiabank Jamaica', 'Bank Transfer'] },
  { code: 'NI', name: 'Nicaragua', currency: 'NIO', currencySymbol: 'C$', flag: '🇳🇮', usdRate: 36.80, paymentMethods: ['BAC Nicaragua', 'Banpro', 'Bank Transfer'] },
  { code: 'BY', name: 'Belarus', currency: 'BYN', currencySymbol: 'Br', flag: '🇧🇾', usdRate: 3.27, paymentMethods: ['BelAPB', 'Sber Belarus', 'Alfa-Bank Belarus'] },
  { code: 'MD', name: 'Moldova', currency: 'MDL', currencySymbol: 'L', flag: '🇲🇩', usdRate: 17.90, paymentMethods: ['Moldova Agroindbank', 'Mobiasbancă', 'Bank Transfer'] },
  { code: 'AL', name: 'Albania', currency: 'ALL', currencySymbol: 'L', flag: '🇦🇱', usdRate: 94.50, paymentMethods: ['Raiffeisen Albania', 'Bank Transfer'] },
  { code: 'XK', name: 'Kosovo', currency: 'EUR', currencySymbol: '€', flag: '🇽🇰', usdRate: 0.92, paymentMethods: ['ProCredit Bank', 'Raiffeisen Kosovo', 'SEPA Transfer'] },
  { code: 'TJ', name: 'Tajikistan', currency: 'TJS', currencySymbol: 'SM', flag: '🇹🇯', usdRate: 10.92, paymentMethods: ['Eskhata Bank', 'TBC Tajikistan', 'Bank Transfer'] },
  { code: 'TM', name: 'Turkmenistan', currency: 'TMT', currencySymbol: 'T', flag: '🇹🇲', usdRate: 3.51, paymentMethods: ['Bank Transfer', 'Rysgal Bank'] },
  { code: 'KG', name: 'Kyrgyzstan', currency: 'KGS', currencySymbol: 'с', flag: '🇰🇬', usdRate: 88.20, paymentMethods: ['Mbank', 'Bakai Bank', 'Bank Transfer'] },
];

const MERCHANT_NAMES = [
  'CryptoKing', 'FastTrader', 'TrustPay', 'QuickCash', 'ProExchange',
  'SafeDeals', 'GlobalPay', 'InstantCrypto', 'SecureSwap', 'EliteMerchant',
  'PrimeTrade', 'DiamondPay', 'GoldExchange', 'PlatinumDeals', 'SwiftPay',
  'RapidCrypto', 'MegaTrader', 'TopMerchant', 'VIPExchange', 'TurboTrade',
  'BlazeExchange', 'NovaPay', 'ZenithTrade', 'ApexCrypto', 'PeakDeals',
  'SolidPay', 'IronMerchant', 'SteelTrade', 'TitanExchange', 'EaglePay',
];

const AVATAR_POOL = Array.from({ length: 50 }, (_, i) => `/ber${i + 1}.jpg`);

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function generateMerchantsForCountry(country: Country, count: number = 20, mode: 'buy' | 'sell' = 'buy'): P2PMerchant[] {
  const merchants: P2PMerchant[] = [];
  const usedAvatars = new Set<number>();

  for (let i = 0; i < count; i++) {
    const seed = country.code.charCodeAt(0) * 1000 + i * 17 + (mode === 'sell' ? 5000 : 0);
    const r = (offset: number) => seededRandom(seed + offset);

    let avatarIdx = Math.floor(r(i * 3 + 7) * 50);
    // Vary the seed offset on each retry (r() is deterministic, so reusing the
    // same offset would re-pick the same index forever -> infinite loop/freeze).
    // Cap attempts so a fully-used pool can never hang the main thread.
    let attempts = 0;
    while (usedAvatars.has(avatarIdx) && usedAvatars.size < 50 && attempts < 50) {
      attempts++;
      avatarIdx = Math.floor(r(i * 3 + 7 + attempts * 101) * 50);
    }
    usedAvatars.add(avatarIdx);

    const nameIdx = Math.floor(r(1) * MERCHANT_NAMES.length);
    const suffix = Math.floor(r(2) * 9000 + 1000);
    const username = `${MERCHANT_NAMES[nameIdx]}_${suffix}`;

    const trades = Math.floor(r(3) * 15000 + 50);
    const completion = parseFloat((95 + r(4) * 5).toFixed(2));
    const verified = r(5) > 0.35;

    const premium = r(6) > 0.7;
    const priceVariance = premium ? (r(7) - 0.5) * 0.02 : (r(7) - 0.3) * 0.04;
    const price = parseFloat((1.0 + priceVariance).toFixed(4));

    const baseMin = Math.floor(r(8) * 500 + 10);
    const baseMax = Math.floor(r(9) * 50000 + baseMin * 5);
    const minLimit = Math.round(baseMin * country.usdRate);
    const maxLimit = Math.round(baseMax * country.usdRate);
    const available = parseFloat((baseMax * 0.9 * (0.5 + r(10) * 0.5)).toFixed(2));

    const pmIdx = Math.floor(r(11) * country.paymentMethods.length);
    const paymentMethod = country.paymentMethods[pmIdx];

    const timeLimit = [10, 15, 15, 20, 30][Math.floor(r(12) * 5)];
    const onlineStatus: 'online' | 'recently' = r(13) > 0.4 ? 'online' : 'recently';

    merchants.push({
      id: `${country.code}-${mode}-${i}`,
      username,
      avatar: AVATAR_POOL[avatarIdx] || '/ber1.jpg',
      trades,
      completion,
      verified,
      price,
      minLimit,
      maxLimit,
      available,
      paymentMethod,
      timeLimit,
      country: country.name,
      currency: country.currency,
      onlineStatus,
    });
  }

  if (mode === 'buy') {
    merchants.sort((a, b) => a.price - b.price);
  } else {
    merchants.sort((a, b) => b.price - a.price);
  }

  return merchants;
}

export function getCountryByCode(code: string): Country | undefined {
  return COUNTRIES.find(c => c.code === code);
}

export function formatCurrencyAmount(amount: number, currency: string, symbol: string): string {
  if (amount >= 1_000_000) return `${symbol}${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `${symbol}${(amount / 1_000).toFixed(1)}K`;
  return `${symbol}${amount.toLocaleString()}`;
}
