import { useNavigate } from 'react-router-dom';
import { CheckCircle, Package, ArrowRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Success() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--gray-50)] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[var(--radius-xl)] shadow-xl p-8 text-center border border-[var(--green-100)] animate-in fade-in zoom-in duration-300">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-[var(--green-50)] rounded-full mb-6">
          <CheckCircle className="h-10 w-10 text-[var(--green-700)]" />
        </div>
        
        <h1 className="text-3xl font-bold text-[var(--gray-900)] mb-2">Pagamento Aprovado!</h1>
        <p className="text-[var(--gray-600)] mb-8 leading-relaxed">
          Seu pedido foi processado com sucesso. O vendedor já foi notificado e em breve entrará em contato.
        </p>
        
        <div className="space-y-3">
          <Button 
            onClick={() => navigate('/meus-pedidos')} 
            className="w-full bg-[var(--green-700)] hover:bg-[var(--green-800)] h-12 text-lg font-bold rounded-[var(--radius-md)] shadow-md transition-all text-white"
          >
            <Package className="mr-2 h-5 w-5" /> Ver Meus Pedidos
          </Button>
          
          <Button 
            onClick={() => navigate('/')} 
            variant="ghost" 
            className="w-full text-[var(--gray-400)] hover:text-[var(--gray-900)] hover:bg-[var(--gray-100)] rounded-[var(--radius-md)]"
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
