import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, ChevronDown, X, MapPin, ArrowLeft } from 'lucide-react';
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

const CategoryProducts = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Nomes e Dados
  const [categoryName, setCategoryName] = useState('');
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authLoading, setAuthLoading] = useState(true);

  // Estados dos inputs
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    categoryId: categoryId, 
    minPrice: '', 
    maxPrice: '', 
    maxDistanceKm: '', 
    sortBy: 'relevance',
  });

  // Estados aplicados (Só atualizam ao buscar)
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({
    categoryId: categoryId, 
    minPrice: '', 
    maxPrice: '', 
    maxDistanceKm: '', 
    sortBy: 'relevance',
  });

  const advancedFiltersRef = useRef(null);

  const resetAdvancedFilters = () => {
    // Mantém a categoria travada ao limpar
    const resetState = { categoryId: categoryId, minPrice: '', maxPrice: '', maxDistanceKm: '', sortBy: 'relevance' };
    setFilters(resetState);
    setAppliedFilters(resetState);
    setSearchTerm('');
    setAppliedSearchTerm('');
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setAppliedSearchTerm(searchTerm);
    setAppliedFilters(filters);
    setShowAdvancedFilters(false);
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
      const { data } = await supabase.from('profiles').select('lat, lon').eq('id', currentUser.id).single();
      const lat = Number(data?.lat);
      const lon = Number(data?.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      return { lat, lon };
    } catch (err) {
      return null;
    }
  };

  const getUserCoordinates = async () => {
    const profileCoords = await getProfileCoordinates(user);
    if (profileCoords) return profileCoords;
    try {
      return await getBrowserCoordinates();
    } catch (err) {
      return await getIpCoordinates();
    }
  };

  const formatDistance = (distanceMeters) => {
    const distance = Number(distanceMeters);
    if (Number.isNaN(distance) || distanceMeters === null) return '';
    if (distance < 1000) return `${Math.round(distance)}m`;
    return `${(distance / 1000).toFixed(1)}km`;
  };

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

  // Conta filtros ativos (ignorando a categoria travada)
  const activeFiltersCount = [
    appliedFilters.minPrice, appliedFilters.maxPrice, appliedFilters.maxDistanceKm, appliedFilters.sortBy !== 'relevance'
  ].filter(Boolean).length;

  // 1. Iniciar Auth
  useEffect(() => {
    let isMounted = true;
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && isMounted) setUser(session.user);
      } catch (err) {} finally { if (isMounted) setAuthLoading(false); }
    };
    initializeAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setUser(session?.user || null);
    });
    return () => { isMounted = false; subscription.unsubscribe(); };
  }, []);

  // 2. Buscar Nome da Categoria
  useEffect(() => {
    const fetchCategoryDetails = async () => {
      try {
        const { data, error } = await supabase.from('categories').select('name').eq('id', categoryId).single();
        if (error) throw error;
        setCategoryName(data?.name || 'Categoria');
      } catch (err) {
        setCategoryName('Categoria');
      }
    };
    if (categoryId) fetchCategoryDetails();
  }, [categoryId]);

  // 3. Buscar Anúncios
  useEffect(() => {
    if (authLoading) return;
    let isMounted = true;
    
    const fetchListings = async () => {
      try {
        setLoading(true);
        setError('');
        
        try {
          const { lat, lon } = await getUserCoordinates();
          const { data, error } = await supabase.rpc('buscar_anuncios_por_proximidade', { lat, lon });
          if (error) throw error;
          if (isMounted) setListings(Array.isArray(data) ? data : []);
        } catch (err) {
          const { data, error } = await supabase.from('listings').select(`id, title, description, price, image_urls, category_id, category:categories(id, name), address_text, created_at`).eq('status', 'active');
          if (error) throw error;
          if (isMounted) setListings(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (isMounted) { setError('Não foi possível carregar os anúncios.'); setListings([]); }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchListings();
    return () => { isMounted = false; };
  }, [authLoading, user]);

  // Fechar Modal Clicando Fora
  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!showAdvancedFilters) return;
      if (advancedFiltersRef.current && !advancedFiltersRef.current.contains(event.target)) setShowAdvancedFilters(false);
    };
    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [showAdvancedFilters]);

  // Filtragem e Ordenação
  const filteredListings = useMemo(() => {
    const query = normalizeText(appliedSearchTerm.trim());
    const minPrice = Number(appliedFilters.minPrice);
    const maxPrice = Number(appliedFilters.maxPrice);
    const maxDistanceMeters = appliedFilters.maxDistanceKm ? Number(appliedFilters.maxDistanceKm) * 1000 : null;

    const filtered = listings.filter((listing) => {
      const searchableText = getListingSearchableText(listing);
      const categoryIdListing = listing.category?.id || listing.category_id;
      const price = getListingPrice(listing);
      const distanceMeters = getListingDistanceMeters(listing);

      // Trava Categoria
      if (String(categoryIdListing) !== String(categoryId)) return false;

      if (query && !searchableText.includes(query)) return false;
      if (appliedFilters.minPrice !== '' && (!Number.isFinite(minPrice) || price < minPrice)) return false;
      if (appliedFilters.maxPrice !== '' && (!Number.isFinite(maxPrice) || price > maxPrice)) return false;
      if (maxDistanceMeters !== null && (!Number.isFinite(distanceMeters) || distanceMeters > maxDistanceMeters)) return false;
      return true;
    });

    const sorted = [...filtered];
    switch (appliedFilters.sortBy) {
      case 'distance':
        sorted.sort((a, b) => (getListingDistanceMeters(a) || Infinity) - (getListingDistanceMeters(b) || Infinity)); break;
      case 'price-asc':
        sorted.sort((a, b) => getListingPrice(a) - getListingPrice(b)); break;
      case 'price-desc':
        sorted.sort((a, b) => getListingPrice(b) - getListingPrice(a)); break;
      case 'newest':
        sorted.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)); break;
      default: break;
    }
    return sorted;
  }, [appliedFilters, listings, appliedSearchTerm, categoryId]);

  const renderListingCard = (listing) => {
    const imageUrl = Array.isArray(listing.image_urls) && listing.image_urls.length > 0 ? listing.image_urls[0] : listing.imagem_url || null;
    const title = listing.titulo || listing.title || 'Anúncio sem título';
    const priceValue = getListingPrice(listing);
    const distanceMeters = getListingDistanceMeters(listing);
    const distanceLabel = formatDistance(distanceMeters);

    return (
      <Link to={`/detalhes/${listing.id}`} key={listing.id} className="group relative flex flex-col bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300" style={{ textDecoration: 'none', color: 'inherit' }}>
        <div className="absolute top-3 left-3 z-10 inline-flex items-center rounded bg-white/95 px-2 py-0.5 backdrop-blur-sm shadow-sm">
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

        <div className="flex flex-col flex-grow p-4">
          <h3 className="line-clamp-2 text-sm font-medium text-slate-900 leading-tight group-hover:text-[#0A847C] transition-colors">
            {title}
          </h3>
          <div className="mt-3 text-lg font-bold text-slate-900">
            R$ {Number(priceValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          {distanceLabel && (
            <div className="mt-auto pt-3 flex items-center gap-1.5 text-xs text-slate-500">
              <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
              <span className="truncate">{distanceLabel}</span>
            </div>
          )}
        </div>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      {/* HEADER AJUSTADO (Logo centralizada, sem perfil) */}
      <header className="main-header border-b border-slate-200 shadow-sm bg-white sticky top-0 z-30 h-16">
        <div className="max-w-7xl mx-auto flex items-center w-full px-4 h-full relative">
          
          <div className="flex-1 flex justify-start">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors shrink-0">
              <ArrowLeft className="h-5 w-5" />
              <span className="hidden sm:inline font-medium text-sm">Voltar</span>
            </button>
          </div>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex justify-center">
            <img src="/assets/logo_service.png" alt="ServiCE" className="h-8 sm:h-9 cursor-pointer" onClick={() => navigate('/')} />
          </div>

          <div className="flex-1 flex justify-end"></div>
        </div>
      </header>

      {/* HERO DE BUSCA DINÂMICO */}
      <section style={{ backgroundColor: '#f0fafa', borderBottom: '1px solid #e2e8f0', padding: '40px 16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          <div style={{ width: '100%', maxWidth: '680px' }}>
            <h1 style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
              Encontre o que você precisa em <span className="text-[#0A847C]">{categoryName}</span>
            </h1>
            <p style={{ textAlign: 'center', fontSize: '0.875rem', color: '#64748b', marginBottom: '24px' }}>
              Pesquise produtos e serviços próximos a você nesta categoria
            </p>

          <form className="flex flex-col gap-3" onSubmit={handleSearchSubmit}>
            <div className="flex gap-2 rounded-2xl border border-slate-200 bg-white shadow-sm p-1.5 focus-within:border-[#0A847C]/60 focus-within:shadow-md transition-all">
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Estou procurando por..."
                className="h-10 border-0 bg-transparent px-3 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 flex-1"
              />
              <Button type="submit" className="h-10 gap-2 rounded-xl bg-[#0A847C] px-5 text-white hover:bg-[#085a51] shrink-0">
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">Buscar</span>
              </Button>
              <Button
                type="button"
                onClick={() => setShowAdvancedFilters((c) => !c)}
                variant="outline"
                className="h-10 gap-1.5 rounded-xl border-slate-200 px-3 text-slate-600 hover:bg-slate-50 shrink-0"
              >
                <SlidersHorizontal className="h-4 w-4" />
                {activeFiltersCount > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0A847C] px-1.5 text-[10px] font-bold text-white">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
            </div>

            {showAdvancedFilters && (
              <div ref={advancedFiltersRef} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg relative z-20">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800">Filtros avançados</h3>
                  <Button type="button" variant="ghost" onClick={() => setShowAdvancedFilters(false)} className="h-8 w-8 rounded-full p-0 text-slate-400 hover:text-slate-700">
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  
                  {/* CATEGORIA TRAVADA */}
                  <label className="space-y-1.5">
                    <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Categoria</span>
                    <select
                      disabled
                      value={categoryId}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 text-sm text-slate-500 outline-none cursor-not-allowed"
                    >
                      <option value={categoryId}>{categoryName || 'Carregando...'}</option>
                    </select>
                  </label>

                  <label className="space-y-1.5">
                    <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Proximidade</span>
                    <select
                      value={filters.maxDistanceKm}
                      onChange={(e) => setFilters((c) => ({ ...c, maxDistanceKm: e.target.value }))}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-[#0A847C] focus:bg-white"
                    >
                      {DISTANCE_OPTIONS.map((o) => (<option key={o.value || 'all'} value={o.value}>{o.label}</option>))}
                    </select>
                  </label>

                  <label className="space-y-1.5">
                    <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Preço Mínimo</span>
                    <Input
                      type="number" min="0" step="0.01"
                      value={filters.minPrice}
                      onChange={(e) => setFilters((c) => ({ ...c, minPrice: e.target.value }))}
                      placeholder="Ex: 50"
                      className="h-10 rounded-xl border-slate-200 bg-slate-50 text-sm focus-visible:ring-[#0A847C] focus:bg-white"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Preço Máximo</span>
                    <Input
                      type="number" min="0" step="0.01"
                      value={filters.maxPrice}
                      onChange={(e) => setFilters((c) => ({ ...c, maxPrice: e.target.value }))}
                      placeholder="Ex: 300"
                      className="h-10 rounded-xl border-slate-200 bg-slate-50 text-sm focus-visible:ring-[#0A847C] focus:bg-white"
                    />
                  </label>

                  <label className="space-y-1.5 sm:col-span-2">
                    <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Ordenar por</span>
                    <select
                      value={filters.sortBy}
                      onChange={(e) => setFilters((c) => ({ ...c, sortBy: e.target.value }))}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-[#0A847C] focus:bg-white"
                    >
                      {SORT_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                    </select>
                  </label>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <p className="text-xs text-slate-400">
                    {activeFiltersCount > 0 ? `${activeFiltersCount} filtro(s) ativo(s)` : 'Nenhum filtro adicional aplicado'}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetAdvancedFilters}
                    className="h-8 rounded-lg border-slate-200 px-3 text-xs text-slate-600 hover:bg-slate-50"
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

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '40px 24px' }}>
        {error && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 text-center">
            {error}
          </div>
        )}

        {/* RESULTADOS */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <div className="h-8 w-8 rounded-full border-2 border-[#0A847C]/30 border-t-[#0A847C] animate-spin" />
            <span className="text-sm">Carregando anúncios...</span>
          </div>
        ) : filteredListings.length > 0 ? (
          <>
            <div className="mb-6 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                <span className="font-semibold text-slate-800">{filteredListings.length}</span> anúncio(s) encontrado(s)
                <span className="ml-1 text-[#0A847C] font-medium">em {categoryName}</span>
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {filteredListings.map(renderListingCard)}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-3xl">🔍</div>
            <h2 className="text-lg font-semibold text-slate-700">Nenhum anúncio encontrado</h2>
            <p className="text-sm text-slate-400 max-w-xs">
              Tente ajustar os filtros ou buscar por outro termo dentro desta categoria.
            </p>
            {activeFiltersCount > 0 && (
              <button
                onClick={resetAdvancedFilters}
                className="mt-2 text-sm font-medium text-[#0A847C] hover:underline"
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

export default CategoryProducts;