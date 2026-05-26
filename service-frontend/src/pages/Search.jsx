import { useEffect, useMemo, useState } from 'react';
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
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [userRole, setUserRole] = useState(null);
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

  // Carrega parâmetros da URL e aplica aos filtros
  useEffect(() => {
    const q = searchParams.get('q');
    const category = searchParams.get('category');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const maxDistance = searchParams.get('maxDistance');
    const sort = searchParams.get('sort');

    if (q) setSearchTerm(q);
    setFilters({
      categoryId: category || '',
      minPrice: minPrice || '',
      maxPrice: maxPrice || '',
      maxDistanceKm: maxDistance ? String(Number(maxDistance) / 1000) : '', // Converte de metros para km
      sortBy: sort || 'relevance',
    });
  }, [searchParams]);

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
      } catch (err) {}
    };
    fetchCategories();
  }, []);

  // Anúncios
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

        const { data, error } = await supabase.from('listings').select(`id, title, description, price, image_urls, category_id, category:categories(id, name), address_text, created_at`).eq('status', 'active').order('created_at', { ascending: false }).limit(50);
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

  const filteredListings = useMemo(() => {
    const query = normalizeText(searchTerm.trim());
    const minPrice = Number(filters.minPrice);
    const maxPrice = Number(filters.maxPrice);
    const maxDistanceMeters = filters.maxDistanceKm ? Number(filters.maxDistanceKm) * 1000 : null;

    // Resolve o nome da categoria selecionada a partir do ID ou do próprio valor.
    // Usa String() em ambos os lados porque c.id pode ser integer (2) enquanto
    // filters.categoryId é sempre string (HTML input sempre retorna string).
    const selectedCategoryName = filters.categoryId
      ? normalizeText(
          categories.find((c) => String(c.id) === String(filters.categoryId))?.name ?? ''
        )
      : '';

    const filtered = listings.filter((listing) => {
      const searchableText = getListingSearchableText(listing);
      const price = getListingPrice(listing);
      const distanceMeters = getListingDistanceMeters(listing);

      if (query && !searchableText.includes(query)) return false;

      // Compara por NOME da categoria (case-insensitive, sem acentos) para ser
      // robusto independente de qual tabela/RPC gerou o listing
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

  const toggleDropdown = (e) => { e.stopPropagation(); };
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
      {/* HEADER */}
      <header className="main-header border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-4 w-full px-6 py-4">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
            <ArrowLeft className="h-6 w-6" />
            <span className="hidden sm:inline font-medium">Voltar</span>
          </button>
          <img src="/assets/logo_service.png" alt="ServiCE" className="h-10 cursor-pointer" onClick={() => navigate('/')} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* BARRA DE BUSCA E FILTROS */}
        <div className="mb-8">
          <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
            <div className="flex gap-2 rounded-xl border border-slate-300 bg-slate-50 p-1 focus-within:bg-white focus-within:border-[#0A847C]/50 transition-all">
              <Input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Estou procurando por..." className="h-10 border-0 bg-transparent px-4 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 flex-1" />
              <Button type="submit" className="h-10 gap-2 rounded-lg bg-[#0A847C] px-6 text-white hover:bg-[#085a51]">
                <Search className="h-4 w-4" /> Buscar
              </Button>
              <Button type="button" onClick={() => setShowAdvancedFilters((c) => !c)} variant="outline" className="h-10 gap-2 rounded-lg border-slate-200 px-4 text-slate-600 hover:bg-slate-100">
                <SlidersHorizontal className="h-4 w-4" />
                {activeFiltersCount > 0 && <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0A847C] px-1.5 text-[10px] font-bold text-white">{activeFiltersCount}</span>}
              </Button>
            </div>

            {/* FILTROS AVANÇADOS */}
            {showAdvancedFilters && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div><h3 className="text-sm font-semibold text-slate-900">Filtros avançados</h3></div>
                  <Button type="button" variant="ghost" onClick={() => setShowAdvancedFilters(false)} className="h-8 w-8 rounded-full p-0"><X className="h-4 w-4" /></Button>
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
          </form>
        </div>

        {error && <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>}

        {/* RESULTADOS */}
        {loading ? (
          <div className="text-center py-12 text-slate-500">Carregando anúncios...</div>
        ) : filteredListings.length > 0 ? (
          <>
            <div className="mb-6 text-sm text-slate-600">
              Mostrando <span className="font-semibold">{filteredListings.length}</span> anúncio(s)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {filteredListings.map(renderListingCard)}
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-slate-500">Nenhum anúncio encontrado com os filtros selecionados.</div>
        )}
      </main>
    </div>
  );
};

export default SearchListings;
