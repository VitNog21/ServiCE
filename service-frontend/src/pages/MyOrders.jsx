import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Package, ShoppingBag, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { useToast } from '@/components/ui/toast';
// Importando o CSS para manter a estrutura dos botões e do header
import '../css/my-listings.css';

export default function MyOrders() {
  const [compras, setCompras] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('compras'); // 'compras' ou 'vendas'
  const navigate = useNavigate();
  const { toast } = useToast();

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

      if (!error && data) {
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
      toast({ title: 'Sucesso', description: 'Recebimento confirmado!' });
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: "bg-amber-500 text-white shadow-sm",
      paid: "bg-blue-500 text-white shadow-sm",
      completed: "bg-emerald-600 text-white shadow-sm",
      cancelled: "bg-red-500 text-white shadow-sm",
    };

    const labels = {
      pending: "Aguardando Pagamento",
      paid: "Pago",
      completed: "Concluído",
      cancelled: "Cancelado"
    };

    return (
      <span className={`absolute top-2 left-2 z-10 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${styles[status] || "bg-slate-500 text-white"}`}>
        {labels[status] || (status || '').toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="my-listings-container">
        <div className="loading-state">Carregando os seus pedidos...</div>
      </div>
    );
  }

  const activeOrders = tab === 'compras' ? compras : vendas;

  return (
    <div className="my-listings-container">
      
      {/* HEADER DA PÁGINA */}
      <div className="my-listings-header-section">
        <Button variant="ghost" className="mb-4 hover:bg-[var(--gray-100)]" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>

        <div className="my-listings-header-content">
          <div>
            <h1>Meus Pedidos</h1>
            <p>Acompanhe suas compras e vendas na plataforma.</p>
          </div>
        </div>
      </div>

      {/* ABAS (TABS) - BLINDADAS CONTRA ZOOM E ESCALA */}
      <div className="listings-tabs-container mb-8">
        <button
          type="button"
          className={`tab-button focus:outline-none ${tab === 'compras' ? 'active' : ''}`}
          style={{ touchAction: 'manipulation', transform: 'none' }} // Impede zoom e pulos no clique
          onClick={() => setTab('compras')}
        >
          <ShoppingBag className="h-4 w-4 mr-2 inline" />
          <span className="font-semibold text-base">Minhas Compras</span>
          <span 
            className="ml-2 inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold" 
            style={{backgroundColor: tab === 'compras' ? 'var(--green-700)' : 'var(--gray-200)', color: tab === 'compras' ? 'white' : 'var(--gray-600)'}}
          >
            {compras.length}
          </span>
        </button>

        <button
          type="button"
          className={`tab-button focus:outline-none ${tab === 'vendas' ? 'active' : ''}`}
          style={{ touchAction: 'manipulation', transform: 'none' }} // Impede zoom e pulos no clique
          onClick={() => setTab('vendas')}
        >
          <Package className="h-4 w-4 mr-2 inline" />
          <span className="font-semibold text-base">Minhas Vendas</span>
          <span 
            className="ml-2 inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold" 
            style={{backgroundColor: tab === 'vendas' ? 'var(--green-700)' : 'var(--gray-200)', color: tab === 'vendas' ? 'white' : 'var(--gray-600)'}}
          >
            {vendas.length}
          </span>
        </button>
      </div>

      {/* ÁREA DOS RESULTADOS (Altura mínima aplicada para evitar colapso da tela) */}
      <div className="w-full min-h-[60vh] pb-10">
        {activeOrders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <h2>{tab === 'compras' ? 'Você ainda não fez nenhuma compra' : 'Você ainda não fez nenhuma venda'}</h2>
            <p>Quando houver uma transação, ela aparecerá aqui.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
            {activeOrders.map((pedido) => (
              <div key={pedido.id} className="listing-card w-full">
                
                {/* IMAGEM E PREVIEW */}
                <div className="listing-hero">
                  <div className="listing-image-wrapper">
                    <img 
                      src={pedido.listings?.image_urls?.[0] || 'https://via.placeholder.com/400?text=Sem+Foto'} 
                      alt={pedido.listings?.title} 
                      className="listing-image" 
                    />
                    {getStatusBadge(pedido.status)}
                  </div>
                  
                  <div className="listing-preview">
                    <span className="listing-category">Pedido #{pedido.id.slice(0, 8)}</span>
                    <h3 className="listing-item-title">{pedido.listings?.title || 'Serviço excluído'}</h3>
                    <p className="text-[11px] text-slate-400 mt-1 font-medium">Em {new Date(pedido.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                
                {/* PREÇO E AÇÕES */}
                <div className="listing-info flex-col items-start gap-4">
                  <div className="listing-price">
                    R$ {(pedido.total_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  
                  <div className="w-full">
                    {/* Botão: Confirmar Recebimento */}
                    {tab === 'compras' && (pedido.status === 'paid') && (
                      <Button 
                        variant="outline" 
                        className="w-full text-emerald-700 border-emerald-200 hover:bg-emerald-50 h-10 font-bold"
                        onClick={() => handleConfirmReceipt(pedido.id)}
                      >
                        Confirmar Recebimento
                      </Button>
                    )}

                    {/* Etiqueta: Pagamento Retido */}
                    {tab === 'vendas' && pedido.status === 'paid' && (
                      <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 py-2.5 rounded-lg border border-blue-100">
                        <ShieldCheck className="h-4 w-4" />
                        Pagamento retido
                      </div>
                    )}

                    {/* Botão: Pagar Agora */}
                    {(pedido.status === 'pending' || pedido.status === 'pendente') && tab === 'compras' && (
                      <Button 
                        className="w-full bg-[#0A847C] hover:bg-[#085a51] text-white h-10 font-bold"
                        onClick={() => navigate(`/checkout/${pedido.id}`)}
                      >
                        Pagar Agora
                      </Button>
                    )}
                  </div>
                </div>
                
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}