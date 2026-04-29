import { useNavigate } from 'react-router-dom';
import { CheckCircle, Package, ArrowRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Success() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-emerald-100 animate-in fade-in zoom-in duration-300">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-100 rounded-full mb-6">
          <CheckCircle className="h-10 w-10 text-emerald-600" />
        </div>
        
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Pagamento Aprovado!</h1>
        <p className="text-slate-600 mb-8 leading-relaxed">
          Seu pedido foi processado com sucesso. O vendedor já foi notificado e em breve entrará em contato.
        </p>
        
        <div className="space-y-3">
          <Button 
            onClick={() => navigate('/meus-anuncios')} 
            className="w-full bg-[#0A847C] hover:bg-[#085a51] h-12 text-lg font-bold rounded-xl shadow-md transition-all"
          >
            <Package className="mr-2 h-5 w-5" /> Ver Meus Pedidos
          </Button>
          
          <Button 
            onClick={() => navigate('/')} 
            variant="ghost" 
            className="w-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl"
          >
            <Home className="mr-2 h-4 w-4" /> Voltar para a Home
          </Button>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 text-xs text-slate-400">
          Você receberá um e-mail com os detalhes da transação.
        </div>
      </div>
    </div>
  );
}
