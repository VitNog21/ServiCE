import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabase } from './config/supabase.js';
import categoryRoutes from './routes/categoryRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// MÁGICA AQUI: O cors() vazio permite que o Live Server (porta 5500) acesse a API
app.use(cors());
app.use(express.json());

// Rota de Teste
app.get('/api/health', async (req, res) => {
  try {
    const { data, error } = await supabase.from('categories').select('name').limit(1);
    if (error) throw error;
    res.status(200).json({ status: 'ok', message: 'Backend operante!' });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

// Rotas da Aplicação
app.use('/api/categories', categoryRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});