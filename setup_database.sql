-- ==========================================
-- SCRIPT DE ADIÇÃO DA CAMADA DE PEDIDOS (Orders)
-- Este script é seguro e não altera as tabelas existentes.
-- Copie este código e cole no SQL Editor do Supabase
-- ==========================================

-- 1. Criar a tabela de Pedidos (Orders) se ela não existir
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  total_price DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Ativar Segurança (RLS) apenas para a nova tabela
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 3. Criar Políticas de Segurança para a tabela orders (idempotente)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Users can see their own orders') THEN
        CREATE POLICY "Users can see their own orders" 
        ON public.orders FOR SELECT 
        USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Users can create orders as buyers') THEN
        CREATE POLICY "Users can create orders as buyers" 
        ON public.orders FOR INSERT 
        WITH CHECK (auth.uid() = buyer_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Users can update order status') THEN
        CREATE POLICY "Users can update order status" 
        ON public.orders FOR UPDATE 
        USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
    END IF;
END $$;
