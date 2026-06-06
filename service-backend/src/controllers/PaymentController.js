import * as PaymentService from '../services/PaymentService.js';
import { supabase } from '../config/supabase.js';
import { runOnOrderTables } from '../utils/orderTable.js';

export const PaymentController = {
  async createCheckout(req, res) {
    const { orderId } = req.body;
    console.log('Backend received order ID:', orderId);

    try {
      console.log('Fetching order details for ID:', orderId);
      const { data: order, error } = await runOnOrderTables((orderTable) =>
        supabase.from(orderTable).select('*, listings(title)').eq('id', orderId).single()
      );

      if (error || !order) {
        console.error('Order not found or Supabase error:', error?.message || 'Inexistent ID');
        return res.status(404).json({ error: 'Order not found', details: error?.message });
      }

      console.log('Creating preference for order:', order.id);
      const preference = await PaymentService.createPaymentPreference(order);
      console.log('Preference created successfully:', preference.id);

      return res.status(200).json({
        checkout_url: preference.init_point,
        preference_id: preference.id
      });
    } catch (error) {
      console.error('Mercado Pago API error details:', error);
      return res.status(500).json({ error: 'Failed to create payment session.', details: error.message });
    }
  },

  async webhook(req, res) {
    const { query, body } = req;
    const type = body.type || query.topic || query.type;
    const paymentId = body.data?.id || query.id;

    if (type === 'payment' || type === 'payment.updated') {
      try {
        if (!paymentId) return res.status(200).send('OK');

        const paymentDetails = await PaymentService.getPaymentDetails(paymentId);
        const orderId = paymentDetails.external_reference;

        if (paymentDetails.status === 'approved') {
          // 1. Atualizar status do pedido para 'paid'
          const { data: orderData } = await runOnOrderTables((orderTable) =>
            supabase.from(orderTable).update({ status: 'paid' }).eq('id', orderId).select('listing_id, seller_id').single()
          );

          // 2. Marcar anúncio como VENDIDO
          if (orderData?.listing_id) {
            await supabase.from('listings').update({ status: 'sold' }).eq('id', orderData.listing_id);
            
            // 3. Incrementar contador de vendas do vendedor
            const { data: sellerProfile } = await supabase.from('profiles').select('sales_count').eq('id', orderData.seller_id).single();
            await supabase.from('profiles').update({ sales_count: (sellerProfile?.sales_count || 0) + 1 }).eq('id', orderData.seller_id);
            
            console.log(`✅ Order ${orderId} paid. Listing ${orderData.listing_id} marked as SOLD.`);
          }
        }
      } catch (error) {
        console.error('Error processing webhook:', error);
      }
    }

    return res.status(200).send('OK');
  }
};
