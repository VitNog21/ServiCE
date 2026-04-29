import { supabase } from '../config/supabase.js';
import { runOnOrderTables } from '../utils/orderTable.js';

export const OrderController = {
  // Create a new order
  async createOrder(req, res) {
    const { listing_id, buyer_id, seller_id, total_price, anuncio_id, comprador_id, vendedor_id, valor_total } = req.body;

    const { data, error, table } = await runOnOrderTables((orderTable) =>
      supabase
        .from(orderTable)
        .insert([{ 
          listing_id: listing_id || anuncio_id, 
          buyer_id: buyer_id || comprador_id, 
          seller_id: seller_id || vendedor_id, 
          total_price: total_price || valor_total, 
          status: 'pending' 
        }])
        .select()
    );

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(201).json({ ...data[0], table });
  },

  // List user orders (purchases or sales)
  async getUserOrders(req, res) {
    const { userId } = req.params;

    const { data, error, table } = await runOnOrderTables((orderTable) =>
      supabase
        .from(orderTable)
        .select(`
          *,
          listings (title, image_urls, price)
        `)
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId},comprador_id.eq.${userId},vendedor_id.eq.${userId}`)
        .order('created_at', { ascending: false })
    );

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ table, orders: data });
  },

  // Confirm payment (Webhook simulation)
  async confirmPayment(req, res) {
    const { orderId } = req.params;

    const { data, error, table } = await runOnOrderTables((orderTable) =>
      supabase.from(orderTable).update({ status: 'paid' }).eq('id', orderId).select()
    );

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ message: 'Payment confirmed!', order: data[0], table });
  }
};
