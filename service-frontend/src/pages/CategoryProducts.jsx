import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Search, MapPin, ImageIcon, UserCircle } from 'lucide-react';
import { supabase } from '../supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import '../css/global.css';

const CategoryProducts = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [listings, setListings] = useState([]);
  const [categoryName, setCategoryName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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
    } catch (fetchError) {
      console.error('Erro ao buscar avatar:', fetchError);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user && isMounted) {
          setUser(session.user);
          fetchUserAvatar(session.user);
        }
      } catch (sessionError) {
        console.error('Erro ao inicializar sessão:', sessionError);
      } finally {
        if (isMounted) setAuthLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;

      if (session?.user) {
        setUser(session.user);
        fetchUserAvatar(session.user);
      } else {
        setUser(null);
        setAvatarUrl(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const fetchCategoryProducts = async () => {
      try {
        setLoading(true);
        setError('');

        // Buscar a categoria
        const { data: categoryData, error: categoryError } = await supabase
          .from('categories')
          .select('name')
          .eq('id', categoryId)
          .single();

        if (categoryError) throw categoryError;
        setCategoryName(categoryData?.name || 'Categoria');

        // Buscar anúncios dessa categoria
        const { data, error: listingsError } = await supabase
          .from('listings')
          .select(`
            id,
            title,
            description,
            price,
            image_urls,
            category:categories(name),
            address_text,
            created_at
          `)
          .eq('category_id', categoryId)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (listingsError) throw listingsError;
        
        console.log('✅ Anúncios da categoria carregados:', data?.length || 0);
        setListings(data || []);
      } catch (fetchError) {
        console.error('❌ Erro ao carregar anúncios:', fetchError);
        setError(fetchError.message || 'Não foi possível carregar os anúncios.');
        setListings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryProducts();
  }, [categoryId]);

  useEffect(() => {
    const closeMenu = () => setShowDropdown(false);

    if (showDropdown) {
      window.addEventListener('click', closeMenu);
    }

    return () => window.removeEventListener('click', closeMenu);
  }, [showDropdown]);

  const toggleDropdown = (e) => {
    e.stopPropagation();
    setShowDropdown((current) => !current);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAvatarUrl(null);
    setShowDropdown(false);
    navigate('/');
  };

  // Função para formatar moeda
  // Filtrar anúncios por busca
  const filteredListings = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return listings;
    }

    return listings.filter((listing) => {
      const title = (listing.title || '').toLowerCase();
      return title.includes(query);
    });
  }, [listings, searchTerm]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--gray-50)]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--green-700)]"></div>
          <p className="mt-4 text-[var(--gray-600)]">Carregando anúncios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-page">
      {/* Header */}
      <header className="app-page-header">
        <div className="app-page-header-inner">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="app-back-button">
              <ArrowLeft className="h-5 w-5" />
              <span className="hidden sm:inline">Voltar</span>
            </button>
            <img
              src="/assets/logo_service.png"
              alt="ServiCE"
              className="h-9 cursor-pointer"
              onClick={() => navigate('/')}
            />
          </div>

        <form className="m-0 max-w-xl flex-1 border-0 bg-transparent" onSubmit={(e) => e.preventDefault()}>
          <div className="search-toolbar !p-1.5">
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Buscar em ${categoryName}...`}
              className="h-12 border-0 px-5 text-[15px] shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Button
              type="submit"
              className="flex h-12 min-w-[118px] shrink-0 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--green-700)] px-6 text-[15px] font-semibold text-white hover:bg-[var(--green-800)]"
            >
              <Search className="h-5 w-5 shrink-0" strokeWidth={2.4} />
              <span className="hidden sm:inline">Buscar</span>
            </Button>
          </div>
        </form>

        <nav className="header-nav">
          {authLoading ? (
            <div className="loader-placeholder">A carregar...</div>
          ) : user ? (
            <div className="user-menu">
              <Link to="/meus-anuncios" className="btn-my-ads">Meus Anúncios</Link>

              <div className="user-profile-icon" onClick={toggleDropdown} style={{ cursor: 'pointer', position: 'relative' }}>
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Perfil"
                    style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--green-700)' }}
                  />
                ) : (
                  <UserCircle size={30} strokeWidth={1.8} />
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
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="page-shell">
        <section className="relevant-ads-section">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="section-title">{categoryName}</h2>
              <p className="mt-1 text-sm text-[var(--gray-600)]">
                {filteredListings.length} anúncio{filteredListings.length !== 1 ? 's' : ''} disponível{filteredListings.length !== 1 ? 's' : ''}
              </p>
            </div>

            {searchTerm.trim() ? (
              <span className="rounded-full bg-[var(--gray-100)] px-3 py-1 text-xs font-medium text-[var(--gray-600)]">
                Filtrando por: {searchTerm.trim()}
              </span>
            ) : null}
          </div>

          {error && (
            <div className="mb-5 rounded-[var(--radius-md)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {error}
            </div>
          )}

          {filteredListings.length === 0 ? (
            <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--gray-200)] bg-white px-6 py-14 text-center text-[var(--gray-400)]">
              {searchTerm.trim() 
                ? `Nenhum resultado para "${searchTerm.trim()}"` 
                : 'Nenhum anúncio disponível nesta categoria.'}
            </div>
          ) : (
            <div className="internal-results-grid">
              {filteredListings.map((listing) => {
                const imageUrl = Array.isArray(listing.image_urls) && listing.image_urls.length > 0
                  ? listing.image_urls[0]
                  : null;
                const title = listing.title || 'Anúncio sem título';
                const priceValue = listing.price ?? 0;

                return (
                  <Link
                    to={`/detalhes/${listing.id}`}
                    key={listing.id}
                    className="listing-result-card"
                  >
                    {/* Container de imagem */}
                    <div className="listing-result-image">
                      <div className="listing-result-badge">{categoryName}</div>
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={title}
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[var(--gray-400)]">
                          <ImageIcon size={42} strokeWidth={1.6} />
                        </div>
                      )}
                    </div>

                    {/* Conteúdo */}
                    <div className="flex flex-col flex-grow space-y-3 p-5">
                      <div className="space-y-2 flex-grow">
                        <h3 className="line-clamp-2 text-base font-semibold text-[var(--gray-900)] transition-colors duration-200 group-hover:text-[var(--green-700)] min-h-[2.5rem]">
                          {title}
                        </h3>
                        <div className="flex items-center gap-1 text-xs text-[var(--gray-600)]">
                          <MapPin size={14} strokeWidth={2} />
                          <p className="truncate">{listing.address_text || 'Localização não disponível'}</p>
                        </div>
                      </div>

                      {/* Preço e CTA */}
                      <div className="mt-auto flex items-end justify-between gap-3 pt-4 border-t border-[var(--gray-100)]">
                        <div className="flex-1">
                          <p className="text-xs text-[var(--gray-400)] uppercase tracking-wide font-medium mb-1.5">Preço</p>
                          <span className="text-lg font-bold text-[var(--green-700)] block">
                            R$ {Number(priceValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <span className="inline-flex items-center justify-center rounded-[var(--radius-sm)] bg-[var(--green-600)]/10 w-10 h-10 text-lg font-semibold text-[var(--green-600)] transition-all duration-200 group-hover:bg-[var(--green-600)] group-hover:text-white flex-shrink-0">
                          →
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default CategoryProducts;
