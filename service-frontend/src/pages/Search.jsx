import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, MapPin, ArrowLeft, ImageIcon, UserCircle, SearchX } from 'lucide-react';
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

const SearchListings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [locationSource, setLocationSource] = useState(null);

  const navigate = useNavigate();
  const section = searchParams.get('section'); // Captura a seção vinda da Home

  const resetAdvancedFilters = () => {
    setFilters({
      categoryId: '',
      minPrice: '',
      maxPrice: '',
      maxDistanceKm: '',
      sortBy: 'relevance',
    });
    setSearchTerm('');
    
    // Remove os parâmetros da URL para voltar à estaca zero ("Comece sua busca")
    searchParams.delete('section');
    searchParams.delete('q');
    setSearchParams(searchParams);
  };

  const fetchUserAvatar = async (currentUser) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url, role, lat, lon')
        .eq('id', currentUser.id)
        .single();

      if (profile) {
        if (profile.avatar_url) setAvatarUrl(profile.avatar_url);
        if (profile.role) setUserRole(profile.role);
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
      const { data } = await supabase.from('profiles').select('lat, lon').eq('id', currentUser.id).single();
      const lat = Number(data?.lat);
      const lon = Number(data?.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      return { lat, lon };
    } catch {
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
    } catch {
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

  const getListingCategoryName = (listing) => listing.category?.name || listing.category_name || listing.categoria_nome || listing.categoryName || 'Serviço';
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

  // Verifica se há texto, filtro ou se viemos de uma seção direta da Home
  const isSearchActive = searchTerm.trim() !== '' || activeFiltersCount > 0 || section !== null;

  // Auth
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
      } finally { if (isMounted) setAuthLoading(false); }
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

  // Inteligência de Filtros via URL e Seções da Home
  useEffect(() => {
    const q = searchParams.get('q');
    const category = searchParams.get('category');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const maxDistance = searchParams.get('maxDistance');
    const sort = searchParams.get('sort');
    
    // Configura ordenação e distância com base na seção em que o usuário clicou na Home
    let defaultSort = 'relevance';
    let defaultDistance = '';

    if (sort) {
      defaultSort = sort;
      defaultDistance = maxDistance ? String(Number(maxDistance) / 1000) : '';
    } else {
      if (section === 'nearby') {
        defaultSort = 'distance';
        defaultDistance = '5'; // Raio de até 5km como na Home
      } else if (section === 'visited') {
        defaultSort = 'newest'; // Na home visitados ordenavam pelo criado mais recentemente
      } else if (section === 'searched') {
        defaultSort = 'price-asc'; // Na home buscados ordenavam pelo menor preço
      }
    }

    if (q) setSearchTerm(q);
    setFilters({
      categoryId: category || '',
      minPrice: minPrice || '',
      maxPrice: maxPrice || '',
      maxDistanceKm: defaultDistance,
      sortBy: defaultSort,
    });
  }, [searchParams, section]);

  // Categorias
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await supabase.from('listings').select('category:categories(id, name)', { count: 'exact' }).eq('status', 'active');
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
      } catch (fetchError) {
        console.error('Erro ao buscar categorias:', fetchError);
      }
    };
    fetchCategories();
  }, []);

  // Busca Geral no Banco (A filtragem final fica no useMemo para ser ultrarrápida)
  useEffect(() => {
    if (authLoading) return;
    let isMounted = true;
    const fetchListings = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Sempre tenta usar o RPC para obter as distâncias para todas as categorias
        try {
          const { lat, lon } = await getUserCoordinates();
          const { data, error } = await supabase.rpc('buscar_anuncios_por_proximidade', { lat, lon });
          if (error) throw error;
          if (isMounted) setListings(Array.isArray(data) ? data : []);
        } catch {
          // Fallback se geolocalização falhar
          const { data, error } = await supabase.from('listings').select(`id, title, description, price, image_urls, category_id, category:categories(id, name), address_text, created_at`).eq('status', 'active');
          if (error) throw error;
          if (isMounted) setListings(Array.isArray(data) ? data : []);
        }
      } catch (fetchError) {
        console.error('Erro ao carregar anúncios:', fetchError);
        if (isMounted) { setError('Não foi possível carregar os anúncios.'); setListings([]); }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchListings();
    return () => { isMounted = false; };
  }, [authLoading, user]);

  const filteredListings = useMemo(() => {
    const query = normalizeText(searchTerm.trim());
    const minPrice = Number(filters.minPrice);
    const maxPrice = Number(filters.maxPrice);
    const maxDistanceMeters = filters.maxDistanceKm ? Number(filters.maxDistanceKm) * 1000 : null;

    const selectedCategoryName = filters.categoryId
      ? normalizeText(categories.find((c) => String(c.id) === String(filters.categoryId))?.name ?? '')
      : '';

    const filtered = listings.filter((listing) => {
      const searchableText = getListingSearchableText(listing);
      const price = getListingPrice(listing);
      const distanceMeters = getListingDistanceMeters(listing);

      if (query && !searchableText.includes(query)) return false;
      if (selectedCategoryName) {
        const listingCategoryName = normalizeText(getListingCategoryName(listing));
        if (listingCategoryName !== selectedCategoryName) return false;
      }
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
  }, [filters, listings, searchTerm, categories]);

  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null); setAvatarUrl(null); setUserRole(null); navigate('/'); };

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
        className="listing-result-card"
      >
        <div className="listing-result-image">
          <div className="listing-result-badge">
            {categoryName}
          </div>

          {imageUrl ? (
            <img src={imageUrl} alt={title} loading="lazy" />
          ) : (
            <div className="text-slate-300">
              <ImageIcon size={42} strokeWidth={1.6} />
            </div>
          )}
        </div>

        <div className="listing-result-body">
          <h3 className="listing-result-title">{title}</h3>

          <div className="listing-result-meta">
            <MapPin size={14} strokeWidth={2} />
            <span className="truncate">{distanceLabel}</span>
            {locationSource === 'ip' && (
              <span className="location-source-pill">distância aproximada por IP</span>
            )}
          </div>

          <div className="listing-result-price-row">
            <span className="listing-result-currency">R$</span>
            <span className="listing-result-price">{Number(priceValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="app-page">
      {/* HEADER */}
      <header className="app-page-header">
        <div className="app-page-header-inner">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="app-back-button shrink-0">
              <ArrowLeft className="h-5 w-5" />
              <span className="hidden sm:inline font-medium text-sm">Voltar</span>
            </button>
            <img src="/assets/logo_service.png" alt="ServiCE" className="h-9 cursor-pointer" onClick={() => navigate('/')} />
          </div>

          <div className="header-nav">
            {!authLoading && user ? (
              <div className="user-menu">
                <div className="user-profile-icon" onClick={(e) => { e.stopPropagation(); setShowDropdown(!showDropdown); }} style={{ cursor: 'pointer', position: 'relative' }}>
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
                    <div className="dropdown-menu active" style={{ display: 'block', top: '50px', right: '0' }}>
                      <div className="dropdown-header" style={{ padding: '10px 15px' }}>
                        <span className="user-email-text" style={{ fontSize: '11px', color: 'var(--gray-400)', display: 'block' }}>{user.email}</span>
                        {userRole === 'admin' && (
                          <span className="bg-amber-100 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded mt-1 inline-block uppercase">Admin</span>
                        )}
                      </div>
                      <hr style={{ margin: '5px 0', border: '0', borderTop: '1px solid var(--gray-100)' }} />
                      <Link to="/perfil" className="dropdown-item">Meu Perfil</Link>
                      <Link to="/meus-pedidos" className="dropdown-item">Minhas Compras</Link>
                      <Link to="/meus-anuncios" className="dropdown-item">Meus Anúncios (Vendas)</Link>
                      
                      {userRole === 'admin' && (
                        <Link to="/admin" className="dropdown-item font-bold text-amber-600">Dashboard Admin</Link>
                      )}
                      
                      <button onClick={handleLogout} className="dropdown-item logout-item" style={{ color: '#d9534f', borderTop: '1px solid var(--gray-100)', marginTop: '5px' }}>Sair</button>
                    </div>
                  )}
                </div>
              </div>
            ) : !authLoading && (
              <Link to="/login" className="btn-login-header">Entrar</Link>
            )}
          </div>
        </div>
      </header>

      {/* HERO DE BUSCA */}
      <section className="page-hero">
        <div className="page-hero-inner">
          <div className="mx-auto w-full max-w-[720px]">
            <h1 className="page-title">
              Encontre o que você precisa
            </h1>
            <p className="page-subtitle mb-6">
              Pesquise produtos e serviços próximos a você
            </p>

          <form className="flex flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
            {/* BARRA DE BUSCA */}
            <div className="search-toolbar">
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Estou procurando por..."
                className="h-11 flex-1 border-0 bg-transparent px-4 text-[15px] shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Button type="submit" className="h-11 min-w-[112px] shrink-0 gap-2 rounded-[var(--radius-md)] bg-[var(--green-700)] px-5 text-white hover:bg-[var(--green-800)]">
                <Search className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Buscar</span>
              </Button>
              <Button
                type="button"
                onClick={() => setShowAdvancedFilters((c) => !c)}
                variant="outline"
                className="h-11 shrink-0 gap-1.5 rounded-[var(--radius-md)] border-[var(--gray-200)] px-4 text-[var(--gray-600)] hover:bg-[var(--gray-50)]"
              >
                <SlidersHorizontal className="h-4 w-4" />
                {activeFiltersCount > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--green-700)] px-1.5 text-[10px] font-bold text-white">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
            </div>

            {/* FILTROS AVANÇADOS */}
            {showAdvancedFilters && (
              <div className="filter-panel">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[var(--gray-900)]">Filtros avançados</h3>
                  <Button type="button" variant="ghost" onClick={() => setShowAdvancedFilters(false)} className="h-8 w-8 rounded-full p-0 text-[var(--gray-400)] hover:text-[var(--gray-900)]">
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--gray-400)]">Categoria</span>
                    <select
                      value={filters.categoryId}
                      onChange={(e) => setFilters((c) => ({ ...c, categoryId: e.target.value }))}
                      className="form-control"
                    >
                      <option value="">Todas as categorias</option>
                      {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                    </select>
                  </label>

                  <label className="space-y-1.5">
                    <span className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--gray-400)]">Proximidade</span>
                    <select
                      value={filters.maxDistanceKm}
                      onChange={(e) => setFilters((c) => ({ ...c, maxDistanceKm: e.target.value }))}
                      className="form-control"
                    >
                      {DISTANCE_OPTIONS.map((o) => (<option key={o.value || 'all'} value={o.value}>{o.label}</option>))}
                    </select>
                  </label>

                  <label className="space-y-1.5">
                    <span className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--gray-400)]">Preço Mínimo</span>
                    <Input
                      type="number" min="0" step="0.01"
                      value={filters.minPrice}
                      onChange={(e) => setFilters((c) => ({ ...c, minPrice: e.target.value }))}
                      placeholder="Ex: 50"
                      className="h-10 rounded-[var(--radius-md)] border-[var(--gray-200)] bg-[var(--gray-50)] text-sm focus-visible:ring-[var(--green-700)] focus:bg-white"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--gray-400)]">Preço Máximo</span>
                    <Input
                      type="number" min="0" step="0.01"
                      value={filters.maxPrice}
                      onChange={(e) => setFilters((c) => ({ ...c, maxPrice: e.target.value }))}
                      placeholder="Ex: 300"
                      className="h-10 rounded-[var(--radius-md)] border-[var(--gray-200)] bg-[var(--gray-50)] text-sm focus-visible:ring-[var(--green-700)] focus:bg-white"
                    />
                  </label>

                  <label className="space-y-1.5 sm:col-span-2">
                    <span className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--gray-400)]">Ordenar por</span>
                    <select
                      value={filters.sortBy}
                      onChange={(e) => setFilters((c) => ({ ...c, sortBy: e.target.value }))}
                      className="form-control"
                    >
                      {SORT_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                    </select>
                  </label>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--gray-100)] pt-4">
                  <p className="text-xs text-[var(--gray-400)]">
                    {activeFiltersCount > 0 ? `${activeFiltersCount} filtro(s) ativo(s)` : 'Nenhum filtro adicional aplicado'}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetAdvancedFilters}
                    className="h-8 rounded-[var(--radius-sm)] border-[var(--gray-200)] px-3 text-xs text-[var(--gray-600)] hover:bg-[var(--gray-50)]"
                  >
                    Limpar filtros
                  </Button>
                </div>
              </div>
            )}
          </form>
          </div>
        </div>
      </section>

      <main className="page-shell">
        {error && (
          <div className="mb-6 rounded-[var(--radius-md)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 text-center">
            {error}
          </div>
        )}

        {/* RESULTADOS */}
        {loading ? (
          <div className="empty-panel">
            <div className="h-8 w-8 rounded-full border-2 border-[var(--green-700)]/30 border-t-[var(--green-700)] animate-spin" />
            <span className="text-sm">Carregando anúncios...</span>
          </div>
        ) : !isSearchActive ? (
          /* NOVO ESTADO: NADA DIGITADO E NENHUM FILTRO */
          <div className="empty-panel">
            <div className="empty-panel-icon">
              <Search size={28} />
            </div>
            <h2 className="text-lg font-semibold text-[var(--gray-900)]">Comece sua busca</h2>
            <p className="text-sm text-[var(--gray-400)] max-w-xs">
              Digite o que você procura ou aplique um filtro para encontrar serviços e produtos.
            </p>
          </div>
        ) : filteredListings.length > 0 ? (
          <>
            <div className="results-summary">
              <p className="text-sm text-[var(--gray-600)]">
                <span className="font-semibold text-[var(--gray-900)]">{filteredListings.length}</span> anúncio(s) encontrado(s)
                {filters.categoryId && categories.find(c => String(c.id) === String(filters.categoryId)) && (
                  <span className="ml-1 text-[var(--green-700)] font-medium">
                    em {categories.find(c => String(c.id) === String(filters.categoryId))?.name}
                  </span>
                )}
              </p>
            </div>
            <div className="internal-results-grid">
              {filteredListings.map(renderListingCard)}
            </div>
          </>
        ) : (
          <div className="empty-panel">
            <div className="empty-panel-icon">
              <SearchX size={28} />
            </div>
            <h2 className="text-lg font-semibold text-[var(--gray-900)]">Nenhum anúncio encontrado</h2>
            <p className="text-sm text-[var(--gray-400)] max-w-xs">
              Tente ajustar os filtros ou buscar por outro termo.
            </p>
            {activeFiltersCount > 0 && (
              <button
                onClick={resetAdvancedFilters}
                className="mt-2 text-sm font-medium text-[var(--green-700)] hover:underline"
              >
                Limpar todos os filtros
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default SearchListings;
