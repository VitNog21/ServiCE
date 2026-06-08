import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import {
  CreditCard, ArrowLeft, ShieldCheck, Loader2,
  QrCode, CheckCircle2, Wallet, Lock, ChevronRight, Copy, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const priceFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

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
      await new Promise(r => setTimeout(r, 1500));
      const response = await fetch('http://localhost:3000/api/payments/test-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      if (response.ok) {
        navigate('/sucesso');
      }
    } catch {
      alert('Erro na comunicação com o servidor de pagamentos.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="h-10 w-10 animate-spin text-[#0D6E56]" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white p-4">
        <p className="text-xl font-semibold text-slate-900">{error || 'Pedido inválido'}</p>
        <Button onClick={() => navigate('/')} className="mt-4 rounded-xl bg-[#0D6E56] text-white hover:bg-[#0A4F3E]">
          Voltar à Home
        </Button>
      </div>
    );
  }

  const formattedTotal = `R$ ${priceFormatter.format(Number(order.total_price))}`;
  const title = order.listings?.title || 'Pedido';
  const thumbnail = order.listings?.image_urls?.[0] || 'https://via.placeholder.com/64';

  return (
    <div className="min-h-screen bg-[#F5F5F5] px-5 py-8 font-[-apple-system,BlinkMacSystemFont,'Inter','SF_Pro_Display','Segoe_UI',sans-serif] animate-in fade-in duration-200">
      <div className="mx-auto w-full max-w-5xl pb-[max(24px,env(safe-area-inset-bottom))]">
        <div className="mb-8 flex items-center justify-between rounded-[16px] bg-white px-5 py-4 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
          <button
            onClick={() => step === 'summary' ? navigate(-1) : setStep('summary')}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F5F5] text-slate-600 transition-all hover:bg-slate-200 active:scale-[0.97]"
            aria-label="Voltar"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-slate-500">
            {step === 'summary' ? 'Resumo do pedido' : step === 'method' ? 'Pagamento' : 'Finalizar'}
          </h2>
          <div className="flex w-10 justify-end">
            <ShieldCheck size={18} className="text-[#0D6E56]" />
          </div>
        </div>

        {step === 'summary' && (
          <div className="grid gap-6 animate-in fade-in duration-200 lg:grid-cols-[1fr_360px]">
            <section className="rounded-[16px] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.08)] md:p-8">
            <div>
              <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.06em] text-slate-500">Resumo do pedido</p>
              <h1 className="text-[30px] font-semibold leading-tight text-[#111827]">Revise sua compra</h1>
              <p className="mt-2 text-[16px] font-normal leading-6 text-slate-500">
                Confira os dados antes de escolher a forma de pagamento.
              </p>
            </div>

            <div className="mt-8 rounded-[16px] border border-slate-100 bg-white p-5">
              <div className="flex items-center gap-5">
                <img
                  src={thumbnail}
                  alt={title}
                  className="h-24 w-24 rounded-[16px] object-cover"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="mb-3 text-[20px] font-semibold leading-tight text-[#111827]">{title}</h3>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-[#F0FAF6] px-2.5 py-1 text-[#0D6E56]">
                    <ShieldCheck size={14} />
                    <span className="text-[12px] font-medium">Pagamento protegido</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-end justify-between border-t border-slate-100 pt-5">
                <div>
                  <p className="mb-1 text-[12px] font-medium uppercase tracking-[0.06em] text-slate-500">Preço total</p>
                  <p className="text-[34px] font-bold leading-none text-[#0D6E56]">{formattedTotal}</p>
                </div>
              </div>
            </div>
            </section>

            <aside className="rounded-[16px] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
              <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-slate-500">Total</p>
              <p className="mt-2 text-[32px] font-bold text-[#0D6E56]">{formattedTotal}</p>
              <Button
                onClick={() => setStep('method')}
                className="mt-6 flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] border-none bg-[#0D6E56] text-[16px] font-semibold text-white shadow-lg shadow-emerald-900/10 transition-all hover:bg-[#0A4F3E] active:scale-[0.97]"
              >
                Seguir para Pagamento
                <ChevronRight size={18} />
              </Button>
              <div className="mt-6 rounded-[14px] bg-[#F0FAF6] p-4 text-sm leading-6 text-[#0D6E56]">
                <div className="mb-1 flex items-center gap-2 font-semibold">
                  <ShieldCheck size={18} />
                  Pagamento protegido
                </div>
                O valor fica protegido até a conclusão do serviço.
              </div>
            </aside>
          </div>
        )}

        {step === 'method' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="text-center">
              <h1 className="text-[24px] font-semibold text-[#111827]">Como deseja pagar?</h1>
              <p className="mt-2 text-[16px] font-normal leading-6 text-slate-500">
                Escolha um método para finalizar a compra com segurança.
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => { setMethod('pix'); setStep('simulated-payment'); }}
                className={`flex w-full items-center justify-between rounded-[16px] border-2 p-5 shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-200 ease-in-out active:scale-[0.97] ${method === 'pix' ? 'border-[#0D6E56] bg-[#F0FAF6]' : 'border-slate-100 bg-white hover:border-slate-200'}`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-emerald-100 text-[#0D6E56]">
                    <QrCode size={22} />
                  </div>
                  <div className="text-left">
                    <p className="text-[16px] font-medium text-[#111827]">PIX</p>
                    <p className="text-[13px] text-slate-500">Aprovação instantânea</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-300" />
              </button>

              <button
                onClick={() => { setMethod('card'); setStep('simulated-payment'); }}
                className={`flex w-full items-center justify-between rounded-[16px] border-2 p-5 shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-200 ease-in-out active:scale-[0.97] ${method === 'card' ? 'border-[#0D6E56] bg-[#F0FAF6]' : 'border-slate-100 bg-white hover:border-slate-200'}`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-blue-100 text-blue-600">
                    <CreditCard size={22} />
                  </div>
                  <div className="text-left">
                    <p className="text-[16px] font-medium text-[#111827]">Cartão de crédito</p>
                    <p className="text-[13px] text-slate-500">Até 12x com juros</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-300" />
              </button>
            </div>
          </div>
        )}

        {step === 'simulated-payment' && method === 'pix' && (
          <div className="space-y-6 text-center animate-in fade-in duration-200">
            <h1 className="text-[24px] font-semibold text-[#111827]">Pague com PIX</h1>

            <div className="inline-flex items-center justify-center gap-2 rounded-full bg-orange-50 px-4 py-2 text-[14px] font-semibold text-orange-600">
              <Clock size={16} />
              <span>Expira em 14:32</span>
            </div>

            <div className="mx-auto inline-block rounded-[16px] border border-slate-100 bg-white p-6 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
              <QrCode size={200} className="text-[#111827]" />
            </div>

            <div className="space-y-2">
              <p className="text-center text-[12px] font-medium uppercase tracking-[0.06em] text-slate-500">Código copia e cola</p>
              <div className="flex items-center justify-between overflow-hidden rounded-[12px] bg-[#F5F5F5] p-4 font-mono text-[11px] text-slate-600">
                <span className="mr-4 truncate">00020126580014BR.GOV.BCB.PIX0114...</span>
                <button className="flex shrink-0 items-center gap-1 font-semibold text-[#0D6E56] transition-all hover:opacity-80 active:scale-[0.97]">
                  <Copy size={14} />
                  Copiar
                </button>
              </div>
            </div>

            <Button
              onClick={handleSimulateSuccess}
              disabled={processing}
              className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#0D6E56] text-[16px] font-semibold text-white shadow-lg shadow-emerald-900/10 transition-all hover:bg-[#0A4F3E] active:scale-[0.97]"
            >
              {processing ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={20} />}
              {processing ? 'Confirmando...' : 'Confirmar pagamento'}
            </Button>
          </div>
        )}

        {step === 'simulated-payment' && method === 'card' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <h1 className="text-center text-[24px] font-semibold text-[#111827]">Dados do cartão</h1>

            <div className="relative flex h-[190px] flex-col justify-between overflow-hidden rounded-[16px] bg-gradient-to-br from-[#0D6E56] to-[#22A27E] p-6 text-white shadow-xl transition-transform duration-500 hover:rotate-1">
              <div className="flex items-start justify-between">
                <div className="h-9 w-12 rounded-[8px] border border-white/10 bg-yellow-300/25" />
                <div className="flex h-7 w-12 items-center justify-center rounded-md bg-white/20 text-[10px] font-black italic">VISA</div>
              </div>
              <div className="space-y-4">
                <p className="font-mono text-[18px] tracking-[0.2em] text-white/90">0000 0000 0000 0000</p>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="mb-0.5 text-[9px] uppercase tracking-[0.06em] text-white/60">Titular</p>
                    <p className="font-mono text-[13px] font-medium uppercase">Nome no cartão</p>
                  </div>
                  <div className="text-right">
                    <p className="mb-0.5 text-[9px] uppercase tracking-[0.06em] text-white/60">Validade</p>
                    <p className="font-mono text-[13px]">11/30</p>
                  </div>
                </div>
              </div>
              <div className="absolute -right-12 -top-10 h-28 w-28 rounded-full border border-white/10" />
            </div>

            <div className="space-y-5">
              <div className="relative">
                <label className="absolute -top-2 left-3 bg-white px-1 text-[12px] font-medium uppercase tracking-[0.06em] text-slate-500">Número do cartão</label>
                <input
                  disabled
                  inputMode="numeric"
                  placeholder="0000 0000 0000 0000"
                  className="h-[52px] w-full rounded-[8px] border border-[#d1d5db] bg-white px-4 text-[15px] transition-colors focus:border-[#0D6E56] focus:outline-none disabled:opacity-100"
                />
              </div>

              <div className="flex gap-4">
                <div className="relative flex-1">
                  <label className="absolute -top-2 left-3 bg-white px-1 text-[12px] font-medium uppercase tracking-[0.06em] text-slate-500">Validade</label>
                  <input
                    disabled
                    placeholder="11/30"
                    className="h-[52px] w-full rounded-[8px] border border-[#d1d5db] bg-white px-4 text-[15px] transition-colors focus:border-[#0D6E56] focus:outline-none disabled:opacity-100"
                  />
                </div>
                <div className="relative flex-1">
                  <label className="absolute -top-2 left-3 bg-white px-1 text-[12px] font-medium uppercase tracking-[0.06em] text-slate-500">CVV</label>
                  <input
                    disabled
                    placeholder="123"
                    className="h-[52px] w-full rounded-[8px] border border-[#d1d5db] bg-white px-4 text-[15px] transition-colors focus:border-[#0D6E56] focus:outline-none disabled:opacity-100"
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={handleSimulateSuccess}
              disabled={processing}
              className="mt-4 flex h-[52px] w-full items-center justify-center gap-3 rounded-[14px] bg-[#0D6E56] text-[16px] font-semibold text-white shadow-lg shadow-emerald-900/10 transition-all hover:bg-[#0A4F3E] active:scale-[0.97]"
            >
              {processing ? <Loader2 className="animate-spin" /> : <Lock size={18} />}
              {processing ? 'Processando...' : 'Pagar agora'}
            </Button>
          </div>
        )}

        <div className="mt-12 flex flex-col items-center gap-4 border-t border-[#f3f4f6] pt-8 animate-in fade-in duration-700">
          <div className="flex items-center justify-center gap-3 text-[13px] font-medium text-slate-400">
            <div className="flex items-center gap-1.5"><Lock size={12} /> SSL</div>
            <span className="text-slate-300">·</span>
            <div className="flex items-center gap-1.5"><CheckCircle2 size={12} /> PCI</div>
            <span className="text-slate-300">·</span>
            <div className="flex items-center gap-1.5"><Wallet size={12} /> SafePay</div>
          </div>
          <p className="max-w-[240px] text-center text-[11px] font-medium leading-relaxed text-slate-400">
            Seu pagamento é processado com criptografia de ponta a ponta.
          </p>
        </div>
      </div>
    </div>
  );
}
