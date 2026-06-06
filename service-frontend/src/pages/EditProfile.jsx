import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

        // E. Lógica de Preenchimento (Fallback para o nome do cadastro/Google)
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
          // Perfil novo: puxa o nome e foto do metadado do cadastro original
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
    <div className="profile-body">
      <div className="profile-card">
        <Button
          type="button"
          variant="ghost"
          className="mb-4"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>

        <div className="profile-header">
          <h1 className="profile-title">Editar Perfil</h1>
          <Button type="button" className="btn-logout" onClick={handleLogout}>Sair</Button>
        </div>

        {message.text && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSaveProfile}>
          {/* SEÇÃO DE FOTO DE PERFIL */}
          <div className="profile-section">
            <h2 className="section-title">Foto de Perfil</h2>
            <div className="avatar-container">
              {previewUrl ? (
                <img src={previewUrl} alt="Avatar" className="avatar-preview" />
              ) : (
                <div className="avatar-placeholder"><span>Sem foto</span></div>
              )}
              
              <div className="upload-controls">
                {/* INPUT ESCONDIDO */}
                <input 
                  type="file" 
                  accept="image/*" 
                  id="avatar-input"
                  onChange={handleFileChange} 
                  disabled={loadingUpload || savingProfile}
                  style={{ display: 'none' }} 
                />
                
                {/* LABEL QUE ATUA COMO BOTÃO VERDE */}
                <label htmlFor="avatar-input" className="btn-upload" style={{ cursor: 'pointer' }}>
                  {loadingUpload ? 'A enviar...' : 'Mudar Foto'}
                </label>
                
                <p className="upload-hint">JPEG, PNG ou GIF. Máx. 5MB</p>
              </div>
            </div>
          </div>

          {/* INFORMAÇÕES PESSOAIS */}
          <div className="profile-section">
            <h2 className="section-title">Informações Pessoais</h2>
            <div className="input-group">
              <label htmlFor="full_name">Nome Completo</label>
              <Input
                type="text" id="full_name" name="full_name"
                value={formData.full_name} onChange={handleFormChange}
                placeholder="Seu nome completo"
                className="h-11"
              />
            </div>
            <div className="input-group">
              <label htmlFor="location">Localidade</label>
              <AddressAutocomplete
                value={formData.location}
                onChange={handleLocationInputChange}
                onAddressSelect={handleLocationSelect}
                disabled={savingProfile}
              />
            </div>
            <div className="input-group">
              <label htmlFor="gender">Sexo</label>
              <select id="gender" name="gender" value={formData.gender} onChange={handleFormChange}>
                <option value="">Selecionar</option>
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
          </div>

          {/* MÉTRICAS READ-ONLY */}
          <div className="profile-section metrics-section">
            <h2 className="section-title">Métricas do Marketplace</h2>
            <div className="metrics-container">
              <div className="metric-card">
                <div className="metric-label">Classificação</div>
                <div className="metric-value rating">
                  {'⭐ '.repeat(Math.round(profile.rating || 5))}
                  <span className="rating-number">{(profile.rating || 5).toFixed(1)}</span>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Vendas Realizadas</div>
                <div className="metric-value sales">{profile.sales_count || 0}</div>
              </div>
            </div>
          </div>

          {/* AÇÕES FINAIS */}
          <div className="profile-actions">
            <Button type="submit" className="btn-primary" disabled={loadingUpload || savingProfile}>
              {savingProfile ? 'A salvar...' : 'Salvar Perfil'}
            </Button>
            <Button type="button" variant="outline" className="btn-secondary" onClick={() => navigate('/')}>
              Voltar ao Início
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfile;