// src/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabase } from './config/supabase.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/health', async (req, res) => {
  try {
    const { data, error } = await supabase.from('categories').select('name').limit(1);

    if (error) throw error;

    res.status(200).json({ 
      status: 'ok', 
      message: 'ServiCE Backend operante!',
      database: 'Conectado ao Supabase com sucesso!',
      test_data: data 
    });
  } catch (error) {
    console.error('Erro na conexão com o banco:', error.message);
    res.status(500).json({ 
      status: 'error', 
      message: 'Servidor rodando, mas falhou ao conectar no banco de dados.',
      error: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});