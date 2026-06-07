import { supabase } from './src/config/supabase.js';
import { runOnOrderTables } from './src/utils/orderTable.js';

/**
 * SCRIPT PARA SIMULAR PAGAMENTO APROVADO
 * Uso: node simulate_payment.js [ID_DO_PEDIDO]
 */

async function simulatePayment(orderId) {
  console.log(`🚀 Iniciando simulação de pagamento para o pedido: ${orderId}`);

  try {
    // 1. Buscar detalhes do pedido
    const { data: order, error: fetchError } = await runOnOrderTables((orderTable) =>
      supabase.from(orderTable).select('*').eq('id', orderId).single()
    );

    if (fetchError || !order) {
      console.error('❌ Pedido não encontrado:', fetchError?.message || 'ID inválido');
      return;
    }

    if (order.status === 'paid' || order.status === 'completed') {
      console.log('⚠️ Este pedido já está pago ou concluído.');
      return;
    }

    console.log('📦 Pedido encontrado. Atualizando status...');

    // 2. Atualizar status do pedido para 'paid'
    const { data: updatedOrder, error: updateError } = await runOnOrderTables((orderTable) =>
      supabase.from(orderTable)
        .update({ status: 'paid' })
        .eq('id', orderId)
        .select('listing_id, seller_id')
        .single()
    );

    if (updateError) {
      console.error('❌ Erro ao atualizar pedido:', updateError.message);
      return;
    }

    // 3. Marcar anúncio como VENDIDO
    if (updatedOrder?.listing_id) {
      const { error: listingError } = await supabase
        .from('listings')
        .update({ status: 'sold' })
        .eq('id', updatedOrder.listing_id);
      
      if (listingError) {
        console.error('❌ Erro ao atualizar anúncio:', listingError.message);
      } else {
        console.log(`✅ Anúncio ${updatedOrder.listing_id} marcado como VENDIDO.`);
      }
      
      // 4. Incrementar contador de vendas do vendedor
      const { data: sellerProfile } = await supabase
        .from('profiles')
        .select('sales_count')
        .eq('id', updatedOrder.seller_id)
        .single();

      await supabase
        .from('profiles')
        .update({ sales_count: (sellerProfile?.sales_count || 0) + 1 })
        .eq('id', updatedOrder.seller_id);
      
      console.log(`📈 Contador de vendas do vendedor ${updatedOrder.seller_id} incrementado.`);
    }

    console.log(`\n✨ SUCESSO! O pedido ${orderId} agora consta como PAGO.`);
    console.log('👉 Verifique a página "Meus Pedidos" no seu navegador.');

  } catch (error) {
    console.error('❌ Erro inesperado:', error);
  }
}

// Pega o ID do pedido via linha de comando
const orderId = process.argv[2];

if (!orderId) {
  console.log('❌ Erro: Forneça o ID do pedido.');
  console.log('Exemplo: node simulate_payment.js SEU_ID_AQUI');
  
  // Opcional: Listar pedidos pendentes para facilitar
  console.log('\n🔍 Buscando pedidos pendentes para você copiar o ID...');
  runOnOrderTables((orderTable) => 
    supabase.from(orderTable).select('id, total_price, status').eq('status', 'pending').limit(5)
  ).then(({data}) => {
    if (data && data.length > 0) {
      data.forEach(o => console.log(`- ID: ${o.id} | Valor: R$${o.total_price}`));
    } else {
      console.log('Nenhum pedido pendente encontrado.');
    }
  });
} else {
  simulatePayment(orderId);
}
