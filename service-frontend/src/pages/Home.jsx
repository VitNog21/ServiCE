import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
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
          resolve({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
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

    return { lat, lon };
  };

  const getUserCoordinates = async () => {
    try {
      return await getBrowserCoordinates();
    } catch (browserError) {
      console.warn('Fallback para IP:', browserError);
      return getIpCoordinates();
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
    let isMounted = true;

    const fetchNearbyListings = async () => {
      try {
        setLoading(true);
        setError('');

        const { lat, lon } = await getUserCoordinates();

        const { data, error: rpcError } = await supabase.rpc('buscar_anuncios_por_proximidade', {
          lat,
          lon,
        });

        if (rpcError) {
          throw rpcError;
        }

        if (isMounted) {
          setListings(Array.isArray(data) ? data : []);
        }
      } catch (fetchError) {
        console.error('Erro ao carregar anúncios por proximidade:', fetchError);
        if (isMounted) {
          setError(fetchError.message || 'Não foi possível carregar os anúncios próximos.');
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
  }, []);

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
          <div className="mx-auto flex w-full max-w-3xl items-center rounded-xl border border-[#0A847C]/25 bg-white p-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Estou procurando por..."
              className="h-12 border-0 px-4 text-base shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Button
              type="submit"
              className="h-12 shrink-0 gap-2 rounded-lg bg-[#10B981] px-6 text-white hover:bg-[#059669]"
            >
              <Search className="h-5 w-5" />
              <span className="hidden sm:inline">Buscar</span>
            </Button>
          </div>
        </form>

        <nav className="header-nav">
          {authLoading ? (
            <div className="loader-placeholder">A carregar...</div>
          ) : user ? (
            <div className="user-menu">
              <Link
                to="/meus-pedidos"
                className="btn-my-orders"
                style={{ marginRight: '15px', color: '#0A847C', fontWeight: '600', textDecoration: 'none' }}
              >
                Meus Pedidos
              </Link>
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
            <p>Contrate os melhores profissionais mais próximos de você com segurança.</p>
          </div>
        </section>

        <section className="categories-row-section">
          <div className="categories-row">
            {['Manutenção', 'Beleza e Estética', 'Tecnologia', 'Aulas Particulares', 'Limpeza', 'Automotivo', 'Design', 'Saúde', 'Reformas', 'Eventos'].map((cat) => (
              <div key={cat} className="category-pill">{cat}</div>
            ))}
          </div>
        </section>

        <section className="relevant-ads-section">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="section-title">Anúncios mais relevantes na sua região</h2>
              <p className="mt-1 text-sm text-slate-500">
                Baseado na sua localização atual e ordenado pela proximidade.
              </p>
            </div>

            {searchTerm.trim() ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                Filtrando por: {searchTerm.trim()}
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

                const distanceLabel = Number.isFinite(Number(distanceMeters))
                  ? Number(distanceMeters) < 1000
                    ? `A ${Math.round(Number(distanceMeters))}m de você`
                    : `A ${(Number(distanceMeters) / 1000).toFixed(Number(distanceMeters) >= 10000 ? 0 : 1)}km de você`
                  : 'Distância indisponível';

                return (
                  <Link
                    to={`/detalhes/${listing.id}`}
                    key={listing.id}
                    className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg"
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <div className="aspect-[4/3] bg-slate-100">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-5xl text-slate-300">
                          📷
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 p-4">
                      <div>
                        <h3 className="line-clamp-2 text-lg font-semibold text-slate-900 transition-colors group-hover:text-[#0A847C]">
                          {title}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">{distanceLabel}</p>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xl font-bold text-[#0A847C]">
                          R$ {Number(priceValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                          Ver detalhes
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

export default Home;