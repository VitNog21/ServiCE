import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import paymentRoutes from '../../src/routes/paymentRoutes.js';
import dotenv from 'dotenv';

dotenv.config();

// Configuração de um app express minimalista para os testes de integração
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/payments', paymentRoutes);

describe('Integração: Fluxo de Pagamento (Mercado Pago)', () => {
  
  it('Deve retornar erro 404 ao tentar criar checkout para um pedido inexistente', async () => {
    const fakeOrderId = '00000000-0000-0000-0000-000000000000';
    const response = await request(app)
      .post('/api/payments/create-checkout')
      .send({ orderId: fakeOrderId });

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error', 'Order not found');
  });

  it('Deve validar o recebimento de webhooks do Mercado Pago', async () => {
    // Simulação do payload de webhook
    const webhookPayload = {
      action: "payment.created",
      data: { id: "12345678" },
      type: "payment"
    };

    const response = await request(app)
      .post('/api/payments/webhook')
      .send(webhookPayload);

    expect(response.status).toBe(200);
    expect(response.text).toBe('OK');
  });

});
