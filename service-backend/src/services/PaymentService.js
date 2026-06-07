import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import dotenv from 'dotenv';

// Forçamos o reload das variáveis para garantir que o Docker pegue o .env novo sem restart
dotenv.config({ override: true });

const client = new MercadoPagoConfig({ 
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || '' 
});

export const createPaymentPreference = async (order) => {
  const preference = new Preference(client);

  const frontendUrl = (process.env.FRONTEND_URL && process.env.FRONTEND_URL !== 'INSIRA_O_VALOR_AQUI') 
    ? process.env.FRONTEND_URL.replace(/\/$/, '') 
    : 'http://localhost:5173';

  let webhookUrl = (process.env.WEBHOOK_URL && process.env.WEBHOOK_URL !== 'INSIRA_O_VALOR_AQUI')
    ? process.env.WEBHOOK_URL.replace(/\/$/, '')
    : null;

  // Automação DevOps: Se não houver WEBHOOK_URL manual, usamos o NGROK_DOMAIN estático
  if (!webhookUrl && process.env.NGROK_DOMAIN && process.env.NGROK_DOMAIN !== 'INSIRA_O_VALOR_AQUI') {
    webhookUrl = `https://${process.env.NGROK_DOMAIN.replace(/\/$/, '')}`;
  }

  const isLocal = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
  
  // ESTRATÉGIA ASSERTIVA: Se temos um túnel HTTPS (ngrok), usamos ele para TUDO.
  const redirectBase = (isLocal && webhookUrl) ? webhookUrl : frontendUrl;

  const body = {
    binary_mode: true, // FORÇA APROVAÇÃO OU RECUSA IMEDIATA (Sem "Processando")
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
    // Removemos o payer para que você preencha como CONVIDADO na tela
    back_urls: {
      success: `${redirectBase}/sucesso`,
      failure: `${redirectBase}/falha`,
      pending: `${redirectBase}/meus-pedidos`
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

export const getMerchantOrderDetails = async (merchantOrderId) => {
  try {
    const response = await fetch(`https://api.mercadopago.com/merchant_orders/${merchantOrderId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`
      }
    });
    return await response.json();
  } catch (error) {
    console.error("Error fetching merchant order details:", error);
    throw new Error('Error verifying merchant order on Mercado Pago.');
  }
};
