import { supabase } from '../config/supabase.js';

export const OrderController = {
  // Criar um novo pedido
  async createOrder(req, res) {
    const { anuncio_id, comprador_id, vendedor_id, valor_total } = req.body;

    const { data, error } = await supabase
      .from('pedidos')
      .insert([{ anuncio_id, comprador_id, vendedor_id, valor_total, status: 'pendente' }])
      .select();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json(data[0]);
  },

  // Listar pedidos de um usuário (compras ou vendas)
  async getUserOrders(req, res) {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('pedidos')
      .select(`
        *,
        listings (title, image_urls)
      `)
      .or(`comprador_id.eq.${userId},vendedor_id.eq.${userId}`)
      .order('data_criacao', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json(data);
  },

  // Confirmar pagamento (Simulação de Webhook)
  async confirmPayment(req, res) {
    const { orderId } = req.params;

    const { data, error } = await supabase
      .from('pedidos')
      .update({ status: 'paid' })
      .eq('id', orderId)
      .select();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ message: "Pagamento confirmado!", pedido: data[0] });
  }
};
