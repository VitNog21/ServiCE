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

  async testApprove(req, res) {
    const { orderId } = req.body;
    console.log('🧪 Simulação de aprovação manual para o pedido:', orderId);

    try {
      const { data: orderData } = await runOnOrderTables((orderTable) =>
        supabase.from(orderTable).update({ status: 'paid' }).eq('id', orderId).select('listing_id, seller_id').single()
      );

      if (orderData?.listing_id) {
        await supabase.from('listings').update({ status: 'sold' }).eq('id', orderData.listing_id);
        const { data: sellerProfile } = await supabase.from('profiles').select('sales_count').eq('id', orderData.seller_id).single();
        await supabase.from('profiles').update({ sales_count: (sellerProfile?.sales_count || 0) + 1 }).eq('id', orderData.seller_id);
        
        console.log(`✅ SIMULAÇÃO SUCESSO: Order ${orderId} paga.`);
        return res.status(200).json({ success: true });
      }
      return res.status(404).json({ error: 'Order not found' });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  async simulateExternal(req, res) {
    const { paymentId } = req.body;
    const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;

    console.log(`📡 Solicitando ao Mercado Pago simulação real para o pagamento: ${paymentId}`);

    try {
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}/simulate_payment?access_token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' })
      });

      if (response.ok) {
        console.log('✅ Comando de simulação aceito pelo Mercado Pago. Aguardando Webhook...');
        return res.status(200).json({ success: true, message: 'Simulação enviada! O Webhook deve chegar em segundos.' });
      } else {
        const errData = await response.json();
        return res.status(response.status).json({ error: errData });
      }
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  async webhook(req, res) {
    const { query, body } = req;
    console.log('🔔 Webhook received! Body:', JSON.stringify(body, null, 2));
    
    const topic = body.topic || query.topic || body.type;
    const resourceId = body.data?.id || query.id;

    try {
      let orderId = null;
      let isApproved = false;

      if (topic === 'payment' || topic === 'payment.updated') {
        const paymentDetails = await PaymentService.getPaymentDetails(resourceId);
        orderId = paymentDetails.external_reference;
        isApproved = (paymentDetails.status === 'approved');
        
        if (!isApproved) {
          console.log(`⚠️ Payment ${resourceId} NOT approved. Status: ${paymentDetails.status}, Detail: ${paymentDetails.status_detail}`);
        }
      } 
      else if (topic === 'merchant_order') {
        const merchantOrder = await PaymentService.getMerchantOrderDetails(resourceId);
        orderId = merchantOrder.external_reference;
        isApproved = (merchantOrder.status === 'closed' || merchantOrder.payments?.some(p => p.status === 'approved'));
      }

      if (isApproved && orderId) {
        // 1. Atualizar status do pedido para 'paid'
        const { data: orderData } = await runOnOrderTables((orderTable) =>
          supabase.from(orderTable).update({ status: 'paid' }).eq('id', orderId).select('listing_id, seller_id').single()
        );

        if (orderData?.listing_id) {
          // 2. Marcar anúncio como VENDIDO
          await supabase.from('listings').update({ status: 'sold' }).eq('id', orderData.listing_id);
          
          // 3. Incrementar contador de vendas do vendedor
          const { data: sellerProfile } = await supabase.from('profiles').select('sales_count').eq('id', orderData.seller_id).single();
          await supabase.from('profiles').update({ sales_count: (sellerProfile?.sales_count || 0) + 1 }).eq('id', orderData.seller_id);
          
          console.log(`✅ SUCCESS: Order ${orderId} marked as PAID. Listing ${orderData.listing_id} marked as SOLD.`);
        }
      }
    } catch (error) {
      console.error('❌ Error processing webhook:', error.message);
    }

    return res.status(200).send('OK');
  }
};
