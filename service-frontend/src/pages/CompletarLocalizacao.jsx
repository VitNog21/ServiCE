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
    <div className="min-h-screen flex items-center justify-center bg-[var(--gray-50)] p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-[var(--radius-xl)] shadow-2xl border border-[var(--gray-100)] overflow-hidden animate-in fade-in zoom-in duration-500">
        
        <div className="bg-[var(--green-700)] p-6 text-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <MapPin className="h-8 w-8 text-[var(--green-700)]" />
          </div>
          <h2 className="text-2xl font-bold text-white">Quase lá!</h2>
          <p className="text-white/80 text-sm mt-1 bg-white/20 inline-block px-3 py-1 rounded-full font-medium">
            Falta apenas um detalhe
          </p>
        </div>

        <div className="p-6 md:p-8">
          <p className="text-[var(--gray-600)] text-center mb-6 leading-relaxed">
            Para te mostrar os melhores serviços próximos a você, precisamos saber a sua localização base.
          </p>

          {message && (
            <div className="mb-4 p-3 rounded-[var(--radius-sm)] bg-red-50 text-red-600 text-sm font-semibold text-center border border-red-100">
              {message}
            </div>
          )}

          <form onSubmit={handleSaveLocation} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[12px] font-bold text-[var(--gray-400)] uppercase tracking-[0.06em] ml-1">Seu endereço ou bairro</label>
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
              className="w-full h-12 bg-[var(--green-700)] hover:bg-[var(--green-800)] text-white font-bold text-lg rounded-[var(--radius-md)] shadow-lg shadow-emerald-900/10 transition-all active:scale-[0.97]"
              disabled={saving}
            >
              {saving ? 'A salvar...' : 'Confirmar e Entrar'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-[var(--gray-50)] text-center">
            <Button
              type="button"
              variant="ghost"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 text-sm text-[var(--gray-400)] hover:text-[var(--gray-900)] transition-colors rounded-[var(--radius-sm)]"
            >
              <LogOut className="h-4 w-4" />
              Sair e preencher depois
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
