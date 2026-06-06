import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import dotenv from 'dotenv';

dotenv.config();

const client = new MercadoPagoConfig({ 
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || '' 
});

export const createPaymentPreference = async (order) => {
  const preference = new Preference(client);

  const frontendUrl = (process.env.FRONTEND_URL && process.env.FRONTEND_URL !== 'INSIRA_O_VALOR_AQUI') 
    ? process.env.FRONTEND_URL.replace(/\/$/, '') 
    : 'http://localhost:5173';

  const webhookUrl = (process.env.WEBHOOK_URL && process.env.WEBHOOK_URL !== 'INSIRA_O_VALOR_AQUI')
    ? process.env.WEBHOOK_URL.replace(/\/$/, '')
    : null;

  const body = {
    items: [
      {
        id: String(order.listing_id || order.anuncio_id),
        title: order.listings?.title || `Pedido #${order.id.slice(0,8)}`,
        unit_price: parseFloat(Number(order.total_price || order.valor_total).toFixed(2)),
        quantity: 1,
        currency_id: 'BRL',
        description: 'Serviço contratado via ServiCE'
      }
    ],
    payer: {
      email: 'test_user_123@testuser.com', // Facilitador para Sandbox
      identification: {
        type: 'CPF',
        number: '12345678909'
      }
    },
    back_urls: {
      success: `${frontendUrl}/sucesso`,
      failure: `${frontendUrl}/falha`,
      pending: `${frontendUrl}/meus-pedidos`
    },
    auto_return: 'approved',
    external_reference: String(order.id)
  };

  // Só adiciona notification_url se for uma URL válida (contém http)
  if (webhookUrl && webhookUrl.startsWith('http')) {
    body.notification_url = `${webhookUrl}/api/payments/webhook`;
  }

  try {
    console.log("📤 Sending preference to MP:", JSON.stringify(body, null, 2));
    const response = await preference.create({ body });
    return response;
  } catch (error) {
    console.error("❌ Mercado Pago detailed error:", error);
    throw new Error(error.message || 'Error processing payment with Mercado Pago.');
  }
};

export const getPaymentDetails = async (paymentId) => {
  const payment = new Payment(client);
  try {
    const response = await payment.get({ id: paymentId });
    return response;
  } catch (error) {
    console.error("Error fetching payment details:", error);
    throw new Error('Error verifying payment on Mercado Pago.');
  }
};
