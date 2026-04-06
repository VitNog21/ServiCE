import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { ShoppingCart, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button'; // Usando o alias @ padrão do projeto

export default function ProductDetails() {
  const { id } = useParams(); 
  const navigate = useNavigate();
  const [produto, setProduto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comprando, setComprando] = useState(false);

  useEffect(() => {
    async function fetchProduto() {
      try {
        const { data, error } = await supabase
          .from('anuncios')
          .select('*')
          .eq('id', id)
          .single();

        if (error || !data) {
          // Fallback para testes: Se não encontrar no banco, mostra dados mockados
          console.warn('Produto não encontrado no banco, usando dados de teste.');
          setProduto({
            id: id,
            titulo: `Serviço Exemplo ${id}`,
            descricao: 'Esta é uma descrição detalhada de teste para o serviço selecionado.',
            preco: 150.00,
            imagem_url: null
          });
        } else {
          setProduto(data);
        }
      } catch (err) {
        console.error('Erro:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchProduto();
  }, [id]);

  // 2. Lógica de Venda
  const handleCompra = async () => {
    setComprando(true);
    
    // a) Verificar se o usuário está logado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("Você precisa estar logado para comprar!");
      navigate('/login');
      return;
    }

    // b) Criar o registro da venda (Pedido)
    // Aqui estamos enviando os dados para a tabela 'pedidos' que estão documetados no README
    const { data, error } = await supabase
      .from('pedidos')
      .insert([
        {
          anuncio_id: produto.id,
          comprador_id: user.id,
          vendedor_id: produto.usuario_id,
          valor_total: produto.preco,
          status: 'pendente' // Começa como pendente até o pagamento
        }
      ])
      .select();

    if (error) {
      alert("Erro ao processar pedido: " + error.message);
    } else {
      // c) Sucesso: Redireciona para uma tela de confirmação ou checkout
      alert("✅ Pedido realizado! Agora você será redirecionado para o pagamento.");
      navigate(`/meus-pedidos`); 
    }
    setComprando(false);
  };

  if (loading) return <div className="p-10 text-center">Carregando detalhes...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
      </Button>

      <div className="grid md:grid-cols-2 gap-8 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        {/* Imagem do Produto */}
        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
          <img 
            src={produto.imagem_url || 'https://via.placeholder.com/400'} 
            alt={produto.titulo}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Informações e Botão de Compra */}
        <div className="flex flex-col justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{produto.titulo}</h1>
            <p className="text-gray-500 mt-2">{produto.descricao}</p>
            <div className="mt-6">
              <span className="text-4xl font-bold text-blue-600">
                R$ {produto.preco?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <div className="flex items-center text-sm text-green-600 bg-green-50 p-3 rounded-lg">
              <ShieldCheck className="mr-2 h-5 w-5" />
              Compra garantida: Receba o serviço ou seu dinheiro de volta.
            </div>
            
            <Button 
              onClick={handleCompra} 
              disabled={comprando}
              className="w-full h-14 text-lg transition-all"
            >
              <ShoppingCart className="mr-2" />
              {comprando ? 'Processando...' : 'Comprar Agora'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
