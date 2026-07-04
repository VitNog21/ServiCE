import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MessageCircle, Shield, SlidersHorizontal, ChevronDown, X, MapPin, ChevronRight, ChevronLeft, UserCircle } from 'lucide-react';
import { supabase } from '../supabase';
import { Button } from '@/components/ui/button';
import '../css/global.css';

const GEO_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 60000,
};

const DISTANCE_OPTIONS = [
  { label: 'Qualquer proximidade', value: '' },
  { label: 'Até 1 km', value: '1000' },
  { label: 'Até 3 km', value: '3000' },
  { label: 'Até 5 km', value: '5000' },
  { label: 'Até 10 km', value: '10000' },
];

const SORT_OPTIONS = [
  { label: 'Relevância', value: 'relevance' },
  { label: 'Mais próximos', value: 'distance' },
  { label: 'Menor preço', value: 'price-asc' },
  { label: 'Maior preço', value: 'price-desc' },
  { label: 'Mais recentes', value: 'newest' },
];

const normalizeText = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

// Array com os banners
const BANNERS = [
  '/assets/banner.1.png',
  '/assets/banner.2.png'
];

const Home = () => {
  const [user, setUser] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Estado para controlar o banner atual
  const [currentBanner, setCurrentBanner] = useState(0);

  // Estados dos inputs (Enquanto o usuário digita/escolhe)
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    categoryId: '', minPrice: '', maxPrice: '', maxDistanceMeters: '', sortBy: 'relevance',
  });

  const [nearbyListings, setNearbyListings] = useState([]);
  const [maisVisitados, setMaisVisitados] = useState([]);
  const [maisBuscados, setMaisBuscados] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [hasUnread, setHasUnread] = useState(false); 
  const [locationSource, setLocationSource] = useState(null);
  
  // Refs para as rolagens
  const advancedFiltersRef = useRef(null);
  const regionScrollRef = useRef(null);
  const visitedScrollRef = useRef(null);
  const searchedScrollRef = useRef(null);
  
  const navigate = useNavigate();

  // Função para rolar os carrosséis
  const scrollContainer = (ref, direction) => {
    if (ref.current) {
      const scrollAmount = ref.current.clientWidth * 0.75;
      ref.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  // Dispara a busca oficial e redireciona para página de resultados
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    
    // Constrói os query parameters
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.append('q', searchTerm.trim());
    if (filters.categoryId) params.append('category', filters.categoryId);
    if (filters.minPrice) params.append('minPrice', filters.minPrice);
    if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
    if (filters.maxDistanceMeters) params.append('maxDistance', filters.maxDistanceMeters);
    if (filters.sortBy !== 'relevance') params.append('sort', filters.sortBy);
    
    // Redireciona para página de busca
    navigate(`/busca?${params.toString()}`);
    setShowAdvancedFilters(false);
  };

  const resetAdvancedFilters = () => {
    const emptyFilters = { categoryId: '', minPrice: '', maxPrice: '', maxDistanceMeters: '', sortBy: 'relevance' };
    setFilters(emptyFilters);
    setSearchTerm('');
  };

  const fetchUserAvatar = async (currentUser) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url, role')
        .eq('id', currentUser.id)
        .single();

      if (profile?.avatar_url) {
        setAvatarUrl(profile.avatar_url);
      } else if (currentUser.user_metadata?.avatar_url) {
        setAvatarUrl(currentUser.user_metadata.avatar_url);
      }
      
      if (profile?.role) {
        setUserRole(profile.role);
      } else if (currentUser.user_metadata?.role) {
        setUserRole(currentUser.user_metadata.role);
      }
    } catch (fetchError) {
      console.error('Erro ao buscar perfil:', fetchError);
    }
  };

  const getBrowserCoordinates = () => {
    if (!navigator.geolocation) return Promise.reject(new Error('Geolocalização indisponível'));
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ lat: position.coords.latitude, lon: position.coords.longitude }),
        reject, GEO_OPTIONS
      );
    });
  };

  const getIpCoordinates = async () => {
    const response = await fetch('https://ipapi.co/json/');
    if (!response.ok) throw new Error('Falha ao obter localização por IP.');
    const data = await response.json();
    const lat = Number(data.latitude);
    const lon = Number(data.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lon)) throw new Error('Coordenadas inválidas.');
    return { lat, lon };
  };

  const getProfileCoordinates = async (currentUser) => {
    if (!currentUser?.id) return null;
    try {
      const { data, error } = await supabase.from('profiles').select('lat, lon').eq('id', currentUser.id).single();
      if (error && error.code !== 'PGRST116') throw error;
      const lat = Number(data?.lat);
      const lon = Number(data?.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      return { lat, lon };
    } catch (err) { return null; }
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
    } catch (err) {
      const ipCoords = await getIpCoordinates();
      setLocationSource('ip');
      return ipCoords;
    }
  };

  const formatDistance = (distanceMeters) => {
    const distance = Number(distanceMeters);
    if (Number.isNaN(distance) || distanceMeters === null) return '';
    if (distance < 1000) return `${Math.round(distance)}m`;
    return `${(distance / 1000).toFixed(1)}km`;
  };

  const getListingCategoryId = (listing) => listing.category?.id || listing.category_id || listing.categoria_id || listing.categoryId || '';
  const getListingCategoryName = (listing) => listing.category?.name || listing.category_name || listing.categoria_nome || listing.categoryName || 'Serviço';
  const getListingPrice = (listing) => Number(listing.preco ?? listing.price ?? 0);
  const getListingDistanceMeters = (listing) => {
    const distance = Number(listing.distancia_metros ?? listing.distance_meters ?? listing.distance);
    return Number.isFinite(distance) ? distance : null;
  };

  const activeFiltersCount = [
    filters.categoryId, filters.minPrice, filters.maxPrice, filters.maxDistanceMeters, filters.sortBy !== 'relevance'
  ].filter(Boolean).length;

  // Efeito para trocar o banner a cada 7 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % BANNERS.length);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && isMounted) {
          setUser(session.user);
          fetchUserAvatar(session.user);
        }
      } catch (err) {} finally { if (isMounted) setAuthLoading(false); }
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
        setUserRole(null);
      }
    });
    return () => { isMounted = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase.from('listings').select('category:categories(id, name)', { count: 'exact' }).eq('status', 'active');
        if (error) throw error;
        const uniqueCategories = [];
        const categoryIds = new Set();
        if (data) {
          data.forEach((listing) => {
            if (listing.category && !categoryIds.has(listing.category.id)) {
              categoryIds.add(listing.category.id);
              uniqueCategories.push({ id: listing.category.id, name: listing.category.name });
            }
          });
        }
        setCategories(uniqueCategories);
      } catch (err) {}
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (authLoading) return;
    let isMounted = true;
    const fetchHomeSections = async () => {
      try {
        setLoading(true);
        setError('');

        const listingsSelect = 'id, title, description, price, image_urls, category_id, view_count, search_count, category:categories(id, name), address_text, created_at';

        const [nearbyResult, visitedResult, searchedResult] = await Promise.allSettled([
          (async () => {
            try {
              const { lat, lon } = await getUserCoordinates();
              const { data, error } = await supabase.rpc('buscar_anuncios_por_proximidade', { lat, lon });
              if (error) throw error;
              return Array.isArray(data) ? data.slice(0, 5) : [];
            } catch (err) {
              const { data, error } = await supabase.from('listings').select(listingsSelect).eq('status', 'active').order('created_at', { ascending: false }).limit(50);
              if (error) throw error;
              return Array.isArray(data)
                ? data.filter((listing) => {
                  const dist = getListingDistanceMeters(listing);
                  return dist !== null && dist <= 5000;
                }).slice(0, 5)
                : [];
            }
          })(),
          supabase.from('listings').select(listingsSelect).eq('status', 'active').order('view_count', { ascending: false }).order('created_at', { ascending: false }).limit(5),
          supabase.from('listings').select(listingsSelect).eq('status', 'active').order('search_count', { ascending: false }).order('created_at', { ascending: false }).limit(5),
        ]);

        if (!isMounted) return;

        setNearbyListings(nearbyResult.status === 'fulfilled' ? (Array.isArray(nearbyResult.value) ? nearbyResult.value : []) : []);
        setMaisVisitados(visitedResult.status === 'fulfilled' && Array.isArray(visitedResult.value.data) ? visitedResult.value.data : []);
        setMaisBuscados(searchedResult.status === 'fulfilled' && Array.isArray(searchedResult.value.data) ? searchedResult.value.data : []);

        if (nearbyResult.status === 'rejected' || visitedResult.status === 'rejected' || searchedResult.status === 'rejected') {
          setError('Não foi possível carregar todas as vitrines.');
        }
      } catch (err) {
        if (isMounted) {
          setError('Não foi possível carregar os anúncios.');
          setNearbyListings([]);
          setMaisVisitados([]);
          setMaisBuscados([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchHomeSections();
    return () => { isMounted = false; };
  }, [authLoading, user]);

  useEffect(() => {
    const closeMenu = () => setShowDropdown(false);
    if (showDropdown) window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, [showDropdown]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!showAdvancedFilters) return;
      if (advancedFiltersRef.current && !advancedFiltersRef.current.contains(event.target)) setShowAdvancedFilters(false);
    };
    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [showAdvancedFilters]);

  useEffect(() => {
    if (!user) { setHasUnread(false); return; }
    const checkUnreadMessages = async () => {
      try {
        const { count, error } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('receiver_id', user.id).eq('is_read', false);
        if (error) throw error;
        setHasUnread(count > 0);
      } catch (err) {}
    };
    checkUnreadMessages();
    const channel = supabase.channel('home-unread-alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, () => setHasUnread(true))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, () => checkUnreadMessages())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user]);

  const toggleDropdown = (e) => { e.stopPropagation(); setShowDropdown((current) => !current); };
  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null); setAvatarUrl(null); setUserRole(null); setShowDropdown(false); navigate('/'); };

  // ==========================================
  // COMPONENTE DO CARD DE ANÚNCIO
  // ==========================================
  const renderListingCard = (listing) => {
    const imageUrl = Array.isArray(listing.image_urls) && listing.image_urls.length > 0 ? listing.image_urls[0] : listing.imagem_url || null;
    const title = listing.titulo || listing.title || 'Anúncio sem título';
    const priceValue = getListingPrice(listing);
    const distanceMeters = getListingDistanceMeters(listing);
    const categoryName = getListingCategoryName(listing);
    const distanceLabel = formatDistance(distanceMeters);

    return (
      <Link to={`/detalhes/${listing.id}`} key={listing.id} className="listing-card-width group relative flex flex-col snap-start overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-xl hover:border-[#0A847C]/40 hover:-translate-y-1" style={{ textDecoration: 'none', color: 'inherit' }}>
        <div className="absolute top-3 left-3 z-10 inline-flex items-center rounded-md bg-white/95 px-3 py-1 backdrop-blur-sm shadow-sm">
          <span className="text-[11px] font-bold text-[#0A847C] uppercase tracking-wider">{categoryName.slice(0, 15)}</span>
        </div>

        <div className="aspect-square w-full bg-slate-100 relative overflow-hidden">
          {imageUrl ? (
            <img src={imageUrl} alt={title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
          ) : (
            <div className="flex h-full items-center justify-center text-4xl text-slate-300">📷</div>
          )}
        </div>

        <div className="flex flex-col flex-grow p-5">
          <h3 className="line-clamp-2 text-sm font-semibold text-slate-800 min-h-[2.5rem] leading-snug group-hover:text-[#0A847C] transition-colors">
            {title}
          </h3>
          <div className="mt-3 text-xl font-bold text-[#0A847C]">
            R$ {Number(priceValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          {distanceLabel && (
            <div className="mt-auto pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-500 mt-3">
              <MapPin className="h-3.5 w-3.5 text-[#0A847C] flex-shrink-0" />
              <span className="truncate">{distanceLabel}</span>
            </div>
          )}
        </div>
      </Link>
    );
  };

  return (
    <div className="home-container relative min-h-screen bg-[#F5F7F9]">
      
      {/* HEADER INTEGRADO AO GLOBAL.CSS */}
      <header className="main-header">
        <img src="/assets/logo_service.png" alt="ServiCE" className="header-logo" onClick={() => navigate('/')} />

        <form className="header-search" onSubmit={handleSearchSubmit}>
          <div className="relative flex w-full gap-2 items-center">
            
            <div className="flex flex-1 items-center bg-slate-50 border border-slate-200 rounded-xl px-4 h-11 focus-within:border-[#0A847C]/50 transition-colors shadow-inner">
              <Search className="text-slate-400 w-5 h-5 mr-2" />
              <input 
                type="text" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                placeholder="Estou procurando por..." 
                className="w-full bg-transparent border-0 outline-none text-slate-700 text-sm h-full" 
              />
            </div>
            
            <button type="submit" className="h-12 px-12 rounded-lg bg-[#0A847C] hover:bg-[#085a51] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors shrink-0">
              Buscar
            </button>
            
            <button type="button" onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} className="h-11 px-6 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold flex items-center justify-center gap-2 transition-colors relative">
              <SlidersHorizontal size={16} /> Filtros
              {activeFiltersCount > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold">{activeFiltersCount}</span>}
            </button>

            {/* MODAL DE FILTROS AVANÇADOS */}
            {showAdvancedFilters && (
              <div ref={advancedFiltersRef} className="absolute right-0 top-full mt-4 w-[min(90vw,40rem)] bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 sm:p-8 z-50">
                <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Filtros Avançados</h3>
                    <p className="text-sm text-slate-500">Refine os resultados antes de buscar.</p>
                  </div>
                  <button type="button" onClick={() => setShowAdvancedFilters(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Categoria</label>
                    <select value={filters.categoryId} onChange={(e) => setFilters(c => ({...c, categoryId: e.target.value}))} className="h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm outline-none focus:border-[#0A847C]">
                      <option value="">Todas</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Distância Máxima</label>
                    <select value={filters.maxDistanceMeters} onChange={(e) => setFilters(c => ({...c, maxDistanceMeters: e.target.value}))} className="h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm outline-none focus:border-[#0A847C]">
                      {DISTANCE_OPTIONS.map(o => <option key={o.value || 'all'} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Preço Mín (R$)</label>
                    <input type="number" min="0" step="0.01" value={filters.minPrice} onChange={(e) => setFilters(c => ({...c, minPrice: e.target.value}))} className="h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm outline-none focus:border-[#0A847C]" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Preço Máx (R$)</label>
                    <input type="number" min="0" step="0.01" value={filters.maxPrice} onChange={(e) => setFilters(c => ({...c, maxPrice: e.target.value}))} className="h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm outline-none focus:border-[#0A847C]" />
                  </div>
                  <div className="flex flex-col gap-2 sm:col-span-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Ordenar por</label>
                    <select value={filters.sortBy} onChange={(e) => setFilters(c => ({...c, sortBy: e.target.value}))} className="h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm outline-none focus:border-[#0A847C]">
                      {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleSearchSubmit}
                    className="w-full h-12 rounded-xl bg-[#0A847C] hover:bg-[#085a51] active:scale-[0.98] text-white font-bold text-base flex items-center justify-center gap-2 transition-all shadow-sm shadow-[#0A847C]/30"
                  >
                    <Search size={18} />
                    Aplicar e Buscar
                  </button>

                  <button
                    type="button"
                    onClick={resetAdvancedFilters}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 active:scale-[0.98] text-slate-600 font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                  >
                    <X size={15} />
                    Limpar Filtros
                  </button>
                </div>
              </div>
            )}
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
                      {userRole === 'admin' && (
                        <span className="bg-amber-100 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded mt-1 inline-block uppercase">Admin</span>
                      )}
                    </div>
                    <hr />
                    <Link to="/perfil" className="dropdown-item">Meu Perfil</Link>
                    <Link to="/meus-pedidos" className="dropdown-item">Minhas Compras e Vendas (Carteira)</Link>
                    <Link to="/meus-anuncios" className="dropdown-item">Gerenciar Meus Anúncios</Link>
                    
                    {userRole === 'admin' && (
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

      {/* CONTEÚDO PRINCIPAL (COM MARGENS AUMENTADAS) */}
      <main className="main-content">
        
        {/* SLIDER DE BANNERS */}
        <section className="relative w-full h-[250px] sm:h-[350px] md:h-[400px] rounded-2xl overflow-hidden mb-12 shadow-sm bg-slate-100">
          {BANNERS.map((banner, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                index === currentBanner ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
            >
              <img
                src={banner}
                alt={`Banner de oferta ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
          
          {/* Indicadores do Slide (Bolinhas) */}
          <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center gap-2">
            {BANNERS.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentBanner(index)}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  index === currentBanner ? 'bg-white' : 'bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`Ir para o banner ${index + 1}`}
              />
            ))}
          </div>
        </section>

        <section className="categories-row-section">
          <div className="categories-row">
            {categories.length > 0 ? (
              categories.map((cat) => (
                <button key={cat.id} onClick={() => navigate(`/categoria/${cat.id}`)} className="category-pill">
                  {cat.name}
                </button>
              ))
            ) : (
              <div className="text-slate-400 text-sm">Nenhuma categoria disponível</div>
            )}
          </div>
        </section>

        {error && <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>}

        {/* SEÇÃO 1: RELEVANTES NA REGIÃO (<5KM) */}
        <section className="mb-20 mt-12">
          <h2 className="text-2xl font-bold text-[#002f34] mb-8">Anúncios na sua região</h2>
          
          <div className="relative group flex items-center">
            {nearbyListings.length > 0 && (
              <button onClick={() => scrollContainer(regionScrollRef, 'left')} className="absolute -left-5 z-20 w-12 h-12 bg-white rounded-full shadow-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:text-[#0A847C] opacity-0 group-hover:opacity-100 transition-all hidden md:flex">
                <ChevronLeft className="h-6 w-6 pr-0.5" />
              </button>
            )}

            <div ref={regionScrollRef} className="scroll-container w-full">
              {loading ? (
                [1, 2, 3, 4, 5].map(i => <div key={i} className="listing-card-width h-64 bg-slate-200 animate-pulse rounded-xl" />)
              ) : nearbyListings.length > 0 ? (
                <>
                  {nearbyListings.map(renderListingCard)}
                  <div className="listing-card-width flex items-center justify-center snap-start">
                    <button onClick={() => navigate('/busca?section=nearby')} className="flex flex-col items-center gap-3 text-[#0A847C] hover:text-[#085a51] group/btn">
                      <div className="w-16 h-16 rounded-full border-2 border-slate-200 flex items-center justify-center group-hover/btn:bg-slate-50 group-hover/btn:border-[#0A847C] transition-all"><ChevronRight size={28}/></div>
                      <span className="font-bold text-sm">Ver mais</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="w-full text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 rounded-2xl">Nenhum anúncio num raio de 5km.</div>
              )}
            </div>

            {nearbyListings.length > 0 && (
              <button onClick={() => scrollContainer(regionScrollRef, 'right')} className="absolute -right-5 z-20 w-12 h-12 bg-white rounded-full shadow-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:text-[#0A847C] opacity-0 group-hover:opacity-100 transition-all hidden md:flex">
                <ChevronRight className="h-6 w-6 pl-0.5" />
              </button>
            )}
          </div>
        </section>

        {/* SEÇÃO 2: MAIS VISITADOS */}
        <section className="mb-20 mt-12">
          <h2 className="text-2xl font-bold text-[#002f34] mb-8">Anúncios Mais Visitados</h2>
          
          <div className="relative group flex items-center">
            {maisVisitados.length > 0 && (
              <button onClick={() => scrollContainer(visitedScrollRef, 'left')} className="absolute -left-5 z-20 w-12 h-12 bg-white rounded-full shadow-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:text-[#0A847C] opacity-0 group-hover:opacity-100 transition-all hidden md:flex">
                <ChevronLeft className="h-6 w-6 pr-0.5" />
              </button>
            )}

            <div ref={visitedScrollRef} className="scroll-container w-full">
              {loading ? (
                [1, 2, 3, 4, 5].map(i => <div key={i} className="listing-card-width h-64 bg-slate-200 animate-pulse rounded-xl" />)
              ) : maisVisitados.length > 0 ? (
                <>
                  {maisVisitados.map(renderListingCard)}
                  <div className="listing-card-width flex items-center justify-center snap-start">
                    <button onClick={() => navigate('/busca?section=visited')} className="flex flex-col items-center gap-3 text-[#0A847C] hover:text-[#085a51] group/btn">
                      <div className="w-16 h-16 rounded-full border-2 border-slate-200 flex items-center justify-center group-hover/btn:bg-slate-50 group-hover/btn:border-[#0A847C] transition-all"><ChevronRight size={28}/></div>
                      <span className="font-bold text-sm">Ver mais</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-slate-500">Nenhum anúncio disponível.</div>
              )}
            </div>

            {maisVisitados.length > 0 && (
              <button onClick={() => scrollContainer(visitedScrollRef, 'right')} className="absolute -right-5 z-20 w-12 h-12 bg-white rounded-full shadow-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:text-[#0A847C] opacity-0 group-hover:opacity-100 transition-all hidden md:flex">
                <ChevronRight className="h-6 w-6 pl-0.5" />
              </button>
            )}
          </div>
        </section>

        {/* SEÇÃO 3: MAIS BUSCADOS */}
        <section className="mb-20 mt-12">
          <h2 className="text-2xl font-bold text-[#002f34] mb-8">Serviços Mais Buscados</h2>
          
          <div className="relative group flex items-center">
            {maisBuscados.length > 0 && (
              <button onClick={() => scrollContainer(searchedScrollRef, 'left')} className="absolute -left-5 z-20 w-12 h-12 bg-white rounded-full shadow-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:text-[#0A847C] opacity-0 group-hover:opacity-100 transition-all hidden md:flex">
                <ChevronLeft className="h-6 w-6 pr-0.5" />
              </button>
            )}

            <div ref={searchedScrollRef} className="scroll-container w-full">
              {loading ? (
                [1, 2, 3, 4, 5].map(i => <div key={i} className="listing-card-width h-64 bg-slate-200 animate-pulse rounded-xl" />)
              ) : maisBuscados.length > 0 ? (
                <>
                  {maisBuscados.map(renderListingCard)}
                  <div className="listing-card-width flex items-center justify-center snap-start">
                    <button onClick={() => navigate('/busca?section=searched')} className="flex flex-col items-center gap-3 text-[#0A847C] hover:text-[#085a51] group/btn">
                      <div className="w-16 h-16 rounded-full border-2 border-slate-200 flex items-center justify-center group-hover/btn:bg-slate-50 group-hover/btn:border-[#0A847C] transition-all"><ChevronRight size={28}/></div>
                      <span className="font-bold text-sm">Ver mais</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-slate-500">Nenhum anúncio disponível.</div>
              )}
            </div>

            {maisBuscados.length > 0 && (
              <button onClick={() => scrollContainer(searchedScrollRef, 'right')} className="absolute -right-5 z-20 w-12 h-12 bg-white rounded-full shadow-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:text-[#0A847C] opacity-0 group-hover:opacity-100 transition-all hidden md:flex">
                <ChevronRight className="h-6 w-6 pl-0.5" />
              </button>
            )}
          </div>
        </section>

      </main>

      {/* BOTÃO DO CHAT */}
      {user && (
        <Button type="button" variant="unstyled" onClick={() => navigate('/chat')} className="fixed bottom-8 right-8 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-[#0A847C] text-white shadow-xl transition-all duration-300 hover:scale-110 hover:bg-[#085a51] hover:shadow-2xl focus:outline-none" title="Abrir Chat">
          <MessageCircle size={32} />
          {hasUnread && (
            <>
              <span className="absolute top-0 right-0 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 ring-2 ring-white" />
              <span className="absolute top-0 right-0 h-4 w-4 animate-ping rounded-full bg-red-400 opacity-75" />
            </>
          )}
        </Button>
      )}
    </div>
  );
};

export default Home;
