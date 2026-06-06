// service-backend/src/server.js
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';
import { supabase } from './config/supabase.js';
import categoryRoutes from './routes/categoryRoutes.js';
import authRoutes from './routes/authRoutes.js'; 
import orderRoutes from './routes/orderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const swaggerOutputPath = path.resolve(__dirname, '../swagger_output.json');

let swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'ServiCE API',
    version: '1.0.0'
  }
};

try {
  swaggerDocument = JSON.parse(fs.readFileSync(swaggerOutputPath, 'utf-8'));
} catch (error) {
  console.warn('swagger_output.json nao encontrado. Execute "npm run swagger" para gerar a documentacao.');
}

app.use(cors());
app.use(express.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Rota de Teste de Saúde da API
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
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});