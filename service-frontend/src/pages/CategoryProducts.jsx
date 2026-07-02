import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Search, SlidersHorizontal, X, MapPin, ArrowLeft } from 'lucide-react';
import { supabase } from '../supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import '../css/global.css';

const SORT_OPTIONS = [
  { label: 'Mais recentes', value: 'newest' },
  { label: 'Menor preço', value: 'price-asc' },
  { label: 'Maior preço', value: 'price-desc' },
];

const normalizeText = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

const CategoryProducts = () => {
  // Blindagem de Rota: Pega o ID independente de como o App.jsx enviou
  const params = useParams();
  const activeCategoryId = params.categoryId || params.id;
  const navigate = useNavigate();

  const [categoryName, setCategoryName] = useState('');
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const advancedFiltersRef = useRef(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ minPrice: '', maxPrice: '', sortBy: 'newest' });
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({ minPrice: '', maxPrice: '', sortBy: 'newest' });

  const resetAdvancedFilters = () => {
    const resetState = { minPrice: '', maxPrice: '', sortBy: 'newest' };
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

  // ==========================================
  // BUSCA NO BANCO DE DADOS (CORRIGIDA)
  // ==========================================
  useEffect(() => {
    if (!activeCategoryId) return;

    // 1. Busca o nome da Categoria para o Header
    const fetchCategoryName = async () => {
      const { data } = await supabase.from('categories').select('name').eq('id', activeCategoryId).single();
      if (data) setCategoryName(data.name);
    };

    // 2. Busca os anúncios EXATOS daquela categoria direto da tabela (Sem RPC)
    const fetchListings = async () => {
      setLoading(true);
      setError('');
      try {
        const { data, error } = await supabase
          .from('listings')
          .select(`id, title, description, price, image_urls, category_id, category:categories(name), address_text, created_at`)
          .eq('status', 'active')
          .eq('category_id', activeCategoryId);

        if (error) throw error;
        
        console.log("Anúncios encontrados para a categoria:", data); // Log para debug no F12
        setListings(data || []);
      } catch (err) {
        console.error("Erro ao buscar anúncios:", err);
        setError('Não foi possível carregar os anúncios desta categoria.');
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryName();
    fetchListings();
  }, [activeCategoryId]);

  // Fecha modal ao clicar fora
  useEffect(() => {
    const handlePointerDown = (event) => {
      if (showAdvancedFilters && advancedFiltersRef.current && !advancedFiltersRef.current.contains(event.target)) {
        setShowAdvancedFilters(false);
      }
    };
    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [showAdvancedFilters]);

  // ==========================================
  // FILTRO E ORDENAÇÃO LOCAL
  // ==========================================
  const filteredListings = useMemo(() => {
    const query = normalizeText(appliedSearchTerm.trim());
    const minPrice = Number(appliedFilters.minPrice);
    const maxPrice = Number(appliedFilters.maxPrice);

    const filtered = listings.filter((listing) => {
      const searchableText = normalizeText(`${listing.title} ${listing.description} ${listing.address_text}`);
      const price = Number(listing.price || 0);

      if (query && !searchableText.includes(query)) return false;
      if (appliedFilters.minPrice !== '' && price < minPrice) return false;
      if (appliedFilters.maxPrice !== '' && price > maxPrice) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      const priceA = Number(a.price || 0);
      const priceB = Number(b.price || 0);
      
      switch (appliedFilters.sortBy) {
        case 'price-asc': return priceA - priceB;
        case 'price-desc': return priceB - priceA;
        case 'newest': 
        default: 
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
    });
  }, [appliedFilters, listings, appliedSearchTerm]);

  const activeFiltersCount = [appliedFilters.minPrice, appliedFilters.maxPrice, appliedFilters.sortBy !== 'newest'].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-white">
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
        </div>
      </header>

      <section style={{ backgroundColor: '#f0fafa', borderBottom: '1px solid #e2e8f0', padding: '40px 16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          <div style={{ width: '100%', maxWidth: '680px' }}>
            <h1 style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
              Explorar <span className="text-[#0A847C]">{categoryName || 'Categoria'}</span>
            </h1>
            <p style={{ textAlign: 'center', fontSize: '0.875rem', color: '#64748b', marginBottom: '24px' }}>
              Pesquise produtos e serviços disponíveis nesta seção
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
                    <h3 className="text-sm font-semibold text-slate-800">Filtros de Preço e Ordem</h3>
                    <Button type="button" variant="ghost" onClick={() => setShowAdvancedFilters(false)} className="h-8 w-8 rounded-full p-0 text-slate-400 hover:text-slate-700">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-1.5">
                      <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Preço Mínimo (R$)</span>
                      <Input
                        type="number" min="0" step="0.01"
                        value={filters.minPrice}
                        onChange={(e) => setFilters((c) => ({ ...c, minPrice: e.target.value }))}
                        placeholder="Ex: 50"
                        className="h-10 rounded-xl border-slate-200 bg-slate-50 text-sm focus-visible:ring-[#0A847C] focus:bg-white"
                      />
                    </label>

                    <label className="space-y-1.5">
                      <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Preço Máximo (R$)</span>
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
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {filteredListings.map((listing) => (
                <Link to={`/detalhes/${listing.id}`} key={listing.id} className="group relative flex flex-col bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300">
                  <div className="aspect-square w-full bg-slate-100 relative overflow-hidden">
                    {listing.image_urls && listing.image_urls.length > 0 ? (
                      <img src={listing.image_urls[0]} alt={listing.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-4xl text-slate-300">📷</div>
                    )}
                  </div>
                  <div className="flex flex-col flex-grow p-4">
                    <h3 className="line-clamp-2 text-sm font-medium text-slate-900 leading-tight group-hover:text-[#0A847C] transition-colors">
                      {listing.title}
                    </h3>
                    <div className="mt-3 text-lg font-bold text-slate-900">
                      R$ {Number(listing.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    {listing.address_text && (
                      <div className="mt-auto pt-3 flex items-center gap-1.5 text-xs text-slate-500">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{listing.address_text}</span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-3xl">🔍</div>
            <h2 className="text-lg font-semibold text-slate-700">Nenhum anúncio encontrado</h2>
            <p className="text-sm text-slate-400 max-w-xs">
              Tente ajustar os filtros de preço ou buscar por outro termo.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default CategoryProducts;