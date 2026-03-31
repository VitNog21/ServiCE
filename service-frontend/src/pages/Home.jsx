import { Link, useNavigate } from 'react-router-dom';
import '../css/global.css';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      {/* HEADER FINO E ESTRATÉGICO */}
      <header className="main-header">
        <img 
          src="/assets/logo_service.png" 
          alt="ServiCE" 
          className="header-logo" 
          onClick={() => navigate('/')}
        />
        
        <div className="header-search">
          <input type="text" placeholder="Buscar serviços, encanador, eletricista..." />
          <button>🔍</button>
        </div>

        <nav>
          <Link to="/login" className="btn-login-header">Entrar / Cadastrar</Link>
        </nav>
      </header>

      <main className="main-content">
        {/* ESPAÇO DO SLIDER / BANNER DE CAMPANHAS */}
        <section className="banner-slider">
          <div className="slide-content">
            <h2>Ofertas Especiais da Semana!</h2>
            <p>Contrate os melhores profissionais da sua região com segurança.</p>
          </div>
        </section>

        {/* CATEGORIAS EM TELA CHEIA (Sem título, sem emojis, com quebra automática) */}
        <section className="categories-row-section">
          <div className="categories-row">
            <div className="category-pill">Manutenção</div>
            <div className="category-pill">Beleza e Estética</div>
            <div className="category-pill">Tecnologia</div>
            <div className="category-pill">Aulas Particulares</div>
            <div className="category-pill">Limpeza</div>
            <div className="category-pill">Automotivo</div>
            <div className="category-pill">Design</div>
            <div className="category-pill">Saúde e Bem-estar</div>
            <div className="category-pill">Reformas</div>
            <div className="category-pill">Eventos</div>
          </div>
        </section>

        {/* ANÚNCIOS RELEVANTES (LADO A LADO) */}
        <section className="relevant-ads-section">
          <h2 className="section-title">Anúncios mais relevantes na sua região</h2>
          <div className="ads-row">
            {/* Card 1 */}
            <div className="ad-card">
              <div className="ad-image-placeholder">📷</div>
              <div className="ad-info">
                <h3>Instalação de Ar Condicionado</h3>
                <p className="ad-location">📍 Fortaleza, CE</p>
                <span className="ad-price">R$ 200,00</span>
              </div>
            </div>
            {/* Card 2 */}
            <div className="ad-card">
              <div className="ad-image-placeholder">📷</div>
              <div className="ad-info">
                <h3>Manicure e Pedicure a Domicílio</h3>
                <p className="ad-location">📍 Fortaleza, CE</p>
                <span className="ad-price">R$ 60,00</span>
              </div>
            </div>
            {/* Card 3 */}
            <div className="ad-card">
              <div className="ad-image-placeholder">📷</div>
              <div className="ad-info">
                <h3>Formatação de Computadores</h3>
                <p className="ad-location">📍 Fortaleza, CE</p>
                <span className="ad-price">R$ 100,00</span>
              </div>
            </div>
            {/* Card 4 */}
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