import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Search, MapPin } from 'lucide-react';
import { supabase } from '../supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import '../css/global.css';

const normalizeText = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const CategoryProducts = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();

  const [listings, setListings] = useState([]);
  const [categoryName, setCategoryName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // ─── Busca dados da categoria + anúncios ─────────────────────────────────
  useEffect(() => {
    const fetchCategoryProducts = async () => {
      try {
        setLoading(true);
        setError('');

        const { data: categoryData, error: categoryError } = await supabase
          .from('categories')
          .select('name')
          .eq('id', categoryId)
          .single();

        if (categoryError) throw categoryError;
        setCategoryName(categoryData?.name || 'Categoria');

        const { data, error: listingsError } = await supabase
          .from('listings')
          .select(`
            id,
            title,
            description,
            price,
            image_urls,
            address_text,
            category:categories(name),
            created_at
          `)
          .eq('category_id', categoryId)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (listingsError) throw listingsError;
        setListings(data || []);
      } catch (fetchError) {
        console.error('Erro ao carregar anúncios:', fetchError);
        setError(fetchError.message || 'Não foi possível carregar os anúncios.');
        setListings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryProducts();
  }, [categoryId]);

  // ─── Filtragem local por busca ────────────────────────────────────────────
  const filteredListings = useMemo(() => {
    const query = normalizeText(searchTerm.trim());
    if (!query) return listings;
    return listings.filter((listing) =>
      normalizeText(listing.title).includes(query) ||
      normalizeText(listing.description).includes(query)
    );
  }, [listings, searchTerm]);

  // ─── Card de anúncio (mesmo design do Search.jsx) ────────────────────────
  const renderListingCard = (listing) => {
    const imageUrl =
      Array.isArray(listing.image_urls) && listing.image_urls.length > 0
        ? listing.image_urls[0]
        : null;
    const title = listing.title || 'Anúncio sem título';
    const priceValue = Number(listing.price ?? 0);
    const catName = listing.category?.name || categoryName || 'Categoria';

    return (
      <Link
        to={`/detalhes/${listing.id}`}
        key={listing.id}
        className="group relative flex flex-col bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300"
        style={{ textDecoration: 'none', color: 'inherit' }}
      >
        {/* Badge de categoria */}
        <div className="absolute top-3 left-3 z-10 inline-flex items-center rounded bg-white/95 px-2 py-0.5 backdrop-blur-sm shadow-sm">
          <span className="text-[10px] font-bold text-[#0A847C] uppercase tracking-wider">
            {catName.slice(0, 15)}
          </span>
        </div>

        {/* Imagem */}
        <div className="aspect-square w-full bg-slate-100 relative overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-4xl text-slate-300">📷</div>
          )}
        </div>

        {/* Conteúdo */}
        <div className="flex flex-col flex-grow p-4">
          <h3 className="line-clamp-2 text-sm font-medium text-slate-900 leading-tight group-hover:text-[#0A847C] transition-colors">
            {title}
          </h3>

          <div className="mt-3 text-lg font-bold text-slate-900">
            R$ {priceValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>

          {listing.address_text && (
            <div className="mt-auto pt-3 flex items-center gap-1.5 text-xs text-slate-500">
              <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
              <span className="truncate">{listing.address_text}</span>
            </div>
          )}
        </div>
      </Link>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white">

      {/* ── HEADER (mesmo do Search.jsx) ── */}
      <header className="main-header border-b border-slate-200 shadow-sm bg-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center gap-4 px-4 sm:px-6 py-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="hidden sm:inline font-medium text-sm">Voltar</span>
          </button>
          <img
            src="/assets/logo_service.png"
            alt="ServiCE"
            className="h-9 cursor-pointer"
            onClick={() => navigate('/')}
          />
        </div>
      </header>

      {/* ── HERO DE BUSCA (mesmo estilo inline do Search.jsx) ── */}
      <section style={{ backgroundColor: '#f0fafa', borderBottom: '1px solid #e2e8f0', padding: '40px 16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          <div style={{ width: '100%', maxWidth: '680px' }}>
            <h1 style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
              {loading ? 'Carregando...' : categoryName}
            </h1>
            <p style={{ textAlign: 'center', fontSize: '0.875rem', color: '#64748b', marginBottom: '24px' }}>
              {loading
                ? ''
                : `${filteredListings.length} anúncio${filteredListings.length !== 1 ? 's' : ''} disponível${filteredListings.length !== 1 ? 's' : ''} nesta categoria`}
            </p>

            {/* Barra de busca */}
            <form onSubmit={(e) => e.preventDefault()}>
              <div className="flex gap-2 rounded-2xl border border-slate-200 bg-white shadow-sm p-1.5 focus-within:border-[#0A847C]/60 focus-within:shadow-md transition-all">
                <Input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={`Buscar em ${categoryName || 'categorias'}...`}
                  className="h-10 border-0 bg-transparent px-3 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 flex-1"
                />
                <Button
                  type="submit"
                  className="h-10 gap-2 rounded-xl bg-[#0A847C] px-5 text-white hover:bg-[#085a51] shrink-0"
                >
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline">Buscar</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* ── RESULTADOS (mesmo estilo do Search.jsx) ── */}
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
            {searchTerm.trim() && (
              <div className="mb-6">
                <p className="text-sm text-slate-500">
                  <span className="font-semibold text-slate-800">{filteredListings.length}</span> resultado(s) para{' '}
                  <span className="text-[#0A847C] font-medium">"{searchTerm.trim()}"</span>
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {filteredListings.map(renderListingCard)}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-3xl">🔍</div>
            <h2 className="text-lg font-semibold text-slate-700">Nenhum anúncio encontrado</h2>
            <p className="text-sm text-slate-400 max-w-xs">
              {searchTerm.trim()
                ? `Nenhum resultado para "${searchTerm.trim()}". Tente outro termo.`
                : 'Ainda não há anúncios disponíveis nesta categoria.'}
            </p>
            {searchTerm.trim() && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-2 text-sm font-medium text-[#0A847C] hover:underline"
              >
                Limpar busca
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default CategoryProducts;
