import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import dotenv from 'dotenv';

dotenv.config();

const client = new MercadoPagoConfig({ 
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || '' 
});

export const createPaymentPreference = async (order) => {
  const preference = new Preference(client);

  const body = {
    items: [
      {
        id: String(order.listing_id || order.anuncio_id),
        title: `ServiCE Order #${order.id.slice(0,8)}`,
        unit_price: Number(order.total_price || order.valor_total),
        quantity: 1,
        currency_id: 'BRL'
      }
    ],
    back_urls: {
      success: 'http://localhost:5173/success',
      failure: 'http://localhost:5173/failure',
      pending: 'http://localhost:5173/failure'
    },
    notification_url: `${process.env.WEBHOOK_URL}/api/payments/webhook`,
    external_reference: String(order.id)
  };

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
