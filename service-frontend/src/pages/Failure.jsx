import { useNavigate } from 'react-router-dom';
import { XCircle, AlertCircle, RefreshCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Failure() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-red-100 animate-in fade-in zoom-in duration-300">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
          <XCircle className="h-10 w-10 text-red-600" />
        </div>
        
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Ops! Algo deu errado.</h1>
        <p className="text-slate-600 mb-8 leading-relaxed">
          Não conseguimos processar o seu pagamento no momento. Por favor, verifique os dados do cartão ou tente outro método.
        </p>

        <div className="bg-red-50 rounded-xl p-4 mb-8 flex items-start gap-3 text-left">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">
            Dica: Se você estiver testando, certifique-se de não usar a mesma conta para comprar e vender.
          </p>
        </div>
        
        <div className="space-y-3">
          <Button 
            onClick={() => navigate('/meus-anuncios')} 
            className="w-full bg-red-600 hover:bg-red-700 h-12 text-lg font-bold rounded-xl shadow-md transition-all"
          >
            <RefreshCcw className="mr-2 h-5 w-5" /> Tentar Novamente
          </Button>
          
          <Button 
            onClick={() => navigate('/')} 
            variant="ghost" 
            className="w-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl"
          >
            <Home className="mr-2 h-4 w-4" /> Voltar para a Home
          </Button>
        </div>
      </div>
    </div>
  );
}
