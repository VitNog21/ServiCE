import * as PaymentService from '../services/PaymentService.js';
import { supabase } from '../config/supabase.js';
import { runOnOrderTables } from '../utils/orderTable.js';

export const PaymentController = {
  async createCheckout(req, res) {
    const { orderId } = req.body;
    console.log('Backend received order ID:', orderId);

    try {
      const { data: order, error } = await runOnOrderTables((orderTable) =>
        supabase.from(orderTable).select('*').eq('id', orderId).single()
      );

      if (error || !order) {
        console.error('Order not found or Supabase error:', error?.message || 'Inexistent ID');
        return res.status(404).json({ error: 'Order not found', details: error?.message });
      }

      const preference = await PaymentService.createPaymentPreference(order);

      return res.status(200).json({
        checkout_url: preference.init_point,
        preference_id: preference.id
      });
    } catch (error) {
      console.error('Mercado Pago API error:', error.message || error);
      return res.status(500).json({ error: 'Failed to create payment session.', details: error.message });
    }
  },

  async webhook(req, res) {
    const { type, data } = req.body;

    if (type === 'payment') {
      try {
        const paymentDetails = await PaymentService.getPaymentDetails(data.id);
        const orderId = paymentDetails.external_reference;

        if (paymentDetails.status === 'approved') {
          const { error } = await runOnOrderTables((orderTable) =>
            supabase.from(orderTable).update({ status: 'paid' }).eq('id', orderId)
          );

          if (error) {
            throw error;
          }

          console.log(`Order ${orderId} updated to paid via webhook.`);
        }
      } catch (error) {
        console.error('Error processing webhook:', error);
      }
    }

    return res.status(200).send('OK');
  }
};
