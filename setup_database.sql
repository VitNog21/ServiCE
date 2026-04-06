-- ==========================================
-- SCRIPT DE CONFIGURAÇÃO DO BANCO DE DADOS (ServiCE)
-- Copie este código e cole no SQL Editor do Supabase
-- ==========================================

-- 0. Habilitar a extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA DE PERFIS (Extensão do auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TABELA DE CATEGORIAS
CREATE TABLE IF NOT EXISTS public.categorias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icone TEXT,
  data_criacao TIMESTAMPTZ DEFAULT now()
);

-- 3. TABELA DE ANÚNCIOS
CREATE TABLE IF NOT EXISTS public.anuncios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  preco DECIMAL(10,2) NOT NULL,
  imagem_url TEXT,
  localizacao TEXT DEFAULT 'Brasil',
  data_criacao TIMESTAMPTZ DEFAULT now()
);

-- 4. TABELA DE PEDIDOS (Operação de Venda)
CREATE TABLE IF NOT EXISTS public.pedidos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  anuncio_id UUID REFERENCES public.anuncios(id) ON DELETE SET NULL,
  comprador_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vendedor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  valor_total DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'concluido', 'cancelado')),
  data_criacao TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- CONFIGURAÇÃO DE SEGURANÇA (RLS)
-- ==========================================

-- Ativar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anuncios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS PARA PERFIS
CREATE POLICY "Qualquer um pode ver perfis" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Usuários podem atualizar o próprio perfil" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- POLÍTICAS PARA CATEGORIAS
CREATE POLICY "Qualquer um pode ver categorias" ON public.categorias FOR SELECT USING (true);

-- POLÍTICAS PARA ANÚNCIOS
CREATE POLICY "Qualquer um pode ver anúncios" ON public.anuncios FOR SELECT USING (true);
CREATE POLICY "Usuários logados podem criar anúncios" ON public.anuncios FOR INSERT WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "Dono pode editar seu anúncio" ON public.anuncios FOR UPDATE USING (auth.uid() = usuario_id);
CREATE POLICY "Dono pode deletar seu anúncio" ON public.anuncios FOR DELETE USING (auth.uid() = usuario_id);

-- POLÍTICAS PARA PEDIDOS
CREATE POLICY "Usuários podem ver pedidos onde são comprador ou vendedor" 
ON public.pedidos FOR SELECT USING (auth.uid() = comprador_id OR auth.uid() = vendedor_id);

CREATE POLICY "Apenas compradores podem criar pedidos" 
ON public.pedidos FOR INSERT WITH CHECK (auth.uid() = comprador_id);

-- ==========================================
-- TRIGGER PARA CRIAR PERFIL AUTOMÁTICO NO CADASTRO
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
