import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { ShoppingCart, ArrowLeft, ShieldCheck, MapPin, ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
        console.log('🔍 Buscando anúncio com ID:', id);
        
        const { data, error } = await supabase
          .from('listings')
          .select(`
            id,
            title,
            description,
            price,
            image_urls,
            category:categories(name),
            address_text,
            owner_id,
            created_at
          `)
          .eq('id', id)
          .single();

        if (error) {
          console.error('❌ Erro detalhado:', {
            message: error.message,
            code: error.code,
            status: error.status,
            details: error.details
          });
          setProduto(null);
        } else if (data) {
          console.log('✅ Dados carregados com sucesso:', data);
          setProduto(data);
          
          // Buscar info do dono
          if (data.owner_id) {
            const { data: ownerData } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url')
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
      alert('Você não pode conversar com você mesmo!');
      return;
    }
    navigate(`/chat/${produto.id}/${produto.owner_id}`);
  };

  const handleCompra = async () => {
    setComprando(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("Você precisa estar logado para comprar!");
      navigate('/login');
      return;
    }

    const { data, error } = await supabase
      .from('pedidos')
      .insert([
        {
          anuncio_id: produto.id,
          comprador_id: user.id,
          vendedor_id: produto.owner_id,
          valor_total: produto.price,
          status: 'pendente'
        }
      ])
      .select();

    if (error) {
      alert("Erro ao processar pedido: " + error.message);
    } else {
      alert("✅ Pedido realizado! Agora você será redirecionado para o seus anúncios.");
      navigate(`/meus-anuncios`); 
    }
    setComprando(false);
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

  // Obter lista de fotos
  const fotos = [];
  
  // Se vier como array image_urls
  if (produto.image_urls && Array.isArray(produto.image_urls) && produto.image_urls.length > 0) {
    fotos.push(...produto.image_urls.filter(url => url));
  }
  
  // Se vier como string imagem_url (uso singular)
  if (produto.imagem_url && !fotos.includes(produto.imagem_url)) {
    fotos.push(produto.imagem_url);
  }
  
  // Fallback com imagens padrão se não houver nenhuma
  if (fotos.length === 0) {
    fotos.push(
      'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&h=600&fit=crop'
    );
  }

  const fotoExibida = fotos[fotoAtual] || fotos[0];

  const irProxima = () => {
    setFotoAtual((prev) => (prev + 1) % fotos.length);
  };

  const irAnterior = () => {
    setFotoAtual((prev) => (prev - 1 + fotos.length) % fotos.length);
  };

  const labelDistancia = produto.address_text || 'Localização não disponível';

  // Dados limpos e validados
  const titulo = produto.title?.trim() || 'Serviço';
  const descricao = produto.description?.trim() || 'Descrição não disponível';
  const categoria = produto.category?.name || 'Serviço';
  const preco = produto.price || 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-slate-700 hover:text-[#0A847C] transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="font-medium">Voltar</span>
            </button>
            <h1 className="absolute left-1/2 transform -translate-x-1/2 text-sm font-semibold text-slate-900">
              {titulo}
            </h1>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Galeria de Fotos */}
          <div className="space-y-4">
            {/* Imagem Principal */}
            <div className="relative group rounded-2xl overflow-hidden bg-slate-100 aspect-square shadow-lg">
              <img 
                src={fotoExibida}
                alt={`${titulo} - foto ${fotoAtual + 1}`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/600?text=Imagem+não+disponível';
                }}
              />

              {/* Controles de Navegação */}
              {fotos.length > 1 && (
                <>
                  <button
                    onClick={irAnterior}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-900 rounded-full p-2 shadow-lg transition-all"
                    aria-label="Foto anterior"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={irProxima}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-900 rounded-full p-2 shadow-lg transition-all"
                    aria-label="Próxima foto"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>

                  {/* Indicador de Foto */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-medium">
                    {fotoAtual + 1} / {fotos.length}
                  </div>
                </>
              )}
            </div>

            {/* Miniaturas */}
            {fotos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {fotos.map((foto, index) => (
                  <button
                    key={index}
                    onClick={() => setFotoAtual(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      index === fotoAtual 
                        ? 'border-[#0A847C] shadow-md' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <img 
                      src={foto}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/100?text=Erro';
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Informações do Produto */}
          <div className="flex flex-col">
            {/* Cabeçalho com Categoria */}
            <div className="mb-4">
              <div className="inline-flex items-center gap-2 rounded-lg bg-[#0A847C]/10 px-3 py-1.5 mb-3">
                <span className="text-xs font-semibold text-[#0A847C] uppercase tracking-wide">
                  {categoria}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight">
                {titulo}
              </h1>
            </div>

            {/* Localização */}
            <div className="flex items-center gap-2 text-slate-600 mb-6 pb-6 border-b border-slate-200">
              <MapPin className="h-5 w-5 text-[#0A847C] flex-shrink-0" />
              <span className="font-medium">{labelDistancia}</span>
            </div>

            {/* Descrição */}
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-3">Sobre este serviço</h2>
              <p className="text-slate-600 leading-relaxed text-base">
                {descricao}
              </p>
            </div>

            {/* Preço */}
            <div className="mb-8 p-6 bg-gradient-to-br from-[#0A847C]/5 to-[#10B981]/5 rounded-2xl border border-[#0A847C]/10">
              <p className="text-sm text-slate-600 uppercase tracking-wide font-medium mb-2">Preço</p>
              <span className="text-4xl font-bold text-[#0A847C]">
                R$ {Number(preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <p className="text-xs text-slate-500 mt-2">Preço por serviço</p>
            </div>

            {/* Segurança */}
            <div className="mb-8 flex items-start gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <ShieldCheck className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-emerald-900 text-sm">Compra Segura Garantida</p>
                <p className="text-xs text-emerald-700 mt-1">Receba o serviço ou seu dinheiro de volta</p>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="space-y-3">
              <Button 
                onClick={handleCompra} 
                disabled={comprando}
                className="w-full h-14 text-base font-semibold bg-[#10B981] hover:bg-[#059669] text-white transition-all rounded-xl"
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                {comprando ? 'Processando...' : 'Comprar Agora'}
              </Button>
              
              <Button 
                onClick={handleStartChat}
                disabled={authLoading || currentUser?.id === produto?.owner_id}
                className="w-full h-12 text-base font-medium bg-[#0A847C] hover:bg-[#085a51] text-white transition-all rounded-xl"
              >
                <MessageCircle className="mr-2 h-5 w-5" />
                {currentUser?.id === produto?.owner_id ? 'É seu anúncio' : 'Iniciar Chat'}
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => navigate(-1)}
                className="w-full h-12 text-base font-medium border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl"
              >
                Voltar à busca
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
