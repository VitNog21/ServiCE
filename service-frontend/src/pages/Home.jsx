import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MessageCircle, Shield, SlidersHorizontal, ChevronDown, X, MapPin, ChevronRight, ChevronLeft } from 'lucide-react';
import { supabase } from '../supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import '../css/global.css';

const GEO_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 60000,
};

const DISTANCE_OPTIONS = [
  { label: 'Qualquer proximidade', value: '' },
  { label: 'Até 1 km', value: '1' },
  { label: 'Até 3 km', value: '3' },
  { label: 'Até 5 km', value: '5' },
  { label: 'Até 10 km', value: '10' },
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

const Home = () => {
  const [user, setUser] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    categoryId: '',
    minPrice: '',
    maxPrice: '',
    maxDistanceKm: '',
    sortBy: 'relevance',
  });
  const [listings, setListings] = useState([]);
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
      const scrollAmount = ref.current.clientWidth * 0.75; // Rola 75% da largura visível
      ref.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  const resetAdvancedFilters = () => {
    setFilters({
      categoryId: '',
      minPrice: '',
      maxPrice: '',
      maxDistanceKm: '',
      sortBy: 'relevance',
    });
  };

  const fetchUserAvatar = async (currentUser) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('avatar_url, role, lat, lon')
        .eq('id', currentUser.id)
        .single();

      if (profile) {
        if (!profile.lat || !profile.lon) {
          navigate('/completar-localizacao');
          return; 
        }
        if (profile.avatar_url) setAvatarUrl(profile.avatar_url);
        if (profile.role) setUserRole(profile.role);
      } else if (error && error.code === 'PGRST116') {
        navigate('/completar-localizacao');
        return;
      } else if (currentUser.user_metadata?.avatar_url) {
        setAvatarUrl(currentUser.user_metadata.avatar_url);
      }
    } catch (fetchError) {
      console.error('Erro ao buscar perfil:', fetchError);
    }
  };

  const getBrowserCoordinates = () => {
    if (!navigator.geolocation) return Promise.reject(new Error('Geolocalização indisponível'));
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({ lat: position.coords.latitude, lon: position.coords.longitude });
        },
        reject,
        GEO_OPTIONS
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
    } catch (err) {
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

  const getListingCategoryId = (listing) => listing.category?.id || listing.category_id || '';
  const getListingCategoryName = (listing) => listing.category?.name || listing.category_name || 'Serviço';
  const getListingPrice = (listing) => Number(listing.preco ?? listing.price ?? 0);
  const getListingDistanceMeters = (listing) => {
    const distance = Number(listing.distancia_metros ?? listing.distance_meters ?? listing.distance);
    return Number.isFinite(distance) ? distance : null;
  };

  const getListingSearchableText = (listing) => normalizeText([
    listing.titulo || listing.title,
    listing.description,
    getListingCategoryName(listing),
    listing.address_text,
  ].filter(Boolean).join(' '));

  const activeFiltersCount = [
    filters.categoryId, filters.minPrice, filters.maxPrice, filters.maxDistanceKm, filters.sortBy !== 'relevance'
  ].filter(Boolean).length;

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
    const fetchNearbyListings = async () => {
      try {
        setLoading(true);
        setError('');
        try {
          const { lat, lon } = await getUserCoordinates();
          const { data, error } = await supabase.rpc('buscar_anuncios_por_proximidade', { lat, lon });
          if (error) throw error;
          if (isMounted) setListings(Array.isArray(data) ? data : []);
          return;
        } catch (err) {}

        const { data, error } = await supabase.from('listings').select(`id, title, description, price, image_urls, category:categories(id, name), address_text, created_at`).eq('status', 'active').order('created_at', { ascending: false }).limit(50);
        if (error) throw error;
        if (isMounted) setListings(Array.isArray(data) ? data : []);
      } catch (err) {
        if (isMounted) { setError('Não foi possível carregar os anúncios.'); setListings([]); }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchNearbyListings();
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

  const filteredListings = useMemo(() => {
    const query = normalizeText(searchTerm.trim());
    const minPrice = Number(filters.minPrice);
    const maxPrice = Number(filters.maxPrice);
    const maxDistanceMeters = filters.maxDistanceKm ? Number(filters.maxDistanceKm) * 1000 : null;

    const filtered = listings.filter((listing) => {
      const searchableText = getListingSearchableText(listing);
      const categoryId = getListingCategoryId(listing);
      const price = getListingPrice(listing);
      const distanceMeters = getListingDistanceMeters(listing);

      if (query && !searchableText.includes(query)) return false;
      if (filters.categoryId && String(categoryId) !== String(filters.categoryId)) return false;
      if (filters.minPrice !== '' && (!Number.isFinite(minPrice) || price < minPrice)) return false;
      if (filters.maxPrice !== '' && (!Number.isFinite(maxPrice) || price > maxPrice)) return false;
      if (maxDistanceMeters !== null && (!Number.isFinite(distanceMeters) || distanceMeters > maxDistanceMeters)) return false;
      return true;
    });

    const sorted = [...filtered];
    switch (filters.sortBy) {
      case 'distance':
        sorted.sort((a, b) => (getListingDistanceMeters(a) || Infinity) - (getListingDistanceMeters(b) || Infinity));
        break;
      case 'price-asc':
        sorted.sort((a, b) => getListingPrice(a) - getListingPrice(b)); break;
      case 'price-desc':
        sorted.sort((a, b) => getListingPrice(b) - getListingPrice(a)); break;
      case 'newest':
        sorted.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)); break;
      default: break;
    }
    return sorted;
  }, [filters, listings, searchTerm]);

  // ==========================================
  // FILTROS DAS 3 SEÇÕES (Max 5 itens)
  // ==========================================
  
  // Seção 1: Até 5km
  const nearbyListings = useMemo(() => {
    return filteredListings.filter(l => {
      const dist = getListingDistanceMeters(l);
      return dist !== null && dist <= 5000; 
    }).slice(0, 5);
  }, [filteredListings]);

  // Seção 2: "Mais Visitados" (Simulado)
  const visitedListings = useMemo(() => {
    return [...filteredListings].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
  }, [filteredListings]);

  // Seção 3: "Mais Buscados" (Simulado)
  const searchedListings = useMemo(() => {
    return [...filteredListings].sort((a, b) => getListingPrice(a) - getListingPrice(b)).slice(0, 5);
  }, [filteredListings]);

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
      <Link
        to={`/detalhes/${listing.id}`}
        key={listing.id}
        className="group relative flex flex-col w-[200px] sm:w-[220px] md:w-[230px] flex-shrink-0 snap-start overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-md"
        style={{ textDecoration: 'none', color: 'inherit' }}
      >
        <div className="absolute top-2 left-2 z-10 inline-flex items-center rounded bg-white/95 px-2 py-0.5 backdrop-blur-sm shadow-sm">
          <span className="text-[10px] font-bold text-[#0A847C] uppercase tracking-wider">
            {categoryName.slice(0, 15)}
          </span>
        </div>

        <div className="aspect-square w-full bg-slate-100 relative overflow-hidden">
          {imageUrl ? (
            <img src={imageUrl} alt={title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
          ) : (
            <div className="flex h-full items-center justify-center text-4xl text-slate-300">📷</div>
          )}
        </div>

        <div className="flex flex-col flex-grow p-3">
          <h3 className="line-clamp-2 text-sm font-medium text-slate-900 min-h-[2.5rem] leading-tight group-hover:text-[#0A847C] transition-colors">
            {title}
          </h3>

          <div className="mt-2 text-lg font-bold text-slate-900">
            R$ {Number(priceValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>

          {distanceLabel && (
            <div className="mt-auto pt-2 flex items-center gap-1.5 text-xs text-slate-500">
              <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
              <span className="truncate">{distanceLabel}</span>
            </div>
          )}
        </div>
      </Link>
    );
  };

  return (
    <div className="home-container relative min-h-screen bg-white">
      {/* HEADER */}
      <header className="main-header border-b border-slate-200 shadow-sm">
        <img src="/assets/logo_service.png" alt="ServiCE" className="header-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }} />

        <form className="header-search m-0 border-0 bg-transparent" onSubmit={(e) => e.preventDefault()}>
          <div ref={advancedFiltersRef} className="relative mx-auto flex w-full max-w-4xl flex-col gap-3">
            <div className="flex w-full items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 p-1 focus-within:bg-white focus-within:border-[#0A847C]/50 transition-all">
              <div className="flex min-w-0 flex-1 items-center">
                <Input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Estou procurando por..." className="h-9 border-0 bg-transparent px-4 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0" />
              </div>
              <Button type="submit" className="h-9 shrink-0 gap-2 rounded-lg bg-[#0A847C] px-5 text-white hover:bg-[#085a51]">
                <Search className="h-4 w-4" /> <span className="hidden sm:inline">Buscar</span>
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowAdvancedFilters((c) => !c)} className="h-9 shrink-0 gap-2 rounded-lg border-slate-200 px-4 text-slate-600 hover:bg-slate-100">
                <SlidersHorizontal className="h-4 w-4" /> <span className="hidden md:inline">Filtros</span>
                {activeFiltersCount > 0 && <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0A847C] px-1.5 text-[10px] font-bold text-white">{activeFiltersCount}</span>}
                <ChevronDown className={`h-4 w-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
              </Button>
            </div>

            {/* MODAL DE FILTROS AVANÇADOS */}
            {showAdvancedFilters && (
              <div className="absolute right-0 top-full z-40 mt-3 w-[min(94vw,36rem)] rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div><h3 className="text-sm font-semibold text-slate-900">Filtros avançados</h3><p className="mt-1 text-xs text-slate-500">Refine por categoria, preço e proximidade.</p></div>
                  <Button type="button" variant="ghost" onClick={() => setShowAdvancedFilters(false)} className="h-8 w-8 rounded-full p-0 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X className="h-4 w-4" /></Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium text-slate-700">
                    <span className="block text-xs uppercase tracking-wide text-slate-500">Categoria</span>
                    <select value={filters.categoryId} onChange={(e) => setFilters((c) => ({ ...c, categoryId: e.target.value }))} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-[#0A847C]">
                      <option value="">Todas</option>{categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                    </select>
                  </label>
                  <label className="space-y-2 text-sm font-medium text-slate-700">
                    <span className="block text-xs uppercase tracking-wide text-slate-500">Proximidade</span>
                    <select value={filters.maxDistanceKm} onChange={(e) => setFilters((c) => ({ ...c, maxDistanceKm: e.target.value }))} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-[#0A847C]">
                      {DISTANCE_OPTIONS.map((o) => (<option key={o.value || 'all'} value={o.value}>{o.label}</option>))}
                    </select>
                  </label>
                  <label className="space-y-2 text-sm font-medium text-slate-700">
                    <span className="block text-xs uppercase tracking-wide text-slate-500">Preço Mínimo</span>
                    <Input type="number" min="0" step="0.01" value={filters.minPrice} onChange={(e) => setFilters((c) => ({ ...c, minPrice: e.target.value }))} placeholder="Ex: 50" className="h-11 rounded-xl border-slate-200 text-sm focus-visible:ring-[#0A847C]" />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-slate-700">
                    <span className="block text-xs uppercase tracking-wide text-slate-500">Preço Máximo</span>
                    <Input type="number" min="0" step="0.01" value={filters.maxPrice} onChange={(e) => setFilters((c) => ({ ...c, maxPrice: e.target.value }))} placeholder="Ex: 300" className="h-11 rounded-xl border-slate-200 text-sm focus-visible:ring-[#0A847C]" />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
                    <span className="block text-xs uppercase tracking-wide text-slate-500">Ordenar por</span>
                    <select value={filters.sortBy} onChange={(e) => setFilters((c) => ({ ...c, sortBy: e.target.value }))} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-[#0A847C]">
                      {SORT_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                    </select>
                  </label>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <p className="text-xs text-slate-500">{activeFiltersCount > 0 ? `${activeFiltersCount} filtro(s) em uso.` : 'Sem filtros adicionais.'}</p>
                  <Button type="button" variant="outline" onClick={resetAdvancedFilters} className="rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900">Limpar filtros</Button>
                </div>
              </div>
            )}
          </div>
        </form>

        <nav className="header-nav">
          {authLoading ? (
            <div className="loader-placeholder">A carregar...</div>
          ) : user ? (
            <div className="user-menu flex items-center gap-4">
              
              {userRole === 'admin' && (
                <Link 
                  to="/admin" 
                  className="flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white whitespace-nowrap transition-all hover:bg-slate-800 shadow-sm"
                >
                  <Shield size={16} /> <span>Painel Admin</span>
                </Link>
              )}
              
              <Link to="/meus-anuncios" className="font-medium text-sm text-slate-700 hover:text-[#0A847C] whitespace-nowrap">Meus Anúncios</Link>
              
              <div className="user-profile-icon" onClick={toggleDropdown} style={{ cursor: 'pointer', position: 'relative' }}>
                {avatarUrl ? <img src={avatarUrl} alt="Perfil" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #0A847C' }} /> : <span style={{ fontSize: '24px' }}>👤</span>}
                {showDropdown && (
                  <div className="dropdown-menu active" onClick={(e) => e.stopPropagation()}>
                    <div className="dropdown-header">
                      <span className="user-email-text">{user.email}</span>
                      {userRole === 'admin' && <span className="mt-1 inline-block rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 uppercase">Admin</span>}
                    </div>
                    <hr />
                    <Link to="/perfil" className="dropdown-item">Meu Perfil</Link>
                    <Button type="button" variant="ghost" onClick={handleLogout} className="dropdown-item logout-item">Sair</Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Link to="/login" className="btn-login-header">Entrar / Cadastrar</Link>
          )}
        </nav>
      </header>

      {/* CONTEÚDO PRINCIPAL COM LAYOUT E BANNER INTACTOS */}
      <main className="main-content">
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

        {error && <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>}

        {/* ==========================================
            SEÇÃO 1: RELEVANTES NA REGIÃO (<5KM)
            ========================================== */}
        <section className="mb-32">
          <h2 className="text-xl font-bold text-[#002f34] uppercase tracking-tight mb-6">
            Anúncios na sua região
          </h2>
          
          <div className="relative group">
            {/* Seta Esquerda */}
            {nearbyListings.length > 0 && (
              <button onClick={() => scrollContainer(regionScrollRef, 'left')} className="absolute -left-4 top-[40%] -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-white border border-slate-200 shadow-md text-slate-600 hover:text-[#0A847C] hover:border-[#0A847C] transition-all opacity-0 group-hover:opacity-100 hidden md:flex">
                <ChevronLeft className="h-6 w-6 pr-0.5" />
              </button>
            )}

            <div ref={regionScrollRef} className="flex gap-4 overflow-x-auto pb-4 snap-x [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {loading ? (
                [1, 2, 3, 4, 5].map(i => <div key={i} className="w-[200px] sm:w-[220px] md:w-[230px] h-64 bg-slate-200 animate-pulse rounded-md flex-shrink-0" />)
              ) : nearbyListings.length > 0 ? (
                <>
                  {nearbyListings.map(renderListingCard)}
                  <div className="flex-shrink-0 flex items-center justify-center w-24 snap-start">
                    <button className="group/btn flex flex-col items-center gap-2 text-[#0A847C] hover:text-[#085a51]" onClick={() => navigate('/busca?section=nearby')}>
                      <div className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center group-hover/btn:bg-slate-50 transition-colors">
                        <ChevronRight className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-semibold">Ver mais</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="w-full text-center py-10 border border-dashed border-slate-200 rounded-xl text-slate-500">Nenhum anúncio encontrado num raio de 5km.</div>
              )}
            </div>

            {/* Seta Direita */}
            {nearbyListings.length > 0 && (
              <button onClick={() => scrollContainer(regionScrollRef, 'right')} className="absolute -right-4 top-[40%] -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-white border border-slate-200 shadow-md text-slate-600 hover:text-[#0A847C] hover:border-[#0A847C] transition-all opacity-0 group-hover:opacity-100 hidden md:flex">
                <ChevronRight className="h-6 w-6 pl-0.5" />
              </button>
            )}
          </div>
        </section>

        {/* ==========================================
            SEÇÃO 2: MAIS VISITADOS
            ========================================== */}
        <section className="mb-32">
          <h2 className="text-xl font-bold text-[#002f34] uppercase tracking-tight mb-6 mt-20">
            Anúncios Mais Visitados
          </h2>
          
          <div className="relative group">
            {visitedListings.length > 0 && (
              <button onClick={() => scrollContainer(visitedScrollRef, 'left')} className="absolute -left-4 top-[40%] -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-white border border-slate-200 shadow-md text-slate-600 hover:text-[#0A847C] hover:border-[#0A847C] transition-all opacity-0 group-hover:opacity-100 hidden md:flex">
                <ChevronLeft className="h-6 w-6 pr-0.5" />
              </button>
            )}

            <div ref={visitedScrollRef} className="flex gap-4 overflow-x-auto pb-4 snap-x [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {loading ? (
                [1, 2, 3, 4, 5].map(i => <div key={i} className="w-[200px] sm:w-[220px] md:w-[230px] h-64 bg-slate-200 animate-pulse rounded-md flex-shrink-0" />)
              ) : visitedListings.length > 0 ? (
                <>
                  {visitedListings.map(renderListingCard)}
                  <div className="flex-shrink-0 flex items-center justify-center w-24 snap-start">
                    <button className="group/btn flex flex-col items-center gap-2 text-[#0A847C] hover:text-[#085a51]" onClick={() => navigate('/busca?section=visited')}>
                      <div className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center group-hover/btn:bg-slate-50 transition-colors">
                        <ChevronRight className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-semibold">Ver mais</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-slate-500">Nenhum anúncio disponível.</div>
              )}
            </div>

            {visitedListings.length > 0 && (
              <button onClick={() => scrollContainer(visitedScrollRef, 'right')} className="absolute -right-4 top-[40%] -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-white border border-slate-200 shadow-md text-slate-600 hover:text-[#0A847C] hover:border-[#0A847C] transition-all opacity-0 group-hover:opacity-100 hidden md:flex">
                <ChevronRight className="h-6 w-6 pl-0.5" />
              </button>
            )}
          </div>
        </section>

        {/* ==========================================
            SEÇÃO 3: MAIS BUSCADOS
            ========================================== */}
        <section className="mb-32">
          <h2 className="text-xl font-bold text-[#002f34] uppercase tracking-tight mb-6 mt-20">
            Serviços Mais Buscados
          </h2>
          
          <div className="relative group">
            {searchedListings.length > 0 && (
              <button onClick={() => scrollContainer(searchedScrollRef, 'left')} className="absolute -left-4 top-[40%] -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-white border border-slate-200 shadow-md text-slate-600 hover:text-[#0A847C] hover:border-[#0A847C] transition-all opacity-0 group-hover:opacity-100 hidden md:flex">
                <ChevronLeft className="h-6 w-6 pr-0.5" />
              </button>
            )}

            <div ref={searchedScrollRef} className="flex gap-4 overflow-x-auto pb-4 snap-x [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {loading ? (
                [1, 2, 3, 4, 5].map(i => <div key={i} className="w-[200px] sm:w-[220px] md:w-[230px] h-64 bg-slate-200 animate-pulse rounded-md flex-shrink-0" />)
              ) : searchedListings.length > 0 ? (
                <>
                  {searchedListings.map(renderListingCard)}
                  <div className="flex-shrink-0 flex items-center justify-center w-24 snap-start">
                    <button className="group/btn flex flex-col items-center gap-2 text-[#0A847C] hover:text-[#085a51]" onClick={() => navigate('/busca?section=searched')}>
                      <div className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center group-hover/btn:bg-slate-50 transition-colors">
                        <ChevronRight className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-semibold">Ver mais</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-slate-500">Nenhum anúncio disponível.</div>
              )}
            </div>

            {searchedListings.length > 0 && (
              <button onClick={() => scrollContainer(searchedScrollRef, 'right')} className="absolute -right-4 top-[40%] -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-white border border-slate-200 shadow-md text-slate-600 hover:text-[#0A847C] hover:border-[#0A847C] transition-all opacity-0 group-hover:opacity-100 hidden md:flex">
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