import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../supabase';
import { Button } from '@/components/ui/button';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import '../css/profile.css';

const EditProfile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({
    full_name: '',
    location: '',
    gender: '',
    avatar_url: '',
    rating: 5.0,
    sales_count: 0
  });

  const [formData, setFormData] = useState({
    full_name: '',
    location: '',
    gender: ''
  });

  const [selectedCoordinates, setSelectedCoordinates] = useState({ lat: null, lon: null });

  const [previewUrl, setPreviewUrl] = useState('');
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // 1. Carregar dados do utilizador e seu perfil
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoadingUser(true);
        setMessage({ type: '', text: '' });

        let currentUser = null;

        // A. Tenta obter utilizador via Supabase (Google ou Email oficial)
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          currentUser = sessionData.session.user;
        } else {
          // B. Fallback para localStorage (login antigo/teste)
          const savedUser = localStorage.getItem('service_user');
          if (savedUser) {
            try {
              currentUser = JSON.parse(savedUser);
            } catch (e) {
              console.error('Erro ao ler localStorage:', e);
            }
          }
        }

        // C. Se não encontrar ninguém, redireciona para o login
        if (!currentUser) {
          setMessage({ type: 'error', text: 'Utilizador não autenticado.' });
          setTimeout(() => navigate('/login'), 2000);
          return;
        }

        setUser(currentUser);

        // D. Buscar dados na tabela 'profiles'
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }

        // E. Lógica de Preenchimento
        if (profileData) {
          setProfile(profileData);
          setFormData({
            full_name: profileData.full_name || currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || '',
            location: profileData.location || '',
            gender: profileData.gender || ''
          });
          setSelectedCoordinates({
            lat: profileData.lat ?? null,
            lon: profileData.lon ?? null
          });
          setPreviewUrl(profileData.avatar_url || currentUser.user_metadata?.avatar_url || '');
        } else {
          // Perfil novo
          const initialName = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || '';
          const initialAvatar = currentUser.user_metadata?.avatar_url || '';
          
          setFormData({
            full_name: initialName,
            location: '',
            gender: ''
          });
          setSelectedCoordinates({ lat: null, lon: null });
          setPreviewUrl(initialAvatar);
        }

      } catch (error) {
        console.error('Erro ao carregar perfil:', error);
        setMessage({ type: 'error', text: 'Erro ao carregar dados do perfil.' });
      } finally {
        setLoadingUser(false);
      }
    };

    fetchUserProfile();
  }, [navigate]);

  // Handle mudanças no formulário
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLocationInputChange = (addressText) => {
    setFormData(prev => ({ ...prev, location: addressText }));
    setSelectedCoordinates({ lat: null, lon: null });
  };

  const handleLocationSelect = ({ display_name, lat, lon }) => {
    setFormData(prev => ({ ...prev, location: display_name }));
    setSelectedCoordinates({ lat, lon });
  };

  // Handle upload de imagem
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoadingUpload(true);
      setMessage({ type: '', text: '' });

      if (!file.type.startsWith('image/')) {
        setMessage({ type: 'error', text: 'Por favor, selecione uma imagem válida.' });
        return;
      }

      const ext = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setPreviewUrl(publicUrlData.publicUrl);
      setMessage({ type: 'success', text: 'Imagem carregada com sucesso!' });
    } catch (error) {
      console.error('Erro no upload:', error);
      setMessage({ type: 'error', text: 'Erro ao fazer upload da imagem.' });
    } finally {
      setLoadingUpload(false);
    }
  };

  // Salvar perfil no banco
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      setMessage({ type: '', text: '' });

      const dataToSave = {
        full_name: formData.full_name,
        location: formData.location,
        lat: selectedCoordinates.lat,
        lon: selectedCoordinates.lon,
        gender: formData.gender,
        avatar_url: previewUrl || null
      };

      const { error } = await supabase
        .from('profiles')
        .update(dataToSave)
        .eq('id', user.id);

      if (error) throw error;

      setProfile(prev => ({ ...prev, ...dataToSave }));
      setMessage({ type: 'success', text: 'Perfil guardado com sucesso!' });
    } catch (error) {
      console.error('Erro ao salvar:', error);
      setMessage({ type: 'error', text: 'Erro ao guardar o perfil.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('service_user');
      localStorage.removeItem('service_token');
      navigate('/login');
    } catch (error) {
      console.error('Erro ao sair:', error);
    }
  };

  if (loadingUser) {
    return <div className="profile-body"><div className="profile-card"><p>A carregar perfil...</p></div></div>;
  }

  return (
    <div className="profile-body bg-[#F5F7F9] min-h-screen flex items-center justify-center p-4">
      <div className="profile-card bg-white w-full max-w-2xl rounded-2xl shadow-sm border border-slate-200 p-8">
        
        <Button
          type="button"
          variant="ghost"
          className="mb-6 -ml-4 text-slate-600 hover:text-slate-900"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Editar Perfil</h1>
        </div>

        {message.text && (
          <div className={`p-4 mb-6 rounded-lg font-medium text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-8">
          
          {/* SEÇÃO DE FOTO DE PERFIL (LADO A LADO) */}
          <div>
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-4">Foto de Perfil</h2>
            <div className="flex items-center gap-6">
              
              {/* Foto Redonda */}
              <div className="w-24 h-24 shrink-0 rounded-full overflow-hidden bg-slate-100 border-2 border-slate-200 flex items-center justify-center">
                {previewUrl ? (
                  <img src={previewUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-slate-400 text-sm font-medium">Sem foto</span>
                )}
              </div>
              
              {/* Botão de Upload e Hint */}
              <div className="flex flex-col gap-2">
                <input 
                  type="file" 
                  accept="image/*" 
                  id="avatar-input"
                  onChange={handleFileChange} 
                  disabled={loadingUpload || savingProfile}
                  className="hidden" 
                />
                <label 
                  htmlFor="avatar-input" 
                  className="bg-[#0A847C] hover:bg-[#085a51] text-white px-5 py-2.5 rounded-lg text-sm font-bold cursor-pointer transition-colors w-fit text-center shadow-sm"
                >
                  {loadingUpload ? 'A enviar...' : 'Mudar Foto'}
                </label>
                <p className="text-xs text-slate-500 font-medium">JPEG, PNG ou GIF. Máx. 5MB</p>
              </div>

            </div>
          </div>

          <hr className="border-slate-100" />

          {/* INFORMAÇÕES PESSOAIS */}
          <div className="space-y-5">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Informações Pessoais</h2>
            
            <div className="flex flex-col gap-2">
              <label htmlFor="full_name" className="text-sm font-bold text-slate-700">Nome Completo</label>
              <input 
                type="text" 
                id="full_name" 
                name="full_name"
                value={formData.full_name} 
                onChange={handleFormChange}
                placeholder="Seu nome completo"
                className="w-full h-12 px-4 rounded-xl border border-slate-300 bg-white focus:border-[#0A847C] focus:ring-1 focus:ring-[#0A847C] outline-none transition-all text-slate-800"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="location" className="text-sm font-bold text-slate-700">Localidade</label>
              <div className="[&>div>input]:h-12 [&>div>input]:rounded-xl [&>div>input]:border-slate-300 [&>div>input]:focus:border-[#0A847C] [&>div>input]:focus:ring-1 [&>div>input]:focus:ring-[#0A847C]">
                <AddressAutocomplete
                  value={formData.location}
                  onChange={handleLocationInputChange}
                  onAddressSelect={handleLocationSelect}
                  disabled={savingProfile}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="gender" className="text-sm font-bold text-slate-700">Sexo</label>
              <select 
                id="gender" 
                name="gender" 
                value={formData.gender} 
                onChange={handleFormChange}
                className="w-full h-12 px-4 rounded-xl border border-slate-300 bg-white focus:border-[#0A847C] focus:ring-1 focus:ring-[#0A847C] outline-none transition-all text-slate-800 cursor-pointer"
              >
                <option value="">Selecionar</option>
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* AÇÕES FINAIS (SALVAR E SAIR) */}
          <div className="flex flex-col gap-3 pt-2">
            <button 
              type="submit" 
              disabled={loadingUpload || savingProfile}
              className="w-full h-14 bg-[#0A847C] hover:bg-[#085a51] text-white text-base font-bold rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingProfile ? 'A salvar...' : 'Salvar Perfil'}
            </button>
            
            <button 
              type="button" 
              onClick={handleLogout}
              className="w-full h-14 bg-white border border-red-200 text-red-600 hover:bg-red-50 text-base font-bold rounded-xl transition-colors"
            >
              Sair da Conta
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default EditProfile;