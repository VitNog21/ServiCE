import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MessageCircle, MapPin, ImageIcon, UserCircle } from 'lucide-react';
import { supabase } from '../supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import '../css/global.css';

const GEO_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 60000,
};

const Home = () => {
  const [user, setUser] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [listings, setListings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [hasUnread, setHasUnread] = useState(false); 
  const [locationSource, setLocationSource] = useState(null);
  const navigate = useNavigate();

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

  const getBrowserCoordinates = () => {
    if (!navigator.geolocation) {
      return Promise.reject(new Error('Geolocalização indisponível'));
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          };
          console.log('[geo] navegador ok', coords);
          resolve(coords);
        },
        reject,
        GEO_OPTIONS
      );
    });
  };

  const getIpCoordinates = async () => {
    const response = await fetch('https://ipapi.co/json/');

    if (!response.ok) {
      throw new Error('Falha ao obter localização por IP.');
    }

    const data = await response.json();
    const lat = Number(data.latitude);
    const lon = Number(data.longitude);

    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      throw new Error('Coordenadas por IP inválidas.');
    }

    console.log('[geo] ip ok', { lat, lon });
    return { lat, lon };
  };

  const getProfileCoordinates = async (currentUser) => {
    if (!currentUser?.id) {
      return null;
    }

    try {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('lat, lon')
        .eq('id', currentUser.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      const lat = Number(data?.lat);
      const lon = Number(data?.lon);

      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return null;
      }

      return { lat, lon };
    } catch (profileError) {
      console.warn('Erro ao obter coordenadas do perfil:', profileError);
      return null;
    }
  };

  const getUserCoordinates = async () => {
    setLocationSource(null);

    const profileCoords = await getProfileCoordinates(user);
    if (profileCoords) {
      setLocationSource('profile');
      return profileCoords;
    }

    try {
      const coords = await getBrowserCoordinates();
      setLocationSource('gps');
      return coords;
    } catch (browserError) {
      console.warn('Fallback para IP:', browserError);
      const ipCoords = await getIpCoordinates();
      setLocationSource('ip');
      return ipCoords;
    }
  };

  const formatDistance = (distanceMeters) => {
    const distance = Number(distanceMeters);

    if (Number.isNaN(distance)) {
      return 'Distância indisponível';
    }

    if (distance < 1000) {
      return `A ${Math.round(distance)}m de você`;
    }

    return `A ${(distance / 1000).toFixed(distance >= 10000 ? 0 : 1)}km de você`;
  };

  // 1. Inicialização e Autenticação
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

  // 2. Buscar Categorias
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('listings')
          .select('category:categories(id, name)', { count: 'exact' })
          .eq('status', 'active');

        if (error) throw error;

        const uniqueCategories = [];
        const categoryIds = new Set();

        if (data) {
          data.forEach((listing) => {
            if (listing.category && !categoryIds.has(listing.category.id)) {
              categoryIds.add(listing.category.id);
              uniqueCategories.push({
                id: listing.category.id,
                name: listing.category.name
              });
            }
          });
        }

        setCategories(uniqueCategories);
      } catch (error) {
        console.error('❌ Erro ao buscar categorias:', error);
      }
    };

    fetchCategories();
  }, []);

  // 3. Buscar Anúncios (Proximidade ou Fallback)
  useEffect(() => {
    if (authLoading) {
      return;
    }

    let isMounted = true;

    const fetchNearbyListings = async () => {
      try {
        setLoading(true);
        setError('');

        try {
          const { lat, lon } = await getUserCoordinates();
          
          const { data, error: rpcError } = await supabase.rpc('buscar_anuncios_por_proximidade', {
            lat,
            lon,
          });

          if (rpcError) throw rpcError;

          console.log('Primeiro anúncio da RPC:', Array.isArray(data) ? data[0] : data);

          if (isMounted) {
            setListings(Array.isArray(data) ? data : []);
          }
          return;
        } catch (geoError) {
          console.warn('⚠️ RPC de proximidade falhou:', geoError.message);
        }

        const { data: fallbackData, error: fallbackError } = await supabase
          .from('listings')
          .select(`
            id,
            title,
            description,
            price,
            image_urls,
            category:categories(id, name),
            address_text,
            created_at
          `)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(50);

        if (fallbackError) throw fallbackError;

        if (isMounted) {
          setListings(Array.isArray(fallbackData) ? fallbackData : []);
        }
      } catch (fetchError) {
        console.error('❌ Erro ao carregar anúncios:', fetchError);
        if (isMounted) {
          setError(fetchError.message || 'Não foi possível carregar os anúncios.');
          setListings([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchNearbyListings();

    return () => {
      isMounted = false;
    };
  }, [authLoading, user]);

  // 4. Fechar Menu ao Clicar Fora
  useEffect(() => {
    const closeMenu = () => setShowDropdown(false);
    if (showDropdown) {
      window.addEventListener('click', closeMenu);
    }
    return () => window.removeEventListener('click', closeMenu);
  }, [showDropdown]);

  // 5. Verificar Mensagens Não Lidas com SUPABASE REALTIME
  useEffect(() => {
    if (!user) {
      setHasUnread(false);
      return;
    }

    const checkUnreadMessages = async () => {
      try {
        // Busca APENAS mensagens enviadas PARA VOCÊ que estão marcadas como NÃO LIDAS
        const { count, error } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', user.id)
          .eq('is_read', false);

        if (error) throw error;
        setHasUnread(count > 0);
      } catch (err) {
        console.error('Erro ao verificar mensagens:', err);
      }
    };

    // Executa a primeira checagem ao carregar a página
    checkUnreadMessages();

    // Fica escutando novas mensagens em segundo plano na Home!
    const channel = supabase
      .channel('home-unread-alerts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` },
        () => {
          setHasUnread(true); // Acende a bolinha instantaneamente ao receber
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` },
        () => {
          // Re-checa se todas foram lidas
          checkUnreadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

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

  const filteredListings = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return listings;
    }

    return listings.filter((listing) => {
      const title = (listing.titulo || listing.title || '').toLowerCase();
      return title.includes(query);
    });
  }, [listings, searchTerm]);

  const normalizedSearchTerm = searchTerm.trim();

  return (
    <div className="home-container relative min-h-screen">
      <header className="main-header">
        <img
          src="/assets/logo_service.png"
          alt="ServiCE"
          className="header-logo"
          onClick={() => navigate('/')}
          style={{ cursor: 'pointer' }}
        />

        <form className="header-search m-0 border-0 bg-transparent" onSubmit={(e) => e.preventDefault()}>
          <div className="header-search-box">
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Estou procurando por..."
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
                      {user.user_metadata?.role === 'admin' && (
                        <span className="bg-amber-100 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded mt-1 inline-block uppercase">Admin</span>
                      )}
                    </div>
                    <hr />
                    <Link to="/perfil" className="dropdown-item">Meu Perfil</Link>
                    <Link to="/meus-pedidos" className="dropdown-item">Minhas Compras</Link>
                    <Link to="/meus-anuncios" className="dropdown-item">Meus Anúncios (Vendas)</Link>
                    
                    {user.user_metadata?.role === 'admin' && (
                      <Link to="/admin" className="dropdown-item font-bold text-amber-600">Dashboard Admin</Link>
                    )}
                    
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
        {!normalizedSearchTerm && (
          <>
        <section className="banner-slider">
          <div className="slide-content">
            <h2>Ofertas Especiais da Semana!</h2>
            <p>Contrate os melhores profissionais mais próximos de você com segurança.</p>
          </div>
        </section>

        <section className="categories-row-section">
          <div className="categories-row">
            {categories.length > 0 ? (
              categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => navigate(`/categoria/${cat.id}`)}
                  className="category-pill"
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {cat.name}
                </button>
              ))
            ) : (
              <div style={{ color: '#94a3b8', fontSize: '14px' }}>Nenhuma categoria disponível</div>
            )}
          </div>
        </section>
          </>
        )}

        <section className="relevant-ads-section">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="section-title">
                {normalizedSearchTerm ? `Busca por "${normalizedSearchTerm}"` : 'Anúncios mais relevantes na sua região'}
              </h2>
              {!normalizedSearchTerm && (
                <p className="mt-1 text-sm text-slate-500">
                  Baseado na sua localização atual e ordenado pela proximidade.
                </p>
              )}
            </div>

            {normalizedSearchTerm ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {filteredListings.length} resultado{filteredListings.length === 1 ? '' : 's'}
              </span>
            ) : null}
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {error}
            </div>
          )}

          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((skeleton) => (
                <div key={skeleton} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="h-52 animate-pulse bg-slate-200" />
                  <div className="space-y-3 p-4">
                    <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200" />
                    <div className="h-5 w-24 animate-pulse rounded bg-slate-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-slate-500">
              Nenhum anúncio disponível para sua região no momento.
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredListings.map((listing) => {
                const imageUrl = Array.isArray(listing.image_urls) && listing.image_urls.length > 0
                  ? listing.image_urls[0]
                  : listing.imagem_url || null;
                const title = listing.titulo || listing.title || 'Anúncio sem título';
                const priceValue = listing.preco ?? listing.price ?? 0;
                const distanceMeters = listing.distancia_metros ?? listing.distance_meters;
                const categoryName = listing.category?.name || listing.category_name || listing.categoria_nome || 'Serviço';
                const distanceLabel = formatDistance(distanceMeters);

                return (
                  <Link
                    to={`/detalhes/${listing.id}`}
                    key={listing.id}
                    className="ad-card"
                  >
                    <div className="ad-image-placeholder">
                      {/* Badge Inteligente */}
                      <div className="ad-badge">
                        {categoryName}
                      </div>

                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={title}
                          loading="lazy"
                        />
                      ) : (
                        <div className="text-slate-300">
                          <ImageIcon size={42} strokeWidth={1.6} />
                        </div>
                      )}
                    </div>

                    <div className="ad-info">
                      <h3>{title}</h3>
                      
                      <div className="ad-location">
                        <MapPin size={14} strokeWidth={2} />
                        <span className="truncate">{distanceLabel}</span>
                        {locationSource === 'ip' && (
                          <span className="location-source-pill">
                            distância aproximada por IP
                          </span>
                        )}
                      </div>

                      <div className="ad-price-row">
                        <span className="ad-price-currency">R$</span>
                        <span className="ad-price">{Number(priceValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* =========================================
          BOTÃO FLUTUANTE DO CHAT (POP-UP)
          ========================================= */}
      {user && (
        <button
          onClick={() => navigate('/chat')}
          className="fixed bottom-8 right-8 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--green-700)] text-white shadow-xl transition-all duration-300 hover:scale-110 hover:bg-[var(--green-800)] hover:shadow-2xl focus:outline-none"
          title="Abrir Chat"
        >
          <MessageCircle size={32} />
          
          {/* Indicador de Mensagem Não Lida (Bolinha Vermelha animada) */}
          {hasUnread && (
            <>
              <span className="absolute top-0 right-0 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 ring-2 ring-white" />
              <span className="absolute top-0 right-0 h-4 w-4 animate-ping rounded-full bg-red-400 opacity-75" />
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default Home;
