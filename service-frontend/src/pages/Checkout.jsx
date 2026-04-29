import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { CreditCard, ArrowLeft, ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Checkout() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchOrder() {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            listings (title, price, image_urls)
          `)
          .eq('id', orderId)
          .single();

        if (error) throw error;
        setOrder(data);
      } catch (err) {
        console.error('Error fetching order:', err);
        setError('Pedido não encontrado.');
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [orderId]);

  const handlePayment = async () => {
    setProcessing(true);
    try {
      const response = await fetch('http://localhost:3000/api/payments/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
      });

      const data = await response.json();

      if (data.checkout_url) {
        // Redireciona para o Mercado Pago
        window.location.href = data.checkout_url;
      } else {
        throw new Error(data.error || 'Erro ao gerar link de pagamento');
      }
    } catch (err) {
      console.error('Payment error:', err);
      alert('Erro ao processar pagamento: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-[#0A847C]" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <p className="text-xl font-semibold text-slate-900">{error || 'Pedido inválido'}</p>
        <Button onClick={() => navigate('/')} className="mt-4 bg-[#0A847C]">Voltar à Home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-8 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="font-medium">Voltar</span>
        </button>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-[#0A847C] p-6 text-white text-center">
            <h1 className="text-2xl font-bold">Finalizar Pagamento</h1>
            <p className="opacity-90">Pedido #{order.id.slice(0, 8)}</p>
          </div>

          <div className="p-8">
            {/* Resumo do Produto */}
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl mb-8">
              <img 
                src={order.listings?.image_urls?.[0] || 'https://via.placeholder.com/100'} 
                alt={order.listings?.title}
                className="w-20 h-20 rounded-lg object-cover"
              />
              <div>
                <h3 className="font-bold text-slate-900">{order.listings?.title}</h3>
                <p className="text-[#0A847C] font-bold">
                  R$ {Number(order.total_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <CreditCard className="h-6 w-6 text-blue-600" />
                <div>
                  <p className="font-semibold text-blue-900 text-sm">Mercado Pago</p>
                  <p className="text-xs text-blue-700">Pagamento 100% seguro via Cartão, Pix ou Boleto.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <ShieldCheck className="h-6 w-6 text-emerald-600" />
                <p className="text-xs text-emerald-700 leading-relaxed">
                  Garantia ServiCE: Seu dinheiro fica protegido conosco até que você confirme a conclusão do serviço.
                </p>
              </div>

              <Button 
                onClick={handlePayment}
                disabled={processing}
                className="w-full h-14 text-lg font-bold bg-[#10B981] hover:bg-[#059669] text-white rounded-xl shadow-lg transition-all"
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processando...
                  </>
                ) : (
                  'Pagar com Mercado Pago'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
