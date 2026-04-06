import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('anuncios').select('id, titulo, imagem_url');
  if (error) {
    console.error('❌ Erro ao buscar:', error.message);
  } else {
    console.log('📊 Anúncios encontrados no banco:', data.length);
    data.forEach(a => console.log(`- ${a.titulo}: ${a.imagem_url ? 'Com Imagem ✅' : 'Sem Imagem ❌'}`));
  }
}
check();
