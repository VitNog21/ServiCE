import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Alterado para usar a Service Role Key (Admin)
);

async function seed() {
  console.log('🚀 Iniciando inserção de dados de teste...');

  // 1. Verificar conexão e Usuário
  const { data: profiles, error: profileError } = await supabase.from('profiles').select('id').limit(1);
  
  if (profileError) {
    console.error('❌ ERRO DE CONEXÃO OU TABELA AUSENTE:', profileError.message);
    console.log('👉 Certifique-se de que você criou as tabelas no SQL Editor do Supabase primeiro!');
    return;
  }

  if (!profiles || profiles.length === 0) {
    console.error('❌ NENHUM USUÁRIO ENCONTRADO.');
    console.log('👉 Por favor, cadastre-se no seu site (página /cadastro) antes de rodar este script.');
    return;
  }

  const userId = profiles[0].id;
  console.log(`👤 Vinculando anúncios ao usuário: ${userId}`);

  // 2. Criar/Garantir Categorias
  const categorias = [
    { nome: 'Manutenção', slug: 'manutencao', icone: 'wrench' },
    { nome: 'Limpeza', slug: 'limpeza', icone: 'trash' },
    { nome: 'Tecnologia', slug: 'tecnologia', icone: 'laptop' }
  ];

  console.log('cat 📦 Criando categorias...');
  for (const cat of categorias) {
    const { error } = await supabase.from('categorias').upsert(cat, { onConflict: 'slug' });
    if (error) console.warn(`⚠️ Aviso na categoria ${cat.slug}:`, error.message);
  }

  // 3. Buscar IDs das categorias criadas
  const { data: cats, error: catsError } = await supabase.from('categorias').select('id, slug');
  
  if (catsError || !cats) {
    console.error('❌ Erro ao buscar categorias:', catsError?.message);
    return;
  }

  const catMap = Object.fromEntries(cats.map(c => [c.slug, c.id]));

  // 4. Inserir Anúncios
  const novosAnuncios = [
    {
      usuario_id: userId,
      categoria_id: catMap['manutencao'],
      titulo: 'Conserto de Ar Condicionado',
      descricao: 'Manutenção completa, recarga de gás e higienização profunda de aparelhos split.',
      preco: 180.00,
      localizacao: 'Fortaleza, CE',
      imagem_url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=500'
    },
    {
      usuario_id: userId,
      categoria_id: catMap['limpeza'],
      titulo: 'Limpeza Residencial Premium',
      descricao: 'Faxina detalhada para casas e apartamentos, incluindo janelas e área externa.',
      preco: 150.00,
      localizacao: 'Eusébio, CE',
      imagem_url: 'https://images.unsplash.com/photo-1581578731548-c64695ce6958?q=80&w=500'
    },
    {
      usuario_id: userId,
      categoria_id: catMap['tecnologia'],
      titulo: 'Formatação e Backup',
      descricao: 'Instalação de Windows 11, backup de dados e limpeza física de notebook/desktop.',
      preco: 120.00,
      localizacao: 'Fortaleza, CE',
      imagem_url: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?q=80&w=500'
    }
  ];

  console.log('📝 Inserindo anúncios...');
  const { error: insError } = await supabase.from('anuncios').insert(novosAnuncios);

  if (insError) {
    console.error('❌ Erro ao inserir anúncios:', insError.message);
  } else {
    console.log('✅ SUCESSO! 3 Anúncios de teste criados.');
    console.log('🔗 Recarregue a Home do seu site para ver o resultado.');
  }
}

seed();
