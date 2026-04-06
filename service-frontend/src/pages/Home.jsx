import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { supabase } from '../supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import '../css/global.css';

const Home = () => {
  const [user, setUser] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Função isolada para buscar a foto (do Perfil ou do Google)
  const fetchUserAvatar = async (currentUser) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', currentUser.id)
        .single();

      if (profile?.avatar_url) {
        setAvatarUrl(profile.avatar_url);
      } else if (currentUser.user_metadata?.avatar_url) {
        setAvatarUrl(currentUser.user_metadata.avatar_url);
      }
    } catch (error) {
      console.error("Erro ao buscar avatar:", error);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const checkInitialSession = async () => {
      try {
        setLoading(true);
        // 1. O Ponto Chave: getSession() primeiro!
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        if (session?.user && isMounted) {
          setUser(session.user);
          await fetchUserAvatar(session.user);
        }
      } catch (error) {
        console.error('Erro na verificação inicial:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    checkInitialSession();

    // 2. O Radar do Google: Fica à escuta do evento pós-redirect!
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Evento de Autenticação:', event); // Ajuda a debugar
      
      if (isMounted) {
        if (session?.user) {
          // O Google terminou a viagem! Atualiza a interface IMEDIATAMENTE.
          setUser(session.user);
          await fetchUserAvatar(session.user);
          setLoading(false);
        } else {
          // Utilizador deslogado
          setUser(null);
          setAvatarUrl(null);
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const closeMenu = () => setShowDropdown(false);
    if (showDropdown) window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, [showDropdown]);

  const toggleDropdown = (e) => {
    e.stopPropagation();
    setShowDropdown(!showDropdown);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAvatarUrl(null);
    setShowDropdown(false);
    navigate('/');
  };

  return (
    <div className="home-container">
      <header className="main-header">
        <img 
          src="/assets/logo_service.png" 
          alt="ServiCE" 
          className="header-logo" 
          onClick={() => navigate('/')}
        />
        
        <form className="header-search m-0 border-0 bg-transparent" onSubmit={(e) => e.preventDefault()}>
          <div className="w-full max-w-3xl mx-auto my-8 px-4">
        <form 
        onSubmit={(e) => e.preventDefault()} 
        className="flex items-center w-full bg-white p-1.5 rounded-lg shadow-md border border-gray-200"
      >
      <Input 
        type="text" 
        placeholder="Estou procurando por..." 
        className="flex-1 border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-base md:text-lg px-4"
      />
    <Button 
      type="submit" 
      className="bg-[#10B981] hover:bg-[#059669] text-white px-6 h-12 rounded-md shrink-0 flex items-center gap-2"
    >
      <Search className="h-5 w-5" />
      <span className="hidden sm:inline">Buscar</span>
    </Button>
  </form>
</div>
        </form>

        <nav className="header-nav">
          {loading ? (
            /* Mostrar Spinner ou Vazio enquanto o radar trabalha */
            <div className="loader-placeholder">A carregar...</div>
          ) : user ? (
            <div className="user-menu">
              <Link to="/meus-anuncios" className="btn-my-ads">Meus Anúncios</Link>
              
              <div className="user-profile-icon" onClick={toggleDropdown} style={{ cursor: 'pointer', position: 'relative' }}>
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt="Perfil" 
                    style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #0A847C' }} 
                  />
                ) : (
                  <span style={{ fontSize: '24px' }}>👤</span>
                )}

                {showDropdown && (
                  <div className="dropdown-menu active" onClick={(e) => e.stopPropagation()}>
                    <div className="dropdown-header">
                      <span className="user-email-text">{user.email}</span>
                    </div>
                    <hr />
                    <Link to="/perfil" className="dropdown-item">Meu Perfil</Link>
                    <button onClick={handleLogout} className="dropdown-item logout-item">Sair</button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Link to="/login" className="btn-login-header">Entrar / Cadastrar</Link>
          )}
        </nav>
      </header>

      <main className="main-content">
        <section className="banner-slider">
          <div className="slide-content">
            <h2>Ofertas Especiais da Semana!</h2>
            <p>Contrate os melhores profissionais da sua região com segurança.</p>
          </div>
        </section>

        <section className="categories-row-section">
          <div className="categories-row">
            {["Manutenção", "Beleza e Estética", "Tecnologia", "Aulas Particulares", "Limpeza", "Automotivo", "Design", "Saúde", "Reformas", "Eventos"].map((cat) => (
              <div key={cat} className="category-pill">{cat}</div>
            ))}
          </div>
        </section>

        <section className="relevant-ads-section">
          <h2 className="section-title">Anúncios mais relevantes na sua região</h2>
          <div className="ads-row">
            {/* Cards Mockados para a UI */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="ad-card">
                <div className="ad-image-placeholder">📷</div>
                <div className="ad-info">
                  <h3>Serviço Exemplo {i}</h3>
                  <p className="ad-location">📍 Fortaleza, CE</p>
                  <span className="ad-price">R$ 150,00</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Home;