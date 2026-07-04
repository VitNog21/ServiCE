import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, MessageCircle, Shield, SlidersHorizontal, ChevronDown, X, MapPin, ArrowLeft } from 'lucide-react';
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

  const advancedFiltersRef = useRef(null);
  const navigate = useNavigate();
  const section = searchParams.get('section');

  const resetAdvancedFilters = () => {
    setFilters({
      categoryId: '',
      minPrice: '',
      maxPrice: '',
      maxDistanceKm: '',
      sortBy: 'relevance',
    });
    setSearchTerm('');
    
    searchParams.delete('section');
    searchParams.delete('q');
    setSearchParams(searchParams);
  };

  const getBrowserCoordinates = () => {
    if (!navigator.geolocation) return Promise.reject(new Error('Geolocalização indisponível'));
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ lat: position.coords.latitude, lon: position.coords.longitude }),
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

  const isSearchActive = searchTerm.trim() !== '' || activeFiltersCount > 0 || section !== null;

  useEffect(() => {
    let isMounted = true;
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && isMounted) {
          setUser(session.user);
        }
      } catch (err) {} finally { if (isMounted) setAuthLoading(false); }
    };
    initializeAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
      }
    });
    return () => { isMounted = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    const q = searchParams.get('q');
    const category = searchParams.get('category');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const maxDistance = searchParams.get('maxDistance');
    const sort = searchParams.get('sort');
    
    let defaultSort = 'relevance';
    let defaultDistance = '';

    if (sort) {
      defaultSort = sort;
      defaultDistance = maxDistance ? String(Number(maxDistance) / 1000) : '';
    } else {
      if (section === 'nearby') {
        defaultSort = 'distance';
        defaultDistance = '5';
      } else if (section === 'visited') {
        defaultSort = 'newest';
      } else if (section === 'searched') {
        defaultSort = 'view-count';
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
      } catch (err) {}
    };
    fetchCategories();
  }, []);

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
          const { data, error } = await supabase.from('listings').select(`id, title, description, price, image_urls, category_id, view_count, category:categories(id, name), address_text, created_at`).eq('status', 'active');
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

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!showAdvancedFilters) return;
      if (advancedFiltersRef.current && !advancedFiltersRef.current.contains(event.target)) setShowAdvancedFilters(false);
    };
    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [showAdvancedFilters]);

  // A variável filteredListings precisa ser criada AQUI antes do useEffect
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
      case 'view-count':
        sorted.sort((a, b) => {
          const viewCountDiff = Number(b.view_count ?? 0) - Number(a.view_count ?? 0);
          if (viewCountDiff !== 0) return viewCountDiff;
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        });
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

  // AGORA SIM! O useEffect das buscas vem DEPOIS do filteredListings ser inicializado.
  useEffect(() => {
    const query = searchTerm.trim();
    if (!query) return;
    if (filteredListings.length === 0) return;

    const listingIds = filteredListings.map((listing) => listing.id).filter(Boolean);
    if (listingIds.length === 0) return;

    supabase.rpc('increment_search_count_bulk', { p_listing_ids: listingIds })
  .then(({ data, error }) => {
    if (error) {
      console.error('🚨 ERRO DO SUPABASE NO SEARCH_COUNT:', error);
    } else {
      console.log('✅ SUCESSO! Buscas incrementadas para os IDs:', listingIds);
    }
  });
  }, [filteredListings, searchTerm]);

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
        className="group relative flex flex-col bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300"
        style={{ textDecoration: 'none', color: 'inherit' }}
      >
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
      {/* HEADER AJUSTADO */}
      <header className="main-header border-b border-slate-200 shadow-sm bg-white sticky top-0 z-30 h-16">
        <div className="max-w-7xl mx-auto flex items-center w-full px-4 h-full relative">
          
          {/* Esquerda: Botão Voltar */}
          <div className="flex-1 flex justify-start">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors shrink-0">
              <ArrowLeft className="h-5 w-5" />
              <span className="hidden sm:inline font-medium text-sm">Voltar</span>
            </button>
          </div>

          {/* Centro: Logo (Absolute Center) */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex justify-center">
            <img src="/assets/logo_service.png" alt="ServiCE" className="h-8 sm:h-9 cursor-pointer" onClick={() => navigate('/')} />
          </div>

          {/* Direita: Espaço Vazio para equilibrar (Ícone de perfil removido) */}
          <div className="flex-1 flex justify-end"></div>

        </div>
      </header>

      {/* HERO DE BUSCA */}
      <section style={{ backgroundColor: '#f0fafa', borderBottom: '1px solid #e2e8f0', padding: '40px 16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          <div style={{ width: '100%', maxWidth: '680px' }}>
            <h1 style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
              Encontre o que você precisa
            </h1>
            <p style={{ textAlign: 'center', fontSize: '0.875rem', color: '#64748b', marginBottom: '24px' }}>
              Pesquise produtos e serviços próximos a você
            </p>

          <form className="flex flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
            {/* BARRA DE BUSCA */}
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

            {/* FILTROS AVANÇADOS */}
            {showAdvancedFilters && (
              <div ref={advancedFiltersRef} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg relative z-20">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800">Filtros avançados</h3>
                  <Button type="button" variant="ghost" onClick={() => setShowAdvancedFilters(false)} className="h-8 w-8 rounded-full p-0 text-slate-400 hover:text-slate-700">
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Categoria</span>
                    <select
                      value={filters.categoryId}
                      onChange={(e) => setFilters((c) => ({ ...c, categoryId: e.target.value }))}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-[#0A847C] focus:bg-white"
                    >
                      <option value="">Todas as categorias</option>
                      {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
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
        ) : !isSearchActive ? (
          /* NADA DIGITADO E NENHUM FILTRO */
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-3xl">⌨️</div>
            <h2 className="text-lg font-semibold text-slate-700">Comece sua busca</h2>
            <p className="text-sm text-slate-400 max-w-xs">
              Digite o que você procura ou aplique um filtro para encontrar serviços e produtos.
            </p>
          </div>
        ) : filteredListings.length > 0 ? (
          <>
            <div className="mb-6 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                <span className="font-semibold text-slate-800">{filteredListings.length}</span> anúncio(s) encontrado(s)
                {filters.categoryId && categories.find(c => String(c.id) === String(filters.categoryId)) && (
                  <span className="ml-1 text-[#0A847C] font-medium">
                    em {categories.find(c => String(c.id) === String(filters.categoryId))?.name}
                  </span>
                )}
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
              Tente ajustar os filtros ou buscar por outro termo.
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

export default SearchListings;