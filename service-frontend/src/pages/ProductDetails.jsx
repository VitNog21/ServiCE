import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { 
  ShoppingCart, ArrowLeft, ShieldCheck, MapPin, ChevronLeft, ChevronRight, 
  MessageCircle, Flag, X, AlertTriangle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

import { useToast } from '@/components/ui/toast';

const REPORT_REASONS = [
  { value: 'Fraude ou Golpe', label: 'Fraude ou Golpe' },
  { value: 'Conteúdo Inadequado', label: 'Conteúdo Inadequado' },
  { value: 'Serviço Falso ou Inexistente', label: 'Serviço Falso ou Inexistente' },
  { value: 'Spam', label: 'Spam' },
  { value: 'Outro', label: 'Outro motivo' },
];

export default function ProductDetails() {
  const { id } = useParams(); 
  const navigate = useNavigate();
  const [produto, setProduto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comprando, setComprando] = useState(false);
  const [fotoAtual, setFotoAtual] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [ownerInfo, setOwnerInfo] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Estados para a Denúncia
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Fraude ou Golpe');
  const [reportDetails, setReportDetails] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const { toast } = useToast();

  // Carregar usuário autenticado
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setCurrentUser(session.user);
        }
      } catch (err) {
        console.error('Erro ao carregar usuário:', err);
      } finally {
        setAuthLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Carregar anúncio e info do dono
  useEffect(() => {
    async function fetchProduto() {
      try {
        const { data, error } = await supabase
          .from('listings')
          .select(`
            id,
            title,
            description,
            price,
            image_urls,
            status,
            category:categories(name),
            address_text,
            owner_id,
            created_at
          `)
          .eq('id', id)
          .single();

        if (error) {
          setProduto(null);
        } else if (data) {
          setProduto(data);
          
          if (data.owner_id) {
            const { data: ownerData } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url, created_at')
              .eq('id', data.owner_id)
              .single();
            if (ownerData) {
              setOwnerInfo(ownerData);
            }
          }
        }
      } catch (err) {
        console.error('❌ Erro na exceção:', err);
        setProduto(null);
      } finally {
        setLoading(false);
      }
    }
    fetchProduto();
  }, [id]);

  // Iniciar chat com o dono
  const handleStartChat = () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    if (currentUser.id === produto.owner_id) {
      toast.info('Você não pode conversar com você mesmo.', 'Aviso');
      return;
    }
    navigate(`/chat/${produto.id}/${produto.owner_id}`);
  };

  const handleCompra = async () => {
    setComprando(true);
    
    if (!currentUser) {
      toast.info('Você precisa estar logado para comprar.', 'Login necessário');
      setComprando(false);
      navigate('/login');
      return;
    }

    const { data, error } = await supabase
      .from('orders')
      .insert([
        {
          listing_id: produto.id,
          buyer_id: currentUser.id,
          seller_id: produto.owner_id,
          total_price: produto.price,
          status: 'pending'
        }
      ])
      .select();

    if (error) {
      toast.error(`Erro ao processar pedido: ${error.message}`);
    } else {
      const newOrder = data[0];
      navigate(`/checkout/${newOrder.id}`); 
    }
    setComprando(false);
  };

  const handleReport = async () => {
    if (!currentUser) {
      toast.info('Você precisa estar logado para denunciar um anúncio.', 'Login necessário');
      navigate('/login');
      return;
    }

    if (reportReason === 'Outro' && !reportDetails.trim()) {
      toast.info('Por favor, detalhe o motivo da denúncia.', 'Detalhes necessários');
      return;
    }

    setIsReporting(true);
    const finalReason = reportReason === 'Outro' ? `Outro: ${reportDetails}` : reportReason;

    try {
      const { error } = await supabase.from('reports').insert([
        {
          reporter_id: currentUser.id,
          listing_id: produto.id,
          reason: finalReason,
          status: 'pending' // Conforme seu schema de banco
        }
      ]);

      if (error) throw error;

      toast.success('Sua denúncia foi recebida com sucesso! Nossa equipe irá analisar o anúncio em breve.');
      setIsReportModalOpen(false);
      setReportDetails('');
      setReportReason('Fraude ou Golpe');
    } catch (err) {
      console.error('Erro ao denunciar:', err);
      toast.error('Ocorreu um erro ao enviar a denúncia. Tente novamente.');
    } finally {
      setIsReporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A847C]"></div>
          <p className="mt-4 text-slate-600">Carregando detalhes...</p>
        </div>
      </div>
    );
  }

  if (!produto) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <p className="text-xl font-semibold text-slate-900">Anúncio não encontrado</p>
          <p className="text-slate-600">Este anúncio pode ter sido removido ou expirado.</p>
          <Button 
            onClick={() => navigate('/')}
            className="mt-4 bg-[#0A847C] hover:bg-[#085a51] text-white rounded-lg px-6 py-2"
          >
            Voltar à Home
          </Button>
        </div>
      </div>
    );
  }

  const fotos = [];
  if (produto.image_urls && Array.isArray(produto.image_urls) && produto.image_urls.length > 0) {
    fotos.push(...produto.image_urls.filter(url => url));
  }
  if (produto.imagem_url && !fotos.includes(produto.imagem_url)) {
    fotos.push(produto.imagem_url);
  }
  if (fotos.length === 0) {
    fotos.push(
      'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=600&fit=crop'
    );
  }

  const fotoExibida = fotos[fotoAtual] || fotos[0];
  const irProxima = () => setFotoAtual((prev) => (prev + 1) % fotos.length);
  const irAnterior = () => setFotoAtual((prev) => (prev - 1 + fotos.length) % fotos.length);

  const titulo = produto.title?.trim() || 'Serviço';
  const descricao = produto.description?.trim() || 'Descrição não disponível';
  const categoria = produto.category?.name || 'Serviço';
  const preco = produto.price || 0;
  const labelDistancia = produto.address_text || 'Localização não disponível';

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Header Fixo */}
      <div className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-slate-700 hover:text-[#0A847C] transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="font-medium">Voltar para busca</span>
            </button>
            <div className="inline-flex items-center gap-2 rounded-lg bg-[#0A847C]/10 px-3 py-1">
              <span className="text-xs font-semibold text-[#0A847C] uppercase tracking-wide">
                {categoria}
              </span>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Layout estilo OLX: 8 colunas para Foto/Descrição, 4 para Comprar/Preço */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LADO ESQUERDO (Foto no topo + Descrição) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Galeria de Fotos (Fica no topo) */}
            <div className="bg-black rounded-xl overflow-hidden relative shadow-sm" style={{ height: '450px' }}>
              <img 
                src={fotoExibida}
                alt={`${titulo} - foto ${fotoAtual + 1}`}
                className="w-full h-full object-contain bg-slate-100"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/600?text=Imagem+não+disponível';
                }}
              />

              {fotos.length > 1 && (
                <>
                  <button
                    onClick={irAnterior}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-slate-900 rounded-full p-2.5 shadow-lg transition-all"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={irProxima}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-slate-900 rounded-full p-2.5 shadow-lg transition-all"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white px-4 py-1.5 rounded-full text-sm font-medium">
                    {fotoAtual + 1} de {fotos.length}
                  </div>
                </>
              )}
            </div>

            {/* Miniaturas */}
            {fotos.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {fotos.map((foto, index) => (
                  <button
                    key={index}
                    onClick={() => setFotoAtual(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      index === fotoAtual ? 'border-[#0A847C] opacity-100' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={foto} alt={`Miniatura ${index}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Caixa de Descrição e Detalhes */}
            <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-200">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6 leading-tight">
                {titulo}
              </h1>
              
              <div className="border-t border-slate-100 pt-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Descrição do Serviço</h2>
                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {descricao}
                </p>
              </div>

              <div className="border-t border-slate-100 mt-8 pt-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Localização</h2>
                <div className="flex items-center gap-3 text-slate-600 bg-slate-50 p-4 rounded-lg">
                  <MapPin className="h-6 w-6 text-[#0A847C] flex-shrink-0" />
                  <span className="font-medium">{labelDistancia}</span>
                </div>
              </div>
            </div>
          </div>

          {/* LADO DIREITO (Card Fixo com Preço e Botões) */}
          <div className="lg:col-span-4">
            <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 sticky top-24">
              
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1">Preço do Serviço</p>
              <div className="text-4xl font-bold text-[#0A847C] mb-6">
                R$ {Number(preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>

              {produto.status === 'sold' && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-center">
                  <p className="text-red-700 font-bold uppercase tracking-wider text-sm">Este item já foi vendido</p>
                </div>
              )}

              {/* Botões de Ação (Espaçados e alinhados) */}
              <div className="space-y-3 pt-2">
                <Button 
                  onClick={handleCompra} 
                  disabled={comprando || produto.status === 'sold'}
                  className="w-full h-14 text-base font-bold bg-[#10B981] hover:bg-[#059669] text-white transition-all rounded-xl shadow-sm disabled:bg-slate-300"
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  {comprando ? 'Processando...' : produto.status === 'sold' ? 'Vendido' : 'Comprar Agora'}
                </Button>
                
                <Button 
                  onClick={handleStartChat}
                  disabled={authLoading || currentUser?.id === produto?.owner_id || produto.status === 'sold'}
                  className="w-full h-14 text-base font-bold bg-white border-2 border-[#0A847C] text-[#0A847C] hover:bg-[#0A847C] hover:text-white transition-all rounded-xl shadow-sm disabled:border-slate-300 disabled:text-slate-400 disabled:hover:bg-white"
                >
                  <MessageCircle className="mr-2 h-5 w-5" />
                  {currentUser?.id === produto?.owner_id ? 'Este é o seu anúncio' : 'Conversar pelo Chat'}
                </Button>
              </div>

              {/* Selo de Segurança */}
              <div className="mt-6 flex items-start gap-3 p-4 bg-emerald-50/50 rounded-lg border border-emerald-100">
                <ShieldCheck className="h-6 w-6 text-emerald-500 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-emerald-900 text-sm">Garantia ServiCE</p>
                  <p className="text-xs text-emerald-700 mt-0.5">Pagamento protegido até a conclusão do serviço.</p>
                </div>
              </div>

              {/* Informações do Vendedor */}
              <div className="mt-6 pt-6 border-t border-slate-100">
                <p className="text-sm font-semibold text-slate-900 mb-4">Informações do anunciante</p>
                <div className="flex items-center gap-3">
                  {ownerInfo?.avatar_url ? (
                    <img src={ownerInfo.avatar_url} alt="Vendedor" className="w-12 h-12 rounded-full border border-slate-200 object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-xl">👤</div>
                  )}
                  <div>
                    <p className="font-semibold text-slate-900">{ownerInfo?.full_name || 'Usuário'}</p>
                    <p className="text-xs text-slate-500">Na plataforma desde {new Date(ownerInfo?.created_at || produto.created_at).getFullYear()}</p>
                  </div>
                </div>
              </div>

              {/* Botão de Denúncia (Fica no rodapé do card direito) */}
              <div className="mt-8 pt-4 border-t border-slate-100 text-center">
                <button 
                  onClick={() => setIsReportModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-red-600 transition-colors"
                >
                  <Flag className="h-3.5 w-3.5" />
                  Denunciar este anúncio
                </button>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* MODAL DE DENÚNCIA */}
      <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
        <DialogContent className="max-w-md border-0 p-0 shadow-2xl rounded-2xl overflow-hidden">
          <DialogHeader className="bg-red-50 px-6 py-5 border-b border-red-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-2 rounded-full text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <DialogTitle className="text-xl font-bold text-slate-900">
                  Denunciar Anúncio
                </DialogTitle>
              </div>
              <DialogClose asChild>
                <button className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </DialogClose>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-4">
            <DialogDescription className="text-slate-600 mb-4">
              Por favor, selecione o motivo que melhor descreve o problema com este anúncio. Nossa equipe avaliará a situação.
            </DialogDescription>

            <div className="space-y-2">
              {REPORT_REASONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                    reportReason === option.value
                      ? 'border-red-500 bg-red-50'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="reportReason"
                    value={option.value}
                    checked={reportReason === option.value}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="h-4 w-4 border-slate-300 text-red-600 focus:ring-red-600"
                  />
                  <span className="text-sm font-medium text-slate-700">{option.label}</span>
                </label>
              ))}
            </div>

            {reportReason === 'Outro' && (
              <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                <Textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Por favor, detalhe o que há de errado com o anúncio..."
                  className="min-h-[100px] rounded-xl border-slate-200 resize-none focus-visible:ring-red-500"
                />
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsReportModalOpen(false)}
              className="rounded-lg text-slate-600"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleReport}
              disabled={isReporting || (reportReason === 'Outro' && !reportDetails.trim())}
              className="rounded-lg bg-red-600 text-white hover:bg-red-700"
            >
              {isReporting ? 'Enviando...' : 'Enviar Denúncia'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}