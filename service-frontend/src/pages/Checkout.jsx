import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { 
  CreditCard, ArrowLeft, ShieldCheck, Loader2, 
  QrCode, CheckCircle2, Wallet, Lock 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Checkout() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  
  // Estados para o fluxo de pagamento
  const [step, setStep] = useState('summary'); // 'summary' | 'method' | 'simulated-payment'
  const [method, setMethod] = useState(null); // 'pix' | 'card'

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

  const handleSimulateSuccess = async () => {
    setProcessing(true);
    try {
      // Simula um pequeno delay de rede para parecer real
      await new Promise(r => setTimeout(r, 1500));
      
      const response = await fetch('http://localhost:3000/api/payments/test-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      if (response.ok) {
        navigate('/sucesso');
      }
    } catch (err) {
      alert('Erro na comunicação com o servidor de pagamentos.');
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

  // RENDERIZAÇÃO POR ETAPAS
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 font-sans">
      <div className="max-w-2xl mx-auto">
        
        {/* Header de Navegação */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => step === 'summary' ? navigate(-1) : setStep('summary')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Voltar</span>
          </button>
          <div className="flex gap-2">
            {[1, 2, 3].map((s) => (
              <div 
                key={s} 
                className={`h-1.5 w-12 rounded-full transition-all ${
                  (s === 1 && step === 'summary') || 
                  (s === 2 && step === 'method') || 
                  (s === 3 && step === 'simulated-payment') 
                    ? 'bg-[#0A847C] w-16' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
          
          {/* TOPO DO CARD */}
          <div className="bg-slate-900 p-8 text-white">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold mb-1">Finalizar Pedido</h1>
                <p className="text-slate-400 text-sm font-mono">Ref: {order.id.slice(0, 12)}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Total a pagar</p>
                <p className="text-3xl font-black text-emerald-400 font-mono">
                  R$ {Number(order.total_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          <div className="p-8">
            
            {/* ETAPA 1: RESUMO DO PEDIDO */}
            {step === 'summary' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="relative">
                    <img 
                      src={order.listings?.image_urls?.[0] || 'https://via.placeholder.com/100'} 
                      alt={order.listings?.title}
                      className="w-24 h-24 rounded-xl object-cover shadow-md"
                    />
                    <div className="absolute -top-2 -right-2 bg-[#0A847C] text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg">
                      1 UN
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900 text-lg leading-tight mb-1">{order.listings?.title}</h3>
                    <p className="text-slate-500 text-sm">Contratação via ServiCE Pay 🛡️</p>
                    <div className="mt-3 flex items-center gap-2 text-emerald-600 font-bold">
                      <ShieldCheck size={16} />
                      <span className="text-xs uppercase">Pagamento Protegido</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <Button 
                    onClick={() => setStep('method')}
                    className="w-full h-16 text-lg font-bold bg-[#0A847C] hover:bg-[#085a51] text-white rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3"
                  >
                    Seguir para o Pagamento
                    <ArrowLeft size={20} className="rotate-180" />
                  </Button>
                  <p className="text-center text-slate-400 text-xs">
                    Ao continuar, você concorda com nossos termos de proteção ao comprador.
                  </p>
                </div>
              </div>
            )}

            {/* ETAPA 2: ESCOLHA DO MÉTODO */}
            {step === 'method' && (
              <div className="space-y-6 animate-in slide-in-from-right duration-300">
                <h2 className="text-lg font-bold text-slate-800 mb-4 text-center">Como deseja pagar?</h2>
                
                <div className="grid grid-cols-1 gap-4">
                  <button 
                    onClick={() => { setMethod('pix'); setStep('simulated-payment'); }}
                    className="flex items-center justify-between p-6 border-2 border-slate-100 rounded-2xl hover:border-[#0A847C] hover:bg-emerald-50 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600 group-hover:bg-emerald-200">
                        <QrCode size={24} />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-slate-900 text-lg">PIX</p>
                        <p className="text-slate-500 text-xs">Aprovação instantânea</p>
                      </div>
                    </div>
                    <div className="w-6 h-6 rounded-full border-2 border-slate-200 group-hover:border-[#0A847C] flex items-center justify-center">
                      <div className="w-3 h-3 bg-[#0A847C] rounded-full scale-0 group-hover:scale-100 transition-transform" />
                    </div>
                  </button>

                  <button 
                    onClick={() => { setMethod('card'); setStep('simulated-payment'); }}
                    className="flex items-center justify-between p-6 border-2 border-slate-100 rounded-2xl hover:border-[#0A847C] hover:bg-emerald-50 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-100 p-3 rounded-xl text-blue-600 group-hover:bg-blue-200">
                        <CreditCard size={24} />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-slate-900 text-lg">Cartão de Crédito</p>
                        <p className="text-slate-500 text-xs">Até 12x com juros</p>
                      </div>
                    </div>
                    <div className="w-6 h-6 rounded-full border-2 border-slate-200 group-hover:border-[#0A847C] flex items-center justify-center">
                      <div className="w-3 h-3 bg-[#0A847C] rounded-full scale-0 group-hover:scale-100 transition-transform" />
                    </div>
                  </button>
                </div>

                <div className="pt-6 flex items-center justify-center gap-2 text-slate-400">
                  <Lock size={14} />
                  <span className="text-[10px] uppercase font-bold tracking-widest">Ambiente Criptografado e Seguro</span>
                </div>
              </div>
            )}

            {/* ETAPA 3: SIMULAÇÃO DE PAGAMENTO */}
            {step === 'simulated-payment' && (
              <div className="space-y-8 animate-in zoom-in-95 duration-300">
                {method === 'pix' ? (
                  <div className="text-center space-y-6 py-4">
                    <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 inline-block shadow-lg mx-auto">
                      <QrCode size={180} className="text-slate-800" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">Escaneie o QR Code</h3>
                      <p className="text-slate-500 text-sm max-w-xs mx-auto mt-2">
                        Utilize o app do seu banco para realizar o pagamento instantâneo via PIX.
                      </p>
                    </div>
                    
                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-center justify-between font-mono text-xs text-emerald-700">
                      <span className="truncate">00020126580014BR.GOV.BCB.PIX...</span>
                      <Button variant="ghost" className="text-emerald-700 h-8 font-bold">COPIAR</Button>
                    </div>

                    <Button 
                      onClick={handleSimulateSuccess}
                      disabled={processing}
                      className="w-full h-16 text-lg font-bold bg-[#10B981] hover:bg-[#059669] text-white rounded-2xl shadow-xl transition-all"
                    >
                      {processing ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="animate-spin" />
                          Processando Pagamento...
                        </div>
                      ) : (
                        'Confirmar Pagamento Simulado'
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl text-white shadow-2xl relative overflow-hidden h-48 flex flex-col justify-between">
                      <div className="flex justify-between items-start relative z-10">
                        <div className="w-12 h-10 bg-yellow-400/20 rounded-lg" />
                        <CheckCircle2 className="text-slate-600" />
                      </div>
                      <div className="relative z-10">
                        <p className="font-mono text-xl tracking-[0.25em]">**** **** **** 1234</p>
                        <div className="flex justify-between items-end mt-4">
                          <p className="font-mono text-sm uppercase">VOCÊ É SÊNIOR</p>
                          <p className="font-mono text-sm">12/30</p>
                        </div>
                      </div>
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Número do Cartão</label>
                        <Input disabled placeholder="5031 4332 1540 6351" className="bg-slate-50 border-slate-200" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Validade</label>
                        <Input disabled placeholder="11/30" className="bg-slate-50 border-slate-200" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">CVV</label>
                        <Input disabled placeholder="***" className="bg-slate-50 border-slate-200" />
                      </div>
                    </div>

                    <Button 
                      onClick={handleSimulateSuccess}
                      disabled={processing}
                      className="w-full h-16 text-lg font-bold bg-[#10B981] hover:bg-[#059669] text-white rounded-2xl shadow-xl transition-all mt-4"
                    >
                      {processing ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="animate-spin" />
                          Validando Cartão...
                        </div>
                      ) : (
                        'Pagar com Cartão Simulado'
                      )}
                    </Button>
                  </div>
                )}
                <div className="text-center">
                  <button onClick={() => setStep('method')} className="text-slate-400 text-xs hover:text-[#0A847C] transition-colors underline underline-offset-4">
                    Alterar método de pagamento
                  </button>
                </div>
              </div>
            )}

            {/* Selo de Segurança no Rodapé do Card */}
            <div className="mt-8 pt-8 border-t border-slate-100 flex items-center justify-center gap-4 opacity-50 grayscale hover:grayscale-0 transition-all">
              <div className="flex items-center gap-1">
                <Lock size={12} className="text-slate-400" />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Secure SSL</span>
              </div>
              <div className="h-4 w-[1px] bg-slate-200" />
              <div className="flex items-center gap-1">
                <CheckCircle2 size={12} className="text-slate-400" />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Verified PCI</span>
              </div>
              <div className="h-4 w-[1px] bg-slate-200" />
              <div className="flex items-center gap-1">
                <Wallet size={12} className="text-slate-400" />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Safe Pay</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
