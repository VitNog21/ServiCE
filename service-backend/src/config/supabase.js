import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('🚨 ERRO FATAL: Credenciais do Supabase ausentes no .env do backend.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
console.log('✅ Conexão com o Supabase instanciada com sucesso.');