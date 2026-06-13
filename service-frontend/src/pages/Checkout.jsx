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
  const [step, setStep] = useState('summary');
  const [method, setMethod] = useState(null);

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
        setError('Pedido nao encontrado.');
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
      alert('Erro na comunicacao com o servidor de pagamentos.');
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
        <p className="text-xl font-semibold text-slate-900">{error || 'Pedido invalido'}</p>
        <Button onClick={() => navigate('/')} className="mt-4 rounded-xl bg-[#0D6E56] text-white hover:bg-[#0A4F3E]">
          Voltar a Home
        </Button>
      </div>
    );
  }

  const formattedTotal = `R$ ${priceFormatter.format(Number(order.total_price))}`;
  const title = order.listings?.title || 'Pedido';
  const thumbnail = order.listings?.image_urls?.[0] || 'https://via.placeholder.com/64';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F5F5] to-[#E8F5F1] px-4 md:px-6 py-6 md:py-12 font-[-apple-system,BlinkMacSystemFont,'Inter','SF_Pro_Display','Segoe_UI',sans-serif] animate-in fade-in duration-200">
      <div className="mx-auto w-full max-w-2xl pb-[max(24px,env(safe-area-inset-bottom))]">
        {/* Header Fixo */}
        <div className="mb-8 flex items-center justify-between rounded-[16px] bg-white px-4 md:px-6 py-4 shadow-[0_2px_12px_rgba(0,0,0,0.08)] sticky top-0 z-10">
          <button
            onClick={() => step === 'summary' ? navigate(-1) : setStep('summary')}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F5F5] text-slate-600 transition-all hover:bg-slate-200 active:scale-[0.97]"
            aria-label="Voltar"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-slate-500 flex-1 text-center">
            {step === 'summary' ? 'Resumo do Pedido' : step === 'method' ? 'Escolher Pagamento' : 'Confirmar Pagamento'}
          </h2>
          <div className="flex w-10 justify-end">
            <ShieldCheck size={18} className="text-[#0D6E56]" />
          </div>
        </div>

        {/* TELA DE RESUMO */}
        {step === 'summary' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Informacoes do Produto */}
            <div className="rounded-[16px] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
              <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.06em] text-slate-500">Resumo do Pedido</p>
              <h1 className="text-[28px] font-bold leading-tight text-[#111827] mb-2">Revise sua Compra</h1>
              <p className="text-[14px] font-normal leading-6 text-slate-500 mb-8">
                Confira os dados antes de escolher a forma de pagamento.
              </p>

              <div className="rounded-[14px] border border-slate-100 bg-[#F9FAFB] p-5 mb-6">
                <div className="flex items-center gap-4">
                  <img
                    src={thumbnail}
                    alt={title}
                    className="h-28 w-28 rounded-[12px] object-cover shadow-sm"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="mb-3 text-[18px] font-bold leading-tight text-[#111827]">{title}</h3>
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-[#F0FAF6] px-3 py-2 text-[#0D6E56]">
                      <ShieldCheck size={14} />
                      <span className="text-[12px] font-medium">Protegido</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Resumo de Precos */}
              <div className="space-y-3 border-t border-slate-100 pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Subtotal</span>
                  <span className="font-semibold text-slate-900">{formattedTotal}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Taxa de servico</span>
                  <span className="font-semibold text-slate-900">Gratis</span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-3">
                  <span className="font-bold text-slate-900">Total</span>
                  <span className="text-[32px] font-bold text-[#0D6E56]">{formattedTotal}</span>
                </div>
              </div>
            </div>

            {/* Botao Prosseguir */}
            <Button
              onClick={() => setStep('method')}
              className="w-full h-[56px] rounded-[14px] border-none bg-[#0D6E56] text-[16px] font-semibold text-white shadow-lg shadow-emerald-900/10 transition-all hover:bg-[#0A4F3E] active:scale-[0.97] flex items-center justify-center gap-2"
            >
              Prosseguir para Pagamento
              <ChevronRight size={18} />
            </Button>

            {/* Info de Seguranca */}
            <div className="rounded-[14px] bg-[#F0FAF6] p-4 text-sm leading-6 text-[#0D6E56] border border-[#D1E8E4]">
              <div className="mb-2 flex items-center gap-2 font-bold">
                <ShieldCheck size={18} />
                Pagamento 100% Seguro
              </div>
              <p className="text-[13px]">O valor fica protegido ate a conclusao do servico.</p>
            </div>
          </div>
        )}

        {/* TELA DE METODOS DE PAGAMENTO */}
        {step === 'method' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="rounded-[16px] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
              <div className="mb-8 text-center">
                <h1 className="text-[28px] font-bold text-[#111827] mb-3">Como deseja pagar?</h1>
                <p className="text-[14px] font-normal leading-6 text-slate-500">
                  Escolha um metodo para finalizar a compra com seguranca.
                </p>
              </div>

              <div className="space-y-3">
                {/* PIX */}
                <button
                  onClick={() => { setMethod('pix'); setStep('simulated-payment'); }}
                  className="flex w-full items-center justify-between rounded-[12px] border-2 p-4 transition-all duration-200 ease-in-out active:scale-[0.97] hover:shadow-md"
                  style={{
                    borderColor: method === 'pix' ? '#0D6E56' : '#e5e7eb',
                    backgroundColor: method === 'pix' ? '#F0FAF6' : 'white'
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-emerald-100 text-[#0D6E56]">
                      <QrCode size={24} />
                    </div>
                    <div className="text-left">
                      <p className="text-[16px] font-bold text-[#111827]">PIX</p>
                      <p className="text-[13px] text-slate-500">Aprovacao instantanea</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-slate-300" />
                </button>

                {/* Cartao */}
                <button
                  onClick={() => { setMethod('card'); setStep('simulated-payment'); }}
                  className="flex w-full items-center justify-between rounded-[12px] border-2 p-4 transition-all duration-200 ease-in-out active:scale-[0.97] hover:shadow-md"
                  style={{
                    borderColor: method === 'card' ? '#0D6E56' : '#e5e7eb',
                    backgroundColor: method === 'card' ? '#F0FAF6' : 'white'
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-blue-100 text-blue-600">
                      <CreditCard size={24} />
                    </div>
                    <div className="text-left">
                      <p className="text-[16px] font-bold text-[#111827]">Cartao de Credito</p>
                      <p className="text-[13px] text-slate-500">Ate 12x com juros</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-slate-300" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TELA DE PAGAMENTO PIX */}
        {step === 'simulated-payment' && method === 'pix' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="rounded-[16px] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
              <h1 className="text-center text-[28px] font-bold text-[#111827] mb-8">Pague com PIX</h1>

              <div className="flex justify-center mb-8">
                <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-4 py-2 text-[14px] font-semibold text-orange-600 border border-orange-200">
                  <Clock size={16} />
                  <span>Expira em 14:32</span>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex justify-center mb-8">
                <div className="rounded-[16px] border-2 border-slate-200 bg-[#F9FAFB] p-8 shadow-sm">
                  <QrCode size={240} className="text-[#111827]" />
                </div>
              </div>

              {/* Codigo Copia e Cola */}
              <div className="space-y-3 mb-8">
                <p className="text-center text-[12px] font-medium uppercase tracking-[0.06em] text-slate-500">Ou copie e cole esse codigo</p>
                <div className="flex items-center justify-between gap-2 overflow-hidden rounded-[12px] bg-[#F5F5F5] p-4 font-mono text-[12px] text-slate-600 border border-slate-200">
                  <span className="mr-2 truncate text-left">00020126580014BR.GOV.BCB.PIX0114...</span>
                  <button className="flex shrink-0 items-center gap-2 px-3 py-2 rounded-lg bg-white font-semibold text-[#0D6E56] transition-all hover:bg-slate-50 active:scale-[0.97] border border-slate-200 whitespace-nowrap">
                    <Copy size={14} />
                    Copiar
                  </button>
                </div>
              </div>

              {/* Botao Confirmar */}
              <Button
                onClick={handleSimulateSuccess}
                disabled={processing}
                className="w-full h-[56px] rounded-[14px] bg-[#0D6E56] text-[16px] font-semibold text-white shadow-lg shadow-emerald-900/10 transition-all hover:bg-[#0A4F3E] active:scale-[0.97] flex items-center justify-center gap-2"
              >
                {processing ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={20} />}
                {processing ? 'Confirmando...' : 'Confirmar Pagamento'}
              </Button>
            </div>
          </div>
        )}

        {/* TELA DE PAGAMENTO CARTAO */}
        {step === 'simulated-payment' && method === 'card' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="rounded-[16px] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
              <h1 className="text-center text-[28px] font-bold text-[#111827] mb-8">Dados do Cartao</h1>

              {/* Cartao Visual */}
              <div className="relative flex h-[220px] flex-col justify-between overflow-hidden rounded-[16px] bg-gradient-to-br from-[#0D6E56] to-[#22A27E] p-6 text-white shadow-xl mb-8">
                <div className="flex items-start justify-between">
                  <div className="h-10 w-14 rounded-[8px] border-2 border-white/30 bg-yellow-300/20" />
                  <div className="flex h-8 w-14 items-center justify-center rounded-md bg-white/20 text-[11px] font-bold">VISA</div>
                </div>
                <div className="space-y-4">
                  <p className="font-mono text-[22px] tracking-[0.2em] text-white/95">0000 0000 0000 0000</p>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="mb-1 text-[10px] uppercase tracking-[0.08em] text-white/70 font-semibold">Titular</p>
                      <p className="font-mono text-[13px] font-bold uppercase tracking-wider">Nome Cartao</p>
                    </div>
                    <div className="text-right">
                      <p className="mb-1 text-[10px] uppercase tracking-[0.08em] text-white/70 font-semibold">Validade</p>
                      <p className="font-mono text-[13px] font-bold">11/30</p>
                    </div>
                  </div>
                </div>
                <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full border border-white/10" />
              </div>

              {/* Campos de Entrada */}
              <div className="space-y-4 mb-8">
                <div className="relative">
                  <label className="absolute -top-2 left-3 bg-white px-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-500">Numero do Cartao</label>
                  <input
                    disabled
                    inputMode="numeric"
                    placeholder="0000 0000 0000 0000"
                    className="h-[52px] w-full rounded-[10px] border-2 border-[#d1d5db] bg-white px-4 text-[15px] transition-colors focus:border-[#0D6E56] focus:outline-none disabled:opacity-70 disabled:bg-[#F5F5F5]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="absolute -top-2 left-3 bg-white px-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-500">Validade</label>
                    <input
                      disabled
                      placeholder="11/30"
                      className="h-[52px] w-full rounded-[10px] border-2 border-[#d1d5db] bg-white px-4 text-[15px] transition-colors focus:border-[#0D6E56] focus:outline-none disabled:opacity-70 disabled:bg-[#F5F5F5]"
                    />
                  </div>
                  <div className="relative">
                    <label className="absolute -top-2 left-3 bg-white px-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-500">CVV</label>
                    <input
                      disabled
                      placeholder="123"
                      className="h-[52px] w-full rounded-[10px] border-2 border-[#d1d5db] bg-white px-4 text-[15px] transition-colors focus:border-[#0D6E56] focus:outline-none disabled:opacity-70 disabled:bg-[#F5F5F5]"
                    />
                  </div>
                </div>
              </div>

              {/* Botao Pagar */}
              <Button
                onClick={handleSimulateSuccess}
                disabled={processing}
                className="w-full h-[56px] rounded-[14px] bg-[#0D6E56] text-[16px] font-semibold text-white shadow-lg shadow-emerald-900/10 transition-all hover:bg-[#0A4F3E] active:scale-[0.97] flex items-center justify-center gap-2"
              >
                {processing ? <Loader2 className="animate-spin" /> : <Lock size={20} />}
                {processing ? 'Processando...' : 'Pagar Agora'}
              </Button>
            </div>
          </div>
        )}

        {/* Rodape de Seguranca */}
        <div className="mt-8 flex flex-col items-center gap-3 border-t border-[#E5E7EB] pt-6 animate-in fade-in duration-700">
          <div className="flex items-center justify-center gap-4 text-[12px] font-medium text-slate-400">
            <div className="flex items-center gap-1.5"><Lock size={14} /> SSL</div>
            <span className="text-slate-300">.</span>
            <div className="flex items-center gap-1.5"><CheckCircle2 size={14} /> PCI</div>
            <span className="text-slate-300">.</span>
            <div className="flex items-center gap-1.5"><Wallet size={14} /> SafePay</div>
          </div>
          <p className="max-w-[280px] text-center text-[11px] font-medium leading-relaxed text-slate-400">
            Seu pagamento e processado com criptografia de ponta a ponta.
          </p>
        </div>
      </div>
    </div>
  );
}
