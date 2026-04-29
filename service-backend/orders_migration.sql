
-- Migration to create the 'orders' table with English naming conventions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  total_price DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'concluido', 'cancelado')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Data migration from 'pedidos' if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'pedidos'
  ) THEN
    -- Try to migrate based on column availability
    INSERT INTO public.orders (id, listing_id, buyer_id, seller_id, total_price, status, created_at)
    SELECT id, anuncio_id, comprador_id, vendedor_id, valor_total, status, data_criacao
    FROM public.pedidos
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'orders'
      AND policyname = 'Users can see orders where they are buyer or seller'
  ) THEN
    CREATE POLICY "Users can see orders where they are buyer or seller"
    ON public.orders
    FOR SELECT
    USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'orders'
      AND policyname = 'Only buyers can create orders'
  ) THEN
    CREATE POLICY "Only buyers can create orders"
    ON public.orders
    FOR INSERT
    WITH CHECK (auth.uid() = buyer_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'orders'
      AND policyname = 'Buyer or seller can update status'
  ) THEN
    CREATE POLICY "Buyer or seller can update status"
    ON public.orders
    FOR UPDATE
    USING (auth.uid() = buyer_id OR auth.uid() = seller_id)
    WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);
  END IF;
END $$;
