import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { supabase } from '../supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import '../css/global.css';

const Home = () => {
  const [user, setUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  // 1. Monitoramento de Sessão (Híbrido: Google + LocalStorage)
  useEffect(() => {
    const checkUser = async () => {
      // Tenta buscar sessão do Google (Supabase)
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUser(session.user);
      } else {
        // Se não tem Google, tenta buscar o login normal (LocalStorage)
        const savedUser = localStorage.getItem('service_user');
        if (savedUser) {
          try {
            setUser(JSON.parse(savedUser));
          } catch (e) {
            console.error("Erro ao ler usuário do localStorage", e);
          }
        }
      }
    };

    checkUser();

    // Ouvinte para mudanças em tempo real no Supabase (Google Login)
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else if (!localStorage.getItem('service_user')) {
        setUser(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // 2. Lógica para fechar o dropdown ao clicar em qualquer lugar da tela
  useEffect(() => {
    const closeMenu = () => setShowDropdown(false);
    
    if (showDropdown) {
      window.addEventListener('click', closeMenu);
    }
    
    return () => window.removeEventListener('click', closeMenu);
  }, [showDropdown]);

  // Alterna a visibilidade do menu (impede que o clique feche o menu na mesma hora)
  const toggleDropdown = (e) => {
    e.stopPropagation();
    setShowDropdown(!showDropdown);
  };

  const handleLogout = async () => {
    // Limpa todas as frentes de login
    await supabase.auth.signOut();
    localStorage.removeItem('service_user');
    localStorage.removeItem('service_token');
    setUser(null);
    setShowDropdown(false);
    navigate('/');
  };

  return (
    <div className="home-container">
      {/* HEADER DINÂMICO E ESTRATÉGICO */}
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
          {user ? (
            /* VISUAL QUANDO LOGADO */
            <div className="user-menu">
              <Link to="/meus-anuncios" className="btn-my-ads">Meus Anúncios</Link>
              
              <div className="user-profile-icon" onClick={toggleDropdown}>
                👤
                {/* O menu recebe a classe 'active' baseada no estado showDropdown */}
                <div 
                  className={`dropdown-menu ${showDropdown ? 'active' : ''}`} 
                  onClick={(e) => e.stopPropagation()} // Impede que cliques dentro do menu o fechem
                >
                  <div className="dropdown-header">
                    <span className="user-email-text">{user.email}</span>
                  </div>
                  <hr />
                  <Link to="/perfil" className="dropdown-item">Meu Perfil</Link>
                  <button onClick={handleLogout} className="dropdown-item logout-item">
                    Sair
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* VISUAL QUANDO DESLOGADO */
            <Link to="/login" className="btn-login-header">Entrar / Cadastrar</Link>
          )}
        </nav>
      </header>

      <main className="main-content">
        {/* BANNER DE CAMPANHAS */}
        <section className="banner-slider">
          <div className="slide-content">
            <h2>Ofertas Especiais da Semana!</h2>
            <p>Contrate os melhores profissionais da sua região com segurança.</p>
          </div>
        </section>

        {/* CATEGORIAS EM TELA CHEIA (Sem scroll, com quebra automática) */}
        <section className="categories-row-section">
          <div className="categories-row">
            {["Manutenção", "Beleza e Estética", "Tecnologia", "Aulas Particulares", "Limpeza", "Automotivo", "Design", "Saúde", "Reformas", "Eventos"].map((cat) => (
              <div key={cat} className="category-pill">{cat}</div>
            ))}
          </div>
        </section>

        {/* ANÚNCIOS RELEVANTES (LADO A LADO) */}
        <section className="relevant-ads-section">
          <h2 className="section-title">Anúncios mais relevantes na sua região</h2>
          <div className="ads-row">
            <div className="ad-card">
              <div className="ad-image-placeholder">📷</div>
              <div className="ad-info">
                <h3>Instalação de Ar Condicionado</h3>
                <p className="ad-location">📍 Fortaleza, CE</p>
                <span className="ad-price">R$ 200,00</span>
              </div>
            </div>
            <div className="ad-card">
              <div className="ad-image-placeholder">📷</div>
              <div className="ad-info">
                <h3>Manicure a Domicílio</h3>
                <p className="ad-location">📍 Fortaleza, CE</p>
                <span className="ad-price">R$ 60,00</span>
              </div>
            </div>
            <div className="ad-card">
              <div className="ad-image-placeholder">📷</div>
              <div className="ad-info">
                <h3>Eletricista Residencial 24h</h3>
                <p className="ad-location">📍 Fortaleza, CE</p>
                <span className="ad-price">A combinar</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Home;