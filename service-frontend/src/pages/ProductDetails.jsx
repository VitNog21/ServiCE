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
      toast({
        title: "Aviso",
        description: "Você não pode conversar com você mesmo.",
      });
      return;
    }
    navigate(`/chat/${produto.id}/${produto.owner_id}`);
  };

  const handleCompra = async () => {
    setComprando(true);
    
    if (!currentUser) {
      toast({
        title: "Login necessário",
        description: "Você precisa estar logado para comprar.",
      });
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
      toast({
        title: "Erro",
        description: `Erro ao processar pedido: ${error.message}`,
        variant: "destructive"
      });
    } else {
      const newOrder = data[0];
      navigate(`/checkout/${newOrder.id}`); 
    }
    setComprando(false);
  };

  const handleReport = async () => {
    if (!currentUser) {
      toast({
        title: "Login necessário",
        description: "Você precisa estar logado para denunciar um anúncio.",
      });
      navigate('/login');
      return;
    }

    if (reportReason === 'Outro' && !reportDetails.trim()) {
      toast({
        title: "Detalhes necessários",
        description: "Por favor, detalhe o motivo da denúncia.",
      });
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
          status: 'pending'
        }
      ]);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Sua denúncia foi recebida com sucesso! Nossa equipe irá analisar o anúncio em breve.",
      });
      setIsReportModalOpen(false);
      setReportDetails('');
      setReportReason('Fraude ou Golpe');
    } catch (err) {
      console.error('Erro ao denunciar:', err);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao enviar a denúncia. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsReporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 w-full">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A847C]"></div>
          <p className="mt-4 text-slate-600">Carregando detalhes...</p>
        </div>
      </div>
    );
  }

  if (!produto) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 w-full">
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
    <div className="min-h-screen bg-slate-50 pb-12 w-full flex flex-col font-sans">
      
      {/* Header Fixo */}
      <div className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm">
        <div style={{ width: '100%', padding: '0 32px' }}>
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate(-1)}
                className="text-slate-600 hover:text-[#0A847C] hover:bg-[#0A847C]/5 transition-colors rounded-xl p-2 h-auto w-auto"
                title="Voltar"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <img
                src="/assets/logo_service.png"
                alt="ServiCE"
                className="h-8 cursor-pointer"
                onClick={() => navigate('/')}
              />
            </div>
            <div className="inline-flex items-center gap-2 rounded-xl bg-[#0A847C]/10 px-4 py-1.5">
              <span className="text-xs font-bold text-[#0A847C] uppercase tracking-wider">
                {categoria}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px', flex: 1, width: '100%' }}>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start justify-center">

          {/* LADO ESQUERDO (Foto + Descrição) */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6 w-full" style={{ minWidth: 0 }}>
            
            {/* Galeria de Fotos */}
            <div className="bg-slate-100/50 rounded-3xl border border-slate-200 shadow-sm overflow-hidden relative w-full h-[350px] md:h-[450px] lg:h-[520px] flex items-center justify-center p-4" style={{ alignSelf: 'center' }}>
              <img 
                src={fotoExibida}
                alt={`${titulo} - foto ${fotoAtual + 1}`}
                className="max-w-full max-h-full object-contain drop-shadow-md"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/600?text=Imagem+não+disponível';
                }}
              />

              {fotos.length > 1 && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={irAnterior}
                    className="absolute left-6 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-900 rounded-full p-3 shadow-lg border-0 transition-all hover:scale-105 h-auto w-auto"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={irProxima}
                    className="absolute right-6 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-900 rounded-full p-3 shadow-lg border-0 transition-all hover:scale-105 h-auto w-auto"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/70 backdrop-blur-md text-white px-5 py-2 rounded-full text-sm font-semibold tracking-wide">
                    {fotoAtual + 1} / {fotos.length}
                  </div>
                </>
              )}
            </div>

            {/* Miniaturas */}
            {fotos.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 w-full custom-scrollbar justify-center">
                {fotos.map((foto, index) => (
                  <Button
                    type="button"
                    variant="outline"
                    key={index}
                    onClick={() => setFotoAtual(index)}
                    className={`flex-shrink-0 w-24 h-24 rounded-2xl overflow-hidden border-2 transition-all p-0 bg-white ${
                      index === fotoAtual ? 'border-[#0A847C] opacity-100' : 'border-slate-200 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={foto} alt={`Miniatura ${index}`} className="w-full h-full object-cover" />
                  </Button>
                ))}
              </div>
            )}

            {/* Caixa de Descrição e Detalhes */}
            <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-sm border border-slate-200 w-full">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-8 leading-tight tracking-tight">
                {titulo}
              </h1>
              
              <div className="border-t border-slate-100 pt-8">
                <h2 className="text-xl font-bold text-slate-900 mb-5">Descrição do Serviço</h2>
                <p className="text-slate-600 text-lg leading-relaxed whitespace-pre-wrap">
                  {descricao}
                </p>
              </div>

              <div className="border-t border-slate-100 mt-8 pt-8">
                <h2 className="text-xl font-bold text-slate-900 mb-5">Localização</h2>
                <div className="flex items-center gap-4 text-slate-700 bg-slate-50/80 p-5 rounded-2xl border border-slate-100">
                  <div className="bg-white p-3 rounded-full shadow-sm">
                    <MapPin className="h-6 w-6 text-[#0A847C]" />
                  </div>
                  <span className="font-medium text-lg break-words">{labelDistancia}</span>
                </div>
              </div>
            </div>
          </div>

          {/* LADO DIREITO (Card de Ações) */}
          <div className="lg:col-span-5 xl:col-span-4 w-full">
            <div className="bg-white p-8 rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-200 sticky top-28 flex flex-col gap-8">
              
              {/* Preço */}
              <div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Preço do Serviço</p>
                <div className="text-4xl sm:text-5xl font-extrabold text-[#0A847C] tracking-tight">
                  R$ {Number(preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>

              {produto.status === 'sold' && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-center">
                  <p className="text-red-700 font-bold uppercase tracking-wider text-sm">Este item já foi vendido</p>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex flex-col gap-4">
                <Button 
                  onClick={handleCompra} 
                  disabled={comprando || produto.status === 'sold'}
                  className="w-full h-16 text-lg font-bold bg-[#10B981] hover:bg-[#059669] text-white transition-all rounded-2xl shadow-md hover:shadow-lg flex items-center justify-center gap-3 disabled:bg-slate-300"
                >
                  <ShoppingCart className="h-6 w-6" />
                  {comprando ? 'Processando...' : produto.status === 'sold' ? 'Vendido' : 'Comprar Agora'}
                </Button>
                
                <Button 
                  onClick={handleStartChat}
                  disabled={authLoading || currentUser?.id === produto?.owner_id || produto.status === 'sold'}
                  className="w-full h-16 text-lg font-bold bg-white border-2 border-[#0A847C] text-[#0A847C] hover:bg-[#0A847C] hover:text-white transition-all rounded-2xl shadow-sm flex items-center justify-center gap-3 disabled:border-slate-300 disabled:text-slate-400"
                >
                  <MessageCircle className="h-6 w-6" />
                  {currentUser?.id === produto?.owner_id ? 'Este é o seu anúncio' : 'Conversar pelo Chat'}
                </Button>
              </div>

              {/* Selo de Segurança */}
              <div className="flex items-center gap-4 p-5 bg-emerald-50/80 rounded-2xl border border-emerald-100">
                <div className="bg-white p-2 rounded-full shadow-sm">
                  <ShieldCheck className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="font-bold text-emerald-900">Garantia ServiCE</p>
                  <p className="text-sm text-emerald-700/90 mt-0.5 leading-tight">Pagamento protegido até a conclusão.</p>
                </div>
              </div>

              {/* Informações do Vendedor */}
              <div className="pt-8 border-t border-slate-100">
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-5">Anunciante</p>
                <div className="flex items-center gap-4">
                  {ownerInfo?.avatar_url ? (
                    <img src={ownerInfo.avatar_url} alt="Vendedor" className="w-14 h-14 rounded-full border-2 border-slate-100 object-cover shadow-sm" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-2xl shadow-sm border border-slate-200">👤</div>
                  )}
                  <div>
                    <p className="font-bold text-slate-900 text-lg line-clamp-1">{ownerInfo?.full_name || 'Usuário'}</p>
                    <p className="text-sm font-medium text-slate-500">Na plataforma desde {new Date(ownerInfo?.created_at || produto.created_at).getFullYear()}</p>
                  </div>
                </div>
              </div>

              {/* Botão de Denúncia */}
              <div className="pt-4 mt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsReportModalOpen(true)}
                  className="w-full h-12 flex items-center justify-center gap-2 text-sm font-semibold text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors rounded-xl"
                >
                  <Flag className="h-4 w-4" />
                  Denunciar este anúncio
                </Button>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* MODAL DE DENÚNCIA */}
      <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
        <DialogContent className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[95vw] max-w-md bg-white border-0 p-0 shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader className="bg-red-50 px-6 py-5 border-b border-red-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-2.5 rounded-2xl text-red-600 shadow-sm">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <DialogTitle className="text-xl font-bold text-slate-900">
                  Denunciar Anúncio
                </DialogTitle>
              </div>
              <DialogClose asChild>
                <Button type="button" variant="ghost" className="text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-xl p-2 h-auto">
                  <X className="h-5 w-5" />
                </Button>
              </DialogClose>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
            <DialogDescription className="text-slate-600 font-medium leading-relaxed">
              Por favor, selecione o motivo que melhor descreve o problema com este anúncio. Nossa equipe avaliará a situação.
            </DialogDescription>

            <div className="space-y-3">
              {REPORT_REASONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 px-5 py-4 transition-all ${
                    reportReason === option.value
                      ? 'border-red-500 bg-red-50/50 shadow-sm'
                      : 'border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="reportReason"
                    value={option.value}
                    checked={reportReason === option.value}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="h-4.5 w-4.5 border-slate-300 text-red-600 focus:ring-red-600 focus:ring-offset-1"
                  />
                  <span className="text-sm font-bold text-slate-700">{option.label}</span>
                </label>
              ))}
            </div>

            {reportReason === 'Outro' && (
              <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                <Textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Por favor, detalhe o que há de errado com o anúncio..."
                  className="min-h-[120px] rounded-2xl border-2 border-slate-200 p-4 resize-none focus-visible:ring-0 focus-visible:border-red-500 text-slate-700"
                />
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-5 border-t border-slate-100 bg-slate-50/80 flex justify-end gap-3 w-full sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsReportModalOpen(false)}
              className="rounded-xl font-bold h-12 px-6 text-slate-600 bg-white border-slate-200 hover:bg-slate-100 hover:text-slate-900"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleReport}
              disabled={isReporting || (reportReason === 'Outro' && !reportDetails.trim())}
              className="rounded-xl font-bold h-12 px-6 bg-red-600 text-white hover:bg-red-700 shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {isReporting ? 'Enviando...' : 'Enviar Denúncia'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}