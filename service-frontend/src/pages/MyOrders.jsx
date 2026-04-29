import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Package, ShoppingBag, CheckCircle2, Clock, AlertCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';

export default function MyOrders() {
  const [compras, setCompras] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('compras'); // 'compras' ou 'vendas'
  const navigate = useNavigate();

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

      if (error) {
        // Fallback for transition period
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('pedidos')
          .select(`
            *,
            anuncios (titulo, imagem_url, preco)
          `)
          .or(`comprador_id.eq.${user.id},vendedor_id.eq.${user.id}`)
          .order('data_criacao', { ascending: false });

        if (!fallbackError) {
          setCompras(fallbackData.filter(p => p.comprador_id === user.id).map(p => ({
            ...p,
            listing: p.anuncios,
            total_price: p.valor_total,
            created_at: p.data_criacao
          })));
          setVendas(fallbackData.filter(p => p.vendedor_id === user.id).map(p => ({
            ...p,
            listing: p.anuncios,
            total_price: p.valor_total,
            created_at: p.data_criacao
          })));
        }
      } else {
        setCompras(data.filter(p => p.buyer_id === user.id || p.comprador_id === user.id));
        setVendas(data.filter(p => p.seller_id === user.id || p.vendedor_id === user.id));
      }
      setLoading(false);
    }
    fetchOrders();
  }, [navigate]);

  const getStatusBadge = (status) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
      pendente: "bg-yellow-100 text-yellow-700 border-yellow-200",
      paid: "bg-blue-100 text-blue-700 border-blue-200",
      pago: "bg-blue-100 text-blue-700 border-blue-200",
      completed: "bg-green-100 text-green-700 border-green-200",
      concluido: "bg-green-100 text-green-700 border-green-200",
      cancelled: "bg-red-100 text-red-700 border-red-200",
      cancelado: "bg-red-100 text-red-700 border-red-200"
    };
    const icons = {
      pending: <Clock className="w-4 h-4 mr-1" />,
      pendente: <Clock className="w-4 h-4 mr-1" />,
      paid: <AlertCircle className="w-4 h-4 mr-1" />,
      pago: <AlertCircle className="w-4 h-4 mr-1" />,
      completed: <CheckCircle2 className="w-4 h-4 mr-1" />,
      concluido: <CheckCircle2 className="w-4 h-4 mr-1" />
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
        {icons[status]} {(status || '').toUpperCase()}
      </span>
    );
  };

  if (loading) return <div className="p-10 text-center">Carregando seus pedidos...</div>;

  const activeOrders = tab === 'compras' ? compras : vendas;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <Button type="button" variant="ghost" className="mb-4" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Button>

      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gerenciar Pedidos</h1>
          <p className="text-gray-500">Acompanhe suas transações na plataforma</p>
        </div>
      </header>

      {/* Abas de Navegação */}
      <div className="flex space-x-4 mb-6 border-b border-gray-200">
        <button 
          onClick={() => setTab('compras')}
          className={`pb-4 px-2 font-medium transition-colors ${tab === 'compras' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <div className="flex items-center">
            <ShoppingBag className="mr-2 h-5 w-5" /> Minhas Compras ({compras.length})
          </div>
        </button>
        <button 
          onClick={() => setTab('vendas')}
          className={`pb-4 px-2 font-medium transition-colors ${tab === 'vendas' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <div className="flex items-center">
            <Package className="mr-2 h-5 w-5" /> Minhas Vendas ({vendas.length})
          </div>
        </button>
      </div>

      {/* Lista de Pedidos */}
      <div className="space-y-4">
        {activeOrders.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <p className="text-gray-500">Nenhum pedido encontrado nesta categoria.</p>
          </div>
        ) : (
          activeOrders.map((pedido) => (
            <div key={pedido.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 bg-gray-100 rounded-lg overflow-hidden">
                    <img 
                      src={pedido.listings?.image_urls?.[0] || pedido.listings?.image_url || pedido.anuncios?.imagem_url || 'https://via.placeholder.com/150'} 
                      alt={pedido.listings?.title || pedido.anuncios?.titulo}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{pedido.listings?.title || pedido.anuncios?.titulo}</h3>
                    <p className="text-sm text-gray-500">Pedido #{pedido.id.slice(0, 8)}</p>
                    <p className="text-xs text-gray-400">Em {new Date(pedido.created_at || pedido.data_criacao).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <span className="text-lg font-bold text-gray-900">
                    R$ {(pedido.total_price || pedido.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <div className="mt-2">
                    {getStatusBadge(pedido.status)}
                  </div>
                </div>

                <div className="w-full md:w-auto mt-4 md:mt-0">
                  {tab === 'compras' && (pedido.status === 'paid' || pedido.status === 'pago') && (
                    <Button 
                      variant="outline" 
                      className="w-full text-green-600 border-green-200 hover:bg-green-50"
                      onClick={async () => {
                        const { table } = pedido;
                        await supabase.from(table || 'orders').update({ status: 'completed' }).eq('id', pedido.id);
                        window.location.reload();
                      }}
                    >
                      Confirmar Recebimento
                    </Button>
                  )}
                  {(pedido.status === 'pending' || pedido.status === 'pendente') && (
                    <Button 
                      variant="default" 
                      className="w-full"
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
    </div>
  );
}
