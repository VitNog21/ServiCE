import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import {
  CreditCard, ArrowLeft, ShieldCheck, Loader2,
  QrCode, CheckCircle2, Wallet, Lock, ChevronRight, Copy, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import '../css/checkout.css';

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

  // Estados interativos para o Cartão de Crédito
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardBrand, setCardBrand] = useState('VISA');

  // Estado do Timer do PIX (600 segundos = 10 minutos)
  const [countdown, setCountdown] = useState(600);

  const API_URL = import.meta.env.VITE_API_URL || 'https://service-uakj.onrender.com';

  // Efeitos do Timer do PIX
  useEffect(() => {
    if (step === 'simulated-payment' && method === 'pix') {
      const timer = setInterval(() => {
        setCountdown(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step, method]);

  const formatCountdown = () => {
    const minutes = Math.floor(countdown / 60);
    const seconds = countdown % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handlers para formatação interativa do Cartão
  const handleCardNumberChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 16) value = value.slice(0, 16);

    // Detecta a bandeira
    if (value.startsWith('4')) {
      setCardBrand('VISA');
    } else if (value.startsWith('5')) {
      setCardBrand('MASTERCARD');
    } else if (value.startsWith('3')) {
      setCardBrand('AMEX');
    } else {
      setCardBrand('VISA');
    }

    const formatted = value.match(/.{1,4}/g)?.join(' ') || '';
    setCardNumber(formatted);
  };

  const handleCardNameChange = (e) => {
    setCardName(e.target.value.toUpperCase());
  };

  const handleCardExpiryChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.slice(0, 4);

    if (value.length > 2) {
      value = `${value.slice(0, 2)}/${value.slice(2)}`;
    }
    setCardExpiry(value);
  };

  const handleCardCvvChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.slice(0, 4);
    setCardCvv(value);
  };

  const handleCopyPix = () => {
    const pixCode = `00020101021226830014br.gov.bcb.pix2561pix.chave.ficticia-service.app5204000053039865405${order?.total_price || 0}5802BR5915ServiCE App6009Sao Paulo62070503***6304`;
    navigator.clipboard.writeText(pixCode);
    alert('Código PIX Copia e Cola copiado para a área de transferência!');
  };

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
      const response = await fetch(`${API_URL}/api/payments/test-approve`, {
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

  const handlePayment = async () => {
    setProcessing(true);
    try {
      const response = await fetch(`${API_URL}/api/payments/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });

      const data = await response.json();

      if (response.ok && data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        throw new Error(data.error || 'Erro ao gerar checkout');
      }
    } catch (err) {
      console.error('Erro no pagamento:', err);
      alert('Erro ao conectar com o provedor de pagamentos.');
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
    <div className="min-h-screen bg-gradient-to-br from-[#F5F5F5] to-[#E8F5F1] px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-12 font-[-apple-system,BlinkMacSystemFont,'Inter','SF_Pro_Display','Segoe_UI',sans-serif] animate-in fade-in duration-200 flex items-center justify-center">
      <div className="mx-auto w-full max-w-2xl pb-[max(24px,env(safe-area-inset-bottom))]">
        {/* Header Fixo */}
        <div className="mb-6 sm:mb-8 flex items-center justify-between rounded-[12px] sm:rounded-[16px] bg-white px-3 sm:px-4 md:px-6 py-3 sm:py-4 shadow-[0_2px_12px_rgba(0,0,0,0.08)] sticky top-0 z-10">
          <button
            onClick={() => step === 'summary' ? navigate(-1) : setStep('summary')}
            className="flex h-9 sm:h-10 w-9 sm:w-10 items-center justify-center rounded-full bg-[#F5F5F5] text-slate-600 transition-all hover:bg-slate-200 active:scale-[0.97]"
            aria-label="Voltar"
          >
            <ArrowLeft size={18} className="sm:size-[20px]" />
          </button>
          <h2 className="text-[11px] sm:text-[12px] font-medium uppercase tracking-[0.06em] text-slate-500 flex-1 text-center px-2">
            {step === 'summary' ? 'Resumo do Pedido' : step === 'method' ? 'Escolher Pagamento' : 'Confirmar Pagamento'}
          </h2>
          <div className="flex w-9 sm:w-10 justify-end">
            <ShieldCheck size={16} className="sm:size-[18px] text-[#0D6E56]" />
          </div>
        </div>

        {/* TELA DE RESUMO */}
        {step === 'summary' && (
          <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
            {/* Informacoes do Produto */}
            <div className="rounded-[12px] sm:rounded-[16px] bg-white p-4 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
              <p className="mb-2 text-[11px] sm:text-[12px] font-medium uppercase tracking-[0.06em] text-slate-500">Resumo do Pedido</p>
              <h1 className="text-[24px] sm:text-[28px] font-bold leading-tight text-[#111827] mb-2">Revise sua Compra</h1>
              <p className="text-[13px] sm:text-[14px] font-normal leading-6 text-slate-500 mb-6 sm:mb-8">
                Confira os dados antes de escolher a forma de pagamento.
              </p>

              <div className="rounded-[12px] sm:rounded-[14px] border border-slate-100 bg-[#F9FAFB] p-4 sm:p-5 mb-5 sm:mb-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <img
                    src={thumbnail}
                    alt={title}
                    className="h-24 sm:h-28 w-24 sm:w-28 rounded-[10px] sm:rounded-[12px] object-cover shadow-sm flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1 w-full">
                    <h3 className="mb-3 text-[16px] sm:text-[18px] font-bold leading-tight text-[#111827] line-clamp-2">{title}</h3>
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-[#F0FAF6] px-3 py-2 text-[#0D6E56]">
                      <ShieldCheck size={13} className="sm:size-[14px]" />
                      <span className="text-[11px] sm:text-[12px] font-medium">Protegido</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Resumo de Precos */}
              <div className="space-y-3 border-t border-slate-100 pt-5 sm:pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Subtotal</span>
                  <span className="font-semibold text-slate-900 text-sm sm:text-base">{formattedTotal}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Taxa de servico</span>
                  <span className="font-semibold text-slate-900 text-sm sm:text-base">Gratis</span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-3">
                  <span className="font-bold text-slate-900">Total</span>
                  <span className="text-[24px] sm:text-[32px] font-bold text-[#0D6E56]">{formattedTotal}</span>
                </div>
              </div>
            </div>

            {/* Botao Prosseguir */}
            <button
              onClick={() => setStep('method')}
              className="w-full h-[48px] sm:h-[56px] rounded-[12px] sm:rounded-[14px] border-none bg-[#0D6E56] text-[15px] sm:text-[16px] font-semibold text-white shadow-lg shadow-emerald-900/10 transition-all hover:bg-[#0A4F3E] active:scale-[0.97] flex items-center justify-center gap-2"
            >
              Prosseguir para Pagamento
              <ChevronRight size={18} />
            </button>

            {/* Info de Seguranca */}
            <div className="rounded-[12px] sm:rounded-[14px] bg-[#F0FAF6] p-4 text-sm leading-6 text-[#0D6E56] border border-[#D1E8E4]">
              <div className="mb-2 flex items-center gap-2 font-bold text-[13px] sm:text-sm">
                <ShieldCheck size={16} className="sm:size-[18px]" />
                Pagamento 100% Seguro
              </div>
              <p className="text-[12px] sm:text-[13px]">O valor fica protegido ate a conclusao do servico.</p>
            </div>
          </div>
        )}

        {/* TELA DE METODOS DE PAGAMENTO */}
        {step === 'method' && (
          <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
            <div className="rounded-[12px] sm:rounded-[16px] bg-white p-4 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
              <div className="mb-6 sm:mb-8 text-center">
                <h1 className="text-[24px] sm:text-[28px] font-bold text-[#111827] mb-2 sm:mb-3">Como deseja pagar?</h1>
                <p className="text-[13px] sm:text-[14px] font-normal leading-6 text-slate-500">
                  Escolha um metodo para finalizar a compra com seguranca.
                </p>
              </div>

              <div className="space-y-3">
                {/* PIX */}
                <button
                  onClick={() => { setMethod('pix'); setStep('simulated-payment'); }}
                  className="flex w-full items-center justify-between rounded-[10px] sm:rounded-[12px] border-2 p-4 transition-all duration-200 ease-in-out active:scale-[0.97] hover:shadow-md min-h-[80px] sm:min-h-auto"
                  style={{
                    borderColor: method === 'pix' ? '#0D6E56' : '#e5e7eb',
                    backgroundColor: method === 'pix' ? '#F0FAF6' : 'white'
                  }}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="flex h-10 sm:h-12 w-10 sm:w-12 items-center justify-center rounded-[8px] sm:rounded-[10px] bg-emerald-100 text-[#0D6E56] flex-shrink-0">
                      <QrCode size={20} className="sm:size-[24px]" />
                    </div>
                    <div className="text-left">
                      <p className="text-[14px] sm:text-[16px] font-bold text-[#111827]">PIX</p>
                      <p className="text-[12px] sm:text-[13px] text-slate-500">Aprovacao instantanea</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="sm:size-[20px] text-slate-300 flex-shrink-0" />
                </button>

                {/* Cartao */}
                <button
                  onClick={() => { setMethod('card'); setStep('simulated-payment'); }}
                  className="flex w-full items-center justify-between rounded-[10px] sm:rounded-[12px] border-2 p-4 transition-all duration-200 ease-in-out active:scale-[0.97] hover:shadow-md min-h-[80px] sm:min-h-auto"
                  style={{
                    borderColor: method === 'card' ? '#0D6E56' : '#e5e7eb',
                    backgroundColor: method === 'card' ? '#F0FAF6' : 'white'
                  }}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="flex h-10 sm:h-12 w-10 sm:w-12 items-center justify-center rounded-[8px] sm:rounded-[10px] bg-blue-100 text-blue-600 flex-shrink-0">
                      <CreditCard size={20} className="sm:size-[24px]" />
                    </div>
                    <div className="text-left">
                      <p className="text-[14px] sm:text-[16px] font-bold text-[#111827]">Cartao de Credito</p>
                      <p className="text-[12px] sm:text-[13px] text-slate-500">Ate 12x com juros</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="sm:size-[20px] text-slate-300 flex-shrink-0" />
                </button>

                {/* Mercado Pago */}
                <button
                  onClick={handlePayment}
                  disabled={processing}
                  className="flex w-full items-center justify-between rounded-[10px] sm:rounded-[12px] border-2 p-4 transition-all duration-200 ease-in-out active:scale-[0.97] hover:shadow-md min-h-[80px] sm:min-h-auto bg-blue-50 border-blue-200 hover:border-blue-300"
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="flex h-10 sm:h-12 w-10 sm:w-12 items-center justify-center rounded-[8px] sm:rounded-[10px] bg-blue-600 text-white flex-shrink-0">
                      {processing ? <Loader2 className="animate-spin" /> : <ShieldCheck size={20} className="sm:size-[24px]" />}
                    </div>
                    <div className="text-left">
                      <p className="text-[14px] sm:text-[16px] font-bold text-blue-900">Mercado Pago</p>
                      <p className="text-[12px] sm:text-[13px] text-blue-700">Pague com PIX, Cartão ou Boleto</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="sm:size-[20px] text-blue-400 flex-shrink-0" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TELA DE PAGAMENTO PIX */}
        {step === 'simulated-payment' && method === 'pix' && (
          <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
            <div className="rounded-[12px] sm:rounded-[16px] bg-white p-4 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
              <h1 className="text-center text-[24px] sm:text-[28px] font-bold text-[#111827] mb-6 sm:mb-8">Pague com PIX</h1>

              <div className="flex justify-center mb-6 sm:mb-8">
                <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 sm:px-4 py-2 text-[12px] sm:text-[14px] font-bold text-orange-600 border border-orange-200">
                  <Clock size={14} className="sm:size-[16px]" />
                  <span>Expira em {formatCountdown()}</span>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex justify-center mb-6 sm:mb-8">
                <div className="relative rounded-[16px] border-2 border-slate-100 bg-[#F9FAFB] p-6 sm:p-8 shadow-sm flex items-center justify-center overflow-hidden">
                  <QrCode size={200} className="sm:size-[240px] text-[#111827]" />
                  {/* Linha laser de scan animada */}
                  <div 
                    className="absolute left-0 right-0 h-0.5 bg-emerald-500 opacity-60 shadow-md shadow-emerald-500 animate-pulse" 
                    style={{ top: '50%' }} 
                  />
                </div>
              </div>

              {/* Codigo Copia e Cola */}
              <div className="space-y-3 mb-6 sm:mb-8">
                <p className="text-center text-[11px] sm:text-[12px] font-bold uppercase tracking-[0.06em] text-slate-400">Ou copie e cole esse código</p>
                <div className="flex items-center justify-between gap-3 overflow-hidden rounded-[12px] bg-[#F8FAFC] p-3.5 border border-slate-100">
                  <span className="truncate text-left text-xs font-mono text-slate-500 flex-1">
                    00020101021226830014br.gov.bcb.pix2561pix.chave.ficticia-service.app5204000053039865405{order?.total_price || 0}5802BR5915ServiCE App6009Sao Paulo62070503***6304
                  </span>
                  <button 
                    onClick={handleCopyPix}
                    className="flex shrink-0 items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white font-bold text-[#0D6E56] transition-all hover:bg-slate-50 active:scale-[0.97] border border-slate-200 text-xs shadow-sm"
                  >
                    <Copy size={12} />
                    <span>Copiar</span>
                  </button>
                </div>
              </div>

              {/* Botao Confirmar */}
              <button
                onClick={handleSimulateSuccess}
                disabled={processing}
                className="w-full h-[48px] sm:h-[56px] rounded-[12px] sm:rounded-[14px] bg-[#0D6E56] text-[15px] sm:text-[16px] font-semibold text-white shadow-lg shadow-emerald-900/10 transition-all hover:bg-[#0A4F3E] active:scale-[0.97] flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {processing ? <Loader2 className="animate-spin size-[18px] sm:size-[20px]" /> : <CheckCircle2 size={18} className="sm:size-[20px]" />}
                {processing ? 'Confirmando...' : 'Confirmar Pagamento'}
              </button>
            </div>
          </div>
        )}

        {/* TELA DE PAGAMENTO CARTAO */}
        {step === 'simulated-payment' && method === 'card' && (
          <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
            <div className="rounded-[12px] sm:rounded-[16px] bg-white p-4 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
              <h1 className="text-center text-[24px] sm:text-[28px] font-bold text-[#111827] mb-6 sm:mb-8">Dados do Cartão</h1>

              {/* Cartao Visual 3D Flip */}
              <div className="w-full mb-8" style={{ perspective: '1000px' }}>
                <div 
                  className="relative w-full h-[180px] sm:h-[220px] transition-transform duration-500 shadow-xl rounded-2xl"
                  style={{ 
                    transformStyle: 'preserve-3d', 
                    transform: isFlipped ? 'rotateY(180deg)' : 'none'
                  }}
                >
                  {/* FRENTE DO CARTÃO */}
                  <div 
                    className="absolute inset-0 w-full h-full rounded-2xl bg-gradient-to-br from-[#0D6E56] to-[#22A27E] p-5 flex flex-col justify-between text-white"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="h-8 w-12 rounded bg-yellow-300/30 border border-white/20" />
                      <div className="flex h-7 px-3 items-center justify-center rounded-md bg-white/20 text-[10px] sm:text-[11px] font-bold tracking-wider uppercase">
                        {cardBrand}
                      </div>
                    </div>
                    <div className="space-y-3 sm:space-y-4">
                      <p className="font-mono text-[18px] sm:text-[22px] tracking-[0.2em] text-white/95">
                        {cardNumber || '0000 0000 0000 0000'}
                      </p>
                      <div className="flex items-end justify-between text-[11px] sm:text-[13px]">
                        <div>
                          <p className="mb-1 text-[9px] uppercase tracking-[0.08em] text-white/70 font-semibold">Titular</p>
                          <p className="font-mono font-bold uppercase tracking-wider truncate max-w-[170px]">
                            {cardName || 'NOME COMPLETO'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="mb-1 text-[9px] uppercase tracking-[0.08em] text-white/70 font-semibold">Validade</p>
                          <p className="font-mono font-bold">
                            {cardExpiry || 'MM/AA'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* VERSO DO CARTÃO */}
                  <div 
                    className="absolute inset-0 w-full h-full rounded-2xl bg-gradient-to-br from-[#125845] to-[#0A3D30] flex flex-col justify-between text-white"
                    style={{ 
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)'
                    }}
                  >
                    <div className="w-full h-10 bg-slate-900 mt-6" />
                    <div className="px-6 mb-6">
                      <div className="flex items-center justify-end gap-3">
                        <span className="text-[10px] text-white/70 font-semibold">CVV</span>
                        <div className="w-16 h-8 bg-white text-slate-800 font-mono font-bold flex items-center justify-center rounded text-sm">
                          {cardCvv || '•••'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Campos de Entrada */}
              <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                <div className="relative">
                  <label className="absolute -top-2 left-3 bg-white px-1 text-[11px] sm:text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-500">Número do Cartão</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    onFocus={() => setIsFlipped(false)}
                    placeholder="0000 0000 0000 0000"
                    maxLength="19"
                    required
                    className="h-[44px] sm:h-[52px] w-full rounded-[8px] sm:rounded-[10px] border-2 border-[#d1d5db] bg-white px-3 sm:px-4 text-[14px] sm:text-[15px] transition-colors focus:border-[#0D6E56] focus:outline-none"
                  />
                </div>

                <div className="relative">
                  <label className="absolute -top-2 left-3 bg-white px-1 text-[11px] sm:text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-500">Nome do Titular (Como no cartão)</label>
                  <input
                    type="text"
                    value={cardName}
                    onChange={handleCardNameChange}
                    onFocus={() => setIsFlipped(false)}
                    placeholder="NOME IMPRESSO NO CARTÃO"
                    required
                    className="h-[44px] sm:h-[52px] w-full rounded-[8px] sm:rounded-[10px] border-2 border-[#d1d5db] bg-white px-3 sm:px-4 text-[14px] sm:text-[15px] transition-colors focus:border-[#0D6E56] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="relative">
                    <label className="absolute -top-2 left-3 bg-white px-1 text-[11px] sm:text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-500">Validade</label>
                    <input
                      type="text"
                      placeholder="MM/AA"
                      value={cardExpiry}
                      onChange={handleCardExpiryChange}
                      onFocus={() => setIsFlipped(false)}
                      maxLength="5"
                      required
                      className="h-[44px] sm:h-[52px] w-full rounded-[8px] sm:rounded-[10px] border-2 border-[#d1d5db] bg-white px-3 sm:px-4 text-[14px] sm:text-[15px] transition-colors focus:border-[#0D6E56] focus:outline-none"
                    />
                  </div>
                  <div className="relative">
                    <label className="absolute -top-2 left-3 bg-white px-1 text-[11px] sm:text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-500">CVV</label>
                    <input
                      type="text"
                      placeholder="123"
                      value={cardCvv}
                      onChange={handleCardCvvChange}
                      onFocus={() => setIsFlipped(true)}
                      onBlur={() => setIsFlipped(false)}
                      maxLength="4"
                      required
                      className="h-[44px] sm:h-[52px] w-full rounded-[8px] sm:rounded-[10px] border-2 border-[#d1d5db] bg-white px-3 sm:px-4 text-[14px] sm:text-[15px] transition-colors focus:border-[#0D6E56] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Botao Pagar */}
              <button
                onClick={handleSimulateSuccess}
                disabled={processing || !cardNumber || !cardName || !cardExpiry || !cardCvv}
                className="w-full h-[48px] sm:h-[56px] rounded-[12px] sm:rounded-[14px] bg-[#0D6E56] text-[15px] sm:text-[16px] font-semibold text-white shadow-lg shadow-emerald-900/10 transition-all hover:bg-[#0A4F3E] active:scale-[0.97] flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {processing ? <Loader2 className="animate-spin size-[18px] sm:size-[20px]" /> : <Lock size={18} className="sm:size-[20px]" />}
                {processing ? 'Processando...' : 'Pagar Agora'}
              </button>
            </div>
          </div>
        )}

        {/* Rodape de Seguranca */}
        <div className="mt-6 sm:mt-8 flex flex-col items-center gap-3 border-t border-[#E5E7EB] pt-4 sm:pt-6 animate-in fade-in duration-700">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-[11px] sm:text-[12px] font-medium text-slate-400">
            <div className="flex items-center gap-1"><Lock size={12} className="sm:size-[14px]" /> SSL</div>
            <span className="text-slate-300 text-xs">.</span>
            <div className="flex items-center gap-1"><CheckCircle2 size={12} className="sm:size-[14px]" /> PCI</div>
            <span className="text-slate-300 text-xs">.</span>
            <div className="flex items-center gap-1"><Wallet size={12} className="sm:size-[14px]" /> SafePay</div>
          </div>
          <p className="max-w-[280px] text-center text-[10px] sm:text-[11px] font-medium leading-relaxed text-slate-400 px-2">
            Seu pagamento e processado com criptografia de ponta a ponta.
          </p>
        </div>
      </div>
    </div>
  );
}
