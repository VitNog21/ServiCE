import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { MapPin, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AddressAutocomplete from '@/components/AddressAutocomplete';

export default function CompletarLocalizacao() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  const [location, setLocation] = useState('');
  const [selectedCoordinates, setSelectedCoordinates] = useState({ lat: null, lon: null });

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate('/login');
      } else {
        setUser(session.user);
      }
      setLoading(false);
    };
    checkUser();
  }, [navigate]);

  const handleLocationInputChange = (addressText) => {
    setLocation(addressText);
    setSelectedCoordinates({ lat: null, lon: null });
  };

  const handleLocationSelect = ({ display_name, lat, lon }) => {
    setLocation(display_name);
    setSelectedCoordinates({ lat, lon });
  };

  const handleSaveLocation = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    if (!selectedCoordinates.lat || !selectedCoordinates.lon) {
      setMessage('Por favor, selecione um endereço válido na lista.');
      setSaving(false);
      return;
    }

    try {
      // Atualiza o banco de dados
      const { error } = await supabase
        .from('profiles')
        .update({
          location: location,
          lat: selectedCoordinates.lat,
          lon: selectedCoordinates.lon
        })
        .eq('id', user.id);

      if (error) throw error;

      // Se deu certo, libera o usuário para a Home!
      navigate('/');
    } catch (error) {
      console.error('Erro ao salvar localização:', error);
      setMessage('Ocorreu um erro. Tente novamente.');
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        
        <div className="bg-[#0A847C] p-6 text-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <MapPin className="h-8 w-8 text-[#0A847C]" />
          </div>
          <h2 className="text-2xl font-bold text-white">Quase lá!</h2>
          <p className="text-[#0A847C] text-sm mt-1 bg-white/20 inline-block px-3 py-1 rounded-full">
            Falta apenas um detalhe
          </p>
        </div>

        <div className="p-6 md:p-8">
          <p className="text-slate-600 text-center mb-6">
            Para te mostrar os melhores serviços próximos a você, precisamos saber a sua localização base.
          </p>

          {message && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm font-medium text-center border border-red-100">
              {message}
            </div>
          )}

          <form onSubmit={handleSaveLocation} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Seu endereço ou bairro</label>
              <AddressAutocomplete
                value={location}
                onChange={handleLocationInputChange}
                onAddressSelect={handleLocationSelect}
                disabled={saving}
                placeholder="Ex: Aldeota, Fortaleza"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-[#10B981] hover:bg-[#059669] text-white font-bold text-lg rounded-xl"
              disabled={saving}
            >
              {saving ? 'A salvar...' : 'Confirmar e Entrar'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <button 
              onClick={handleLogout}
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sair e preencher depois
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}