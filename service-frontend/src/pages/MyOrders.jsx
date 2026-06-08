import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Package, ShoppingBag, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { useToast } from '@/components/ui/toast';

export default function MyOrders() {
  const [compras, setCompras] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('compras'); // 'compras' ou 'vendas'
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    async function fetchOrders() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      // Fetch orders where I am the buyer or the seller
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          listings (title, image_urls, price)
        `)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (!error) {
        setCompras(data.filter(p => p.buyer_id === user.id));
        setVendas(data.filter(p => p.seller_id === user.id));
      }
      setLoading(false);
    }
    fetchOrders();
  }, [navigate]);

  const handleConfirmReceipt = async (pedidoId) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'completed' })
      .eq('id', pedidoId);

    if (!error) {
      setCompras(prev => prev.map(p => p.id === pedidoId ? { ...p, status: 'completed' } : p));
      toast.success('Recebimento confirmado!');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
      paid: "bg-blue-100 text-blue-700 border-blue-200",
      completed: "bg-[var(--green-100)] text-[var(--green-700)] border-[var(--green-100)]",
      cancelled: "bg-red-100 text-red-700 border-red-200",
    };

    const labels = {
      pending: "Aguardando pagamento",
      paid: "Pago, aguardando entrega",
      completed: "Concluído",
      cancelled: "Cancelado"
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || "bg-[var(--gray-100)] text-[var(--gray-600)]"}`}>
        {labels[status] || (status || '').toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="app-page flex items-center justify-center">
        <div className="empty-panel max-w-md">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--green-700)]/30 border-t-[var(--green-700)]" />
          <span className="text-sm">Carregando seus pedidos...</span>
        </div>
      </div>
    );
  }

  const activeOrders = tab === 'compras' ? compras : vendas;

  return (
    <div className="app-page">
      <div className="app-page-header">
        <div className="app-page-header-inner">
          <button type="button" className="app-back-button" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
            Voltar
          </button>
        </div>
      </div>

      <main className="page-shell">

      <header className="mb-8 text-center">
        <div>
          <h1 className="page-title">Gerenciar pedidos</h1>
          <p className="text-[var(--gray-600)]">Acompanhe suas transações na plataforma</p>
        </div>
      </header>

      {/* Abas de Navegação */}
      <div className="mx-auto mb-8 grid max-w-2xl grid-cols-2 rounded-[var(--radius-lg)] bg-white p-1 shadow-sm ring-1 ring-[var(--gray-100)]">
        <button 
          onClick={() => setTab('compras')}
          className={`rounded-[var(--radius-md)] px-4 py-3 font-semibold transition-colors ${tab === 'compras' ? 'bg-[var(--green-700)] text-white shadow-sm' : 'text-[var(--gray-400)] hover:bg-[var(--gray-50)] hover:text-[var(--gray-900)]'}`}
        >
          <div className="flex items-center justify-center">
            <ShoppingBag className="mr-2 h-5 w-5" /> Minhas Compras ({compras.length})
          </div>
        </button>
        <button 
          onClick={() => setTab('vendas')}
          className={`rounded-[var(--radius-md)] px-4 py-3 font-semibold transition-colors ${tab === 'vendas' ? 'bg-[var(--green-700)] text-white shadow-sm' : 'text-[var(--gray-400)] hover:bg-[var(--gray-50)] hover:text-[var(--gray-900)]'}`}
        >
          <div className="flex items-center justify-center">
            <Package className="mr-2 h-5 w-5" /> Minhas Vendas ({vendas.length})
          </div>
        </button>
      </div>

      {/* Lista de Pedidos */}
      <div className="space-y-4">
        {activeOrders.length === 0 ? (
          <div className="empty-panel">
            <p className="text-[var(--gray-400)]">Nenhum pedido encontrado nesta categoria.</p>
          </div>
        ) : (
          activeOrders.map((pedido) => (
            <div key={pedido.id} className="surface-card p-5 transition-shadow hover:shadow-md">
              <div className="grid gap-5 md:grid-cols-[1fr_auto_auto] md:items-center">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-[var(--gray-100)]">
                    <img 
                      src={pedido.listings?.image_urls?.[0] || 'https://via.placeholder.com/150'} 
                      alt={pedido.listings?.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--gray-900)]">{pedido.listings?.title}</h3>
                    <p className="text-sm text-[var(--gray-400)]">Pedido #{pedido.id.slice(0, 8)}</p>
                    <p className="text-xs text-[var(--gray-400)]">Em {new Date(pedido.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>

                <div className="flex flex-col items-start md:items-end">
                  <span className="text-lg font-bold text-[var(--gray-900)]">
                    R$ {(pedido.total_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <div className="mt-2">
                    {getStatusBadge(pedido.status)}
                  </div>
                </div>

                <div className="w-full md:w-auto mt-4 md:mt-0">
                  {tab === 'compras' && (pedido.status === 'paid') && (
                    <Button 
                      variant="outline" 
                      className="w-full text-[var(--green-700)] border-[var(--green-700)]/20 hover:bg-[var(--green-50)]"
                      onClick={() => handleConfirmReceipt(pedido.id)}
                    >
                      Confirmar Recebimento
                    </Button>
                  )}
                  {tab === 'vendas' && pedido.status === 'paid' && (
                    <p className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600">
                      <ShieldCheck className="h-4 w-4" />
                      Pagamento retido
                    </p>
                  )}
                  {(pedido.status === 'pending' || pedido.status === 'pendente') && tab === 'compras' && (
                    <Button 
                      variant="default" 
                      className="w-full bg-[var(--green-700)] hover:bg-[var(--green-800)]"
                      onClick={() => navigate(`/checkout/${pedido.id}`)}
                    >
                      Pagar Agora
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      </main>
    </div>
  );
}
