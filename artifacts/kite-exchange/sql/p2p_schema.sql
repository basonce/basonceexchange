-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  BASONCE / KITE EXCHANGE  —  P2P TRADING SCHEMA                 ║
-- ║  Run this once in Supabase SQL Editor                            ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- ─── 1) p2p_payment_methods : kullanıcının kayıtlı ödeme yöntemleri ───
CREATE TABLE IF NOT EXISTS public.p2p_payment_methods (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  method_type  text NOT NULL,        -- 'Bank Transfer', 'Zelle', 'PayPal', 'Papara', 'PIX', vs.
  account_name text NOT NULL,        -- ad soyad / kullanıcı adı
  account_number text,               -- IBAN, e-mail, telefon, hesap no
  bank_name    text,                 -- banka adı (varsa)
  notes        text,                 -- ek bilgi (şube, açıklama vs.)
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS p2p_payment_methods_user_idx ON public.p2p_payment_methods(user_id);

-- ─── 2) p2p_advertisements : ilanlar ───
CREATE TABLE IF NOT EXISTS public.p2p_advertisements (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  ad_type       text NOT NULL CHECK (ad_type IN ('buy','sell')),  -- buy = ben almak istiyorum, sell = satıyorum
  crypto_symbol text NOT NULL,       -- 'USDT' | 'BTC' | 'ETH' | 'BNB' | 'EQ'
  crypto_network text NOT NULL,      -- 'BEP20' | 'TRC20' | 'ERC20' | 'BTC' | 'EQ'
  fiat_currency text NOT NULL,       -- 'USD' | 'TRY' | 'EUR' ...
  price         numeric(20,8) NOT NULL CHECK (price > 0),  -- 1 birim crypto için fiat fiyat
  min_amount    numeric(20,2) NOT NULL CHECK (min_amount > 0), -- fiat minimum
  max_amount    numeric(20,2) NOT NULL CHECK (max_amount >= min_amount),
  total_crypto  numeric(20,8) NOT NULL CHECK (total_crypto > 0), -- toplam ilan miktarı (crypto)
  available_crypto numeric(20,8) NOT NULL CHECK (available_crypto >= 0), -- kalan
  payment_methods text[] NOT NULL DEFAULT '{}',
  payment_window_minutes int NOT NULL DEFAULT 15 CHECK (payment_window_minutes BETWEEN 5 AND 120),
  terms         text,
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','completed','cancelled')),
  trade_count   int NOT NULL DEFAULT 0,
  country_code  text,                -- öncelikli bölge (opsiyonel)
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS p2p_ads_active_idx ON public.p2p_advertisements(status, ad_type, crypto_symbol, fiat_currency, price);
CREATE INDEX IF NOT EXISTS p2p_ads_advertiser_idx ON public.p2p_advertisements(advertiser_id);

-- ─── 3) p2p_orders : gerçek alım-satım işlemleri ───
CREATE TABLE IF NOT EXISTS public.p2p_orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number    text UNIQUE NOT NULL,    -- BAS-P2P-XXXXXX
  ad_id           uuid NOT NULL REFERENCES public.p2p_advertisements(id) ON DELETE RESTRICT,
  buyer_id        uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
  seller_id       uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
  crypto_symbol   text NOT NULL,
  crypto_network  text NOT NULL,
  fiat_currency   text NOT NULL,
  crypto_amount   numeric(20,8) NOT NULL CHECK (crypto_amount > 0),
  fiat_amount     numeric(20,2) NOT NULL CHECK (fiat_amount > 0),
  price           numeric(20,8) NOT NULL,
  payment_method  text NOT NULL,
  payment_method_details jsonb,             -- satıcının banka/zelle/etc bilgileri (sipariş anında snapshot)
  status          text NOT NULL DEFAULT 'pending_payment'
                  CHECK (status IN ('pending_payment','paid','completed','cancelled','disputed','expired')),
  payment_deadline timestamptz NOT NULL,
  buyer_marked_paid_at  timestamptz,
  seller_confirmed_at   timestamptz,
  completed_at    timestamptz,
  cancelled_at    timestamptz,
  cancelled_by    uuid REFERENCES public.user_profiles(id),
  cancel_reason   text,
  dispute_opened_at  timestamptz,
  dispute_opened_by  uuid REFERENCES public.user_profiles(id),
  dispute_reason     text,
  dispute_resolved_at timestamptz,
  dispute_winner     text CHECK (dispute_winner IN ('buyer','seller')),
  dispute_admin_note text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS p2p_orders_buyer_idx  ON public.p2p_orders(buyer_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS p2p_orders_seller_idx ON public.p2p_orders(seller_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS p2p_orders_status_idx ON public.p2p_orders(status, payment_deadline);
CREATE INDEX IF NOT EXISTS p2p_orders_ad_idx     ON public.p2p_orders(ad_id);

-- ─── 4) p2p_messages : sipariş içi sohbet ───
CREATE TABLE IF NOT EXISTS public.p2p_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL REFERENCES public.p2p_orders(id) ON DELETE CASCADE,
  sender_id   uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  message     text NOT NULL,
  attachment_url text,
  is_system   boolean NOT NULL DEFAULT false,    -- otomatik sistem mesajları (ödeme bildirildi vs.)
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS p2p_messages_order_idx ON public.p2p_messages(order_id, created_at);

-- ─── 5) p2p_user_stats : tüccar istatistikleri ───
CREATE TABLE IF NOT EXISTS public.p2p_user_stats (
  user_id          uuid PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  total_trades     int NOT NULL DEFAULT 0,
  completed_trades int NOT NULL DEFAULT 0,
  cancelled_trades int NOT NULL DEFAULT 0,
  disputed_trades  int NOT NULL DEFAULT 0,
  like_count       int NOT NULL DEFAULT 0,
  dislike_count    int NOT NULL DEFAULT 0,
  avg_release_seconds numeric(10,2),
  is_verified      boolean NOT NULL DEFAULT false,
  is_merchant      boolean NOT NULL DEFAULT false,
  badge            text,                          -- 'gold','silver','bronze' vs.
  display_name     text,                          -- P2P'de gösterilecek takma ad
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ─── 6) p2p_reviews : yorumlar ───
CREATE TABLE IF NOT EXISTS public.p2p_reviews (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid NOT NULL REFERENCES public.p2p_orders(id) ON DELETE CASCADE,
  reviewer_id   uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  reviewed_id   uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  rating        text NOT NULL CHECK (rating IN ('like','dislike')),
  comment       text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, reviewer_id)
);
CREATE INDEX IF NOT EXISTS p2p_reviews_reviewed_idx ON public.p2p_reviews(reviewed_id);

-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  TRIGGERS & RPCs                                                 ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- updated_at trigger fonksiyonu
CREATE OR REPLACE FUNCTION public._p2p_touch_updated()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS p2p_ads_updated ON public.p2p_advertisements;
CREATE TRIGGER p2p_ads_updated   BEFORE UPDATE ON public.p2p_advertisements
  FOR EACH ROW EXECUTE FUNCTION public._p2p_touch_updated();
DROP TRIGGER IF EXISTS p2p_orders_updated ON public.p2p_orders;
CREATE TRIGGER p2p_orders_updated BEFORE UPDATE ON public.p2p_orders
  FOR EACH ROW EXECUTE FUNCTION public._p2p_touch_updated();
DROP TRIGGER IF EXISTS p2p_pm_updated ON public.p2p_payment_methods;
CREATE TRIGGER p2p_pm_updated     BEFORE UPDATE ON public.p2p_payment_methods
  FOR EACH ROW EXECUTE FUNCTION public._p2p_touch_updated();
DROP TRIGGER IF EXISTS p2p_stats_updated ON public.p2p_user_stats;
CREATE TRIGGER p2p_stats_updated  BEFORE UPDATE ON public.p2p_user_stats
  FOR EACH ROW EXECUTE FUNCTION public._p2p_touch_updated();

-- Yardımcı: bir kullanıcının symbol bakiyesi (mevcut tablodan)
-- user_balances tablosunda (user_id, symbol, balance, locked_balance) varsayıyoruz.

-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  CORE RPC: ESCROW LOCK / RELEASE                                ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- p2p_lock_escrow: SELL ilanı oluşturulurken veya SELL ilanından sipariş alınırken
-- satıcının bakiyesinden 'amount' kadar dondurur.
CREATE OR REPLACE FUNCTION public.p2p_lock_escrow(
  p_user_id uuid,
  p_symbol  text,
  p_amount  numeric
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_balance numeric;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;

  -- mevcut bakiye
  SELECT COALESCE(balance, 0) INTO v_balance
    FROM public.user_balances
   WHERE user_id = p_user_id AND symbol = p_symbol
   LIMIT 1;

  IF v_balance IS NULL OR v_balance < p_amount THEN
    RAISE EXCEPTION 'insufficient balance: have %, need %', COALESCE(v_balance,0), p_amount;
  END IF;

  -- balance düş, locked_balance arttır (satır var)
  UPDATE public.user_balances
     SET balance = balance - p_amount,
         locked_balance = COALESCE(locked_balance,0) + p_amount
   WHERE user_id = p_user_id AND symbol = p_symbol;

  RETURN true;
END $$;

-- p2p_release_escrow: emanet açılır, miktar alıcıya transfer edilir
-- (user_balances'da UNIQUE constraint olmadığı için manuel upsert)
CREATE OR REPLACE FUNCTION public.p2p_release_escrow(
  p_seller_id uuid,
  p_buyer_id  uuid,
  p_symbol    text,
  p_amount    numeric
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_exists boolean;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;

  -- satıcının kilitli miktarını düş
  UPDATE public.user_balances
     SET locked_balance = GREATEST(0, COALESCE(locked_balance,0) - p_amount)
   WHERE user_id = p_seller_id AND symbol = p_symbol;

  -- alıcının satırı var mı?
  SELECT EXISTS (
    SELECT 1 FROM public.user_balances WHERE user_id = p_buyer_id AND symbol = p_symbol
  ) INTO v_exists;

  IF v_exists THEN
    UPDATE public.user_balances
       SET balance = balance + p_amount
     WHERE user_id = p_buyer_id AND symbol = p_symbol;
  ELSE
    INSERT INTO public.user_balances (user_id, symbol, balance, locked_balance)
    VALUES (p_buyer_id, p_symbol, p_amount, 0);
  END IF;

  RETURN true;
END $$;

-- p2p_refund_escrow: iptal/expire/dispute_loss durumunda satıcıya iade
CREATE OR REPLACE FUNCTION public.p2p_refund_escrow(
  p_seller_id uuid,
  p_symbol    text,
  p_amount    numeric
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;

  UPDATE public.user_balances
     SET locked_balance = GREATEST(0, COALESCE(locked_balance,0) - p_amount),
         balance = balance + p_amount
   WHERE user_id = p_seller_id AND symbol = p_symbol;

  RETURN true;
END $$;

-- p2p_user_stats için satır oluşturma yardımcısı
CREATE OR REPLACE FUNCTION public.p2p_ensure_stats(p_user_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.p2p_user_stats (user_id) VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
END $$;

-- ATOMİK: ilanın 'available_crypto' alanından düş; sadece yeterliyse başarılı.
-- Race condition önlemek için TEK SQL UPDATE kullanır; iki eşzamanlı sipariş
-- aynı anda aynı miktarı çekemez. Başarısızsa false döner (worker hata fırlatır).
CREATE OR REPLACE FUNCTION public.p2p_consume_ad_available(
  p_ad_id  uuid,
  p_amount numeric
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_updated int;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;
  UPDATE public.p2p_advertisements
     SET available_crypto = available_crypto - p_amount,
         trade_count      = COALESCE(trade_count, 0) + 1
   WHERE id = p_ad_id
     AND status = 'active'
     AND available_crypto >= p_amount;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'ad unavailable or insufficient available_crypto';
  END IF;
  RETURN true;
END $$;

-- ATOMİK: iptal/dispute durumunda ilana miktarı geri ekle.
CREATE OR REPLACE FUNCTION public.p2p_restore_ad_available(
  p_ad_id  uuid,
  p_amount numeric
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;
  UPDATE public.p2p_advertisements
     SET available_crypto = available_crypto + p_amount
   WHERE id = p_ad_id;
  RETURN true;
END $$;

-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  ROW LEVEL SECURITY                                              ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- service_role tüm işlemleri yapabilir (worker bunu kullanıyor)
-- Anon/auth client'lar sadece kendi verilerini okuyabilir (worker üzerinden çağrılırsa zaten bypass)

ALTER TABLE public.p2p_advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.p2p_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.p2p_orders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.p2p_messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.p2p_user_stats      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.p2p_reviews         ENABLE ROW LEVEL SECURITY;

-- Aktif ilanları herkes okuyabilir
DROP POLICY IF EXISTS p2p_ads_public_read ON public.p2p_advertisements;
CREATE POLICY p2p_ads_public_read ON public.p2p_advertisements
  FOR SELECT USING (status = 'active' OR advertiser_id = auth.uid());

-- İlanı sadece sahibi düzenleyebilir
DROP POLICY IF EXISTS p2p_ads_owner_write ON public.p2p_advertisements;
CREATE POLICY p2p_ads_owner_write ON public.p2p_advertisements
  FOR ALL USING (advertiser_id = auth.uid()) WITH CHECK (advertiser_id = auth.uid());

-- Ödeme yöntemleri sadece sahibinin
DROP POLICY IF EXISTS p2p_pm_owner ON public.p2p_payment_methods;
CREATE POLICY p2p_pm_owner ON public.p2p_payment_methods
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Siparişlere alıcı veya satıcı erişebilir
DROP POLICY IF EXISTS p2p_orders_party_read ON public.p2p_orders;
CREATE POLICY p2p_orders_party_read ON public.p2p_orders
  FOR SELECT USING (buyer_id = auth.uid() OR seller_id = auth.uid());

-- Mesajlara sipariş tarafları erişebilir
DROP POLICY IF EXISTS p2p_messages_party_read ON public.p2p_messages;
CREATE POLICY p2p_messages_party_read ON public.p2p_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.p2p_orders o
            WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid()))
  );

-- İstatistikler herkese açık (read-only)
DROP POLICY IF EXISTS p2p_stats_public ON public.p2p_user_stats;
CREATE POLICY p2p_stats_public ON public.p2p_user_stats FOR SELECT USING (true);

-- Yorumlar herkese açık
DROP POLICY IF EXISTS p2p_reviews_public ON public.p2p_reviews;
CREATE POLICY p2p_reviews_public ON public.p2p_reviews FOR SELECT USING (true);

-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  DONE.  Worker (cf-worker) service_role anahtarıyla bu tabloları║
-- ║  yönetir, frontend tüm istekleri /api/p2p/* üzerinden yapar.     ║
-- ╚══════════════════════════════════════════════════════════════════╝
