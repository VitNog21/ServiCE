import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { 
  Users, LayoutList, AlertOctagon, TrendingUp, ArrowLeft, LogOut, Settings, 
  ShieldAlert, CheckCircle, XCircle, Trash2, UserX, Search, Calendar, DollarSign, Filter,
  Menu, X
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import '../css/global.css';

const COLORS = ['#0F6E56', '#1a8a6d', '#3B82F6', '#F59E0B', '#6366F1', '#EC4899', '#8B5CF6', '#EF4444'];
const STATUS_COLORS = { active: '#0F6E56', paused: '#F59E0B', sold: '#052e1c', inactive: '#EF4444' };
const REPORT_COLORS = { pending: '#F59E0B', resolved: '#10B981', dismissed: '#64748B' };

export default function DashboardAdmin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // ==========================================
  // ESTADO MOBILE (UI)
  // ==========================================
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // ==========================================
  // FILTROS (DATA E CATEGORIA)
  // ==========================================
  const [dateFilter, setDateFilter] = useState('all'); // all, 30d, 6m, 1y
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [categoriesDropdown, setCategoriesDropdown] = useState([]);

  // ==========================================
  // ESTADOS DOS KPIS E GRÁFICOS
  // ==========================================
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeListings: 0,
    totalSold: 0,
    totalGMV: 0,
    pendingReports: 0
  });

  const [chartsData, setChartsData] = useState({
    usersEvolution: [],
    salesVolume: [],
    revenueEvolution: [],
    listingsByCategory: [],
    avgPriceByCategory: [],
    listingsByStatus: [],
    reportsEvolution: [],
    reportsByStatus: []
  });

  const [allReports, setAllReports] = useState([]);
  const [searchUserTerm, setSearchUserTerm] = useState('');
  const [usersList, setUsersList] = useState([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [selectedUserForDetails, setSelectedUserForDetails] = useState(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isBanModalOpen, setIsBanModalOpen] = useState(false);
  const [isCheckingBan, setIsCheckingBan] = useState(false);
  const [banModalData, setBanModalData] = useState({ ownerId: null, acceptedReports: 0 });

  useEffect(() => {
    checkAdminAccessAndLoadCategories();
  }, []);

  // Recarrega os dados do dashboard sempre que um filtro mudar
  useEffect(() => {
    if (adminUser) loadDashboardData();
  }, [dateFilter, categoryFilter, adminUser]);

  const checkAdminAccessAndLoadCategories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return navigate('/login');

      const { data: profile } = await supabase.from('profiles').select('role, full_name, avatar_url').eq('id', user.id).single();
      
      // SUPER ADMIN OVERRIDE (Temporário para validação)
      const isSuperAdmin = user.email === 'jgborges80@gmail.com';
      
      if (!profile || (profile.role !== 'admin' && !isSuperAdmin)) return navigate('/');
      setAdminUser(profile || { full_name: 'Super Admin', role: 'admin' });

      const { data: cats } = await supabase.from('categories').select('id, name');
      setCategoriesDropdown(cats || []);

    } catch (error) {
      console.error('Erro de acesso:', error);
    }
  };

  // ==========================================
  // FUNÇÃO MESTRE: CARREGA DADOS E MONTA GRÁFICOS
  // ==========================================
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Lógica de Filtros de Data
      let startDate = null;
      if (dateFilter === '30d') startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      if (dateFilter === '6m') startDate = new Date(new Date().setMonth(new Date().getMonth() - 6));
      if (dateFilter === '1y') startDate = new Date(new Date().setFullYear(new Date().getFullYear() - 1));

      // 2. Buscando Dados (Anúncios, Usuários, Denúncias)
      let listingsQuery = supabase.from('listings').select('id, price, status, created_at, category_id, category:categories(name)');
      let usersQuery = supabase.from('profiles').select('id, created_at');
      let reportsQuery = supabase.from('reports').select('id, status, created_at, reason');

      // Aplicando Filtro de Categoria (Apenas para anúncios)
      if (categoryFilter !== 'all') {
        listingsQuery = listingsQuery.eq('category_id', categoryFilter);
      }

      // Aplicando Filtro de Data
      if (startDate) {
        const isoDate = startDate.toISOString();
        listingsQuery = listingsQuery.gte('created_at', isoDate);
        usersQuery = usersQuery.gte('created_at', isoDate);
        reportsQuery = reportsQuery.gte('created_at', isoDate);
      }

      const [ { data: listings }, { data: users }, { data: reports } ] = await Promise.all([
        listingsQuery, usersQuery, reportsQuery
      ]);

      const safeListings = listings || [];
      const safeUsers = users || [];
      const safeReports = reports || [];

      // 3. Calculando KPIs
      const soldListings = safeListings.filter(l => l.status === 'sold');
      const totalGmv = soldListings.reduce((acc, l) => acc + (Number(l.price) || 0), 0);

      setStats({
        totalUsers: safeUsers.length,
        activeListings: safeListings.filter(l => l.status === 'active').length,
        totalSold: soldListings.length,
        totalGMV: totalGmv,
        pendingReports: safeReports.filter(r => r.status === 'pending').length
      });

      // 4. Agrupadores de Data para Gráficos
      const groupDataByMonth = (dataArray, valueCallback = () => 1) => {
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const grouped = months.map(m => ({ name: m, total: 0 }));
        dataArray.forEach(item => {
          const mIndex = new Date(item.created_at).getMonth();
          grouped[mIndex].total += valueCallback(item);
        });
        return grouped.slice(0, new Date().getMonth() + 1); // Corta até o mês atual
      };

      // 5. Montando os 8 Gráficos
      
      // Gráfico 1: Evolução de Usuários (Linha)
      const usersEvo = groupDataByMonth(safeUsers);
      
      // Gráfico 2: Volume de Vendas (Barras)
      const salesVol = groupDataByMonth(soldListings);
      
      // Gráfico 3: Receita Mensal - GMV (Área)
      const revenueEvo = groupDataByMonth(soldListings, (item) => Number(item.price) || 0);

      // Gráfico 4: Categorias mais populares (Pizza)
      const catCounts = {};
      safeListings.forEach(l => {
        const catName = l.category?.name || 'Sem Categoria';
        catCounts[catName] = (catCounts[catName] || 0) + 1;
      });
      const listingsByCat = Object.entries(catCounts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);

      // Gráfico 5: Preço Médio por Categoria (Barras Horizontais)
      const catPrices = {};
      safeListings.forEach(l => {
        const catName = l.category?.name || 'Sem Categoria';
        if (!catPrices[catName]) catPrices[catName] = { sum: 0, count: 0 };
        catPrices[catName].sum += (Number(l.price) || 0);
        catPrices[catName].count += 1;
      });
      const avgPriceByCat = Object.entries(catPrices)
        .map(([name, data]) => ({ name, media: Math.round(data.sum / data.count) }))
        .sort((a,b) => b.media - a.media)
        .slice(0, 7);

      // Gráfico 6: Status dos Anúncios (Donut)
      const statusCounts = { active: 0, paused: 0, sold: 0, inactive: 0 };
      safeListings.forEach(l => { if (statusCounts[l.status] !== undefined) statusCounts[l.status] += 1; });
      const listingsStatus = [
        { name: 'Ativos', value: statusCounts.active, fill: STATUS_COLORS.active },
        { name: 'Pausados', value: statusCounts.paused, fill: STATUS_COLORS.paused },
        { name: 'Vendidos', value: statusCounts.sold, fill: STATUS_COLORS.sold },
        { name: 'Banidos/Inativos', value: statusCounts.inactive, fill: STATUS_COLORS.inactive }
      ].filter(item => item.value > 0);

      // Gráfico 7: Volume de Denúncias (Linha)
      const reportsEvo = groupDataByMonth(safeReports);

      // Gráfico 8: Status das Denúncias (Pizza)
      const repStatusCount = { pending: 0, resolved: 0, dismissed: 0 };
      safeReports.forEach(r => { if(repStatusCount[r.status] !== undefined) repStatusCount[r.status] += 1; });
      const reportsStatus = [
        { name: 'Pendentes', value: repStatusCount.pending, fill: REPORT_COLORS.pending },
        { name: 'Resolvidas', value: repStatusCount.resolved, fill: REPORT_COLORS.resolved },
        { name: 'Ignoradas', value: repStatusCount.dismissed, fill: REPORT_COLORS.dismissed }
      ].filter(item => item.value > 0);

      setChartsData({
        usersEvolution: usersEvo,
        salesVolume: salesVol,
        revenueEvolution: revenueEvo,
        listingsByCategory: listingsByCat.slice(0, 6),
        avgPriceByCategory: avgPriceByCat,
        listingsByStatus: listingsStatus,
        reportsEvolution: reportsEvo,
        reportsByStatus: reportsStatus
      });

      // Carregar denúncias detalhadas para a aba Moderação
      if (activeTab === 'moderation' || allReports.length === 0) {
        const { data: repDetails } = await supabase
          .from('reports')
          .select('id, reason, status, created_at, reporter:reporter_id(full_name), listing:listing_id(title, id, owner_id)')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        setAllReports(repDetails || []);
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Funções de formatação
  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const handleSearchUsers = async (e) => {
    e.preventDefault();
    if (!searchUserTerm.trim()) { setUsersList([]); return; }
    setIsSearchingUsers(true);
    try {
      const { data } = await supabase.from('profiles').select('id, full_name, avatar_url, created_at, role').ilike('full_name', `%${searchUserTerm}%`).order('created_at', { ascending: false }).limit(20);
      setUsersList(data || []);
    } catch (err) {} finally { setIsSearchingUsers(false); }
  };

  const openUserDetails = async (user) => {
    setSelectedUserForDetails(null);
    setIsUserModalOpen(true);
    try {
      const { data: listings } = await supabase.from('listings').select('id, status').eq('owner_id', user.id);
      const listingIds = listings ? listings.map(l => l.id) : [];
      let reports = [];
      if (listingIds.length > 0) {
        const { data: reportsData } = await supabase.from('reports').select('id, status').in('listing_id', listingIds);
        reports = reportsData || [];
      }
      setSelectedUserForDetails({
        ...user,
        totalListings: listings?.length || 0,
        soldListings: listings?.filter(l => l.status === 'sold').length || 0,
        deletedByMod: listings?.filter(l => l.status === 'inactive').length || 0,
        totalReportsAgainst: reports.length,
        acceptedReports: reports.filter(r => r.status === 'resolved').length
      });
    } catch (err) {}
  };

  const handleDismissReport = async (reportId) => {
    if (!window.confirm('Ignorar esta denúncia (Alarme Falso)?')) return;
    try {
      await supabase.from('reports').update({ status: 'dismissed' }).eq('id', reportId);
      setAllReports(prev => prev.filter(r => r.id !== reportId));
      loadDashboardData();
    } catch (error) {}
  };

  const handleDeleteListing = async (reportId, listingId) => {
    if (!window.confirm('BANIR este anúncio da plataforma?')) return;
    try {
      await supabase.from('listings').update({ status: 'inactive' }).eq('id', listingId);
      await supabase.from('reports').update({ status: 'resolved' }).eq('id', reportId);
      setAllReports(prev => prev.filter(r => r.id !== reportId));
      loadDashboardData();
    } catch (error) {}
  };

  const handleInitiateBan = async (ownerId) => {
    if (!ownerId) return;
    setIsCheckingBan(true);
    setIsBanModalOpen(true);
    setBanModalData({ ownerId, acceptedReports: 0 });
    try {
      const { data: ownerListings } = await supabase.from('listings').select('id').eq('owner_id', ownerId);
      let acceptedCount = 0;
      if (ownerListings && ownerListings.length > 0) {
        const { data: reports } = await supabase.from('reports').select('id').in('listing_id', ownerListings.map(l => l.id)).eq('status', 'resolved');
        acceptedCount = reports ? reports.length : 0;
      }
      setBanModalData({ ownerId, acceptedReports: acceptedCount });
    } catch (err) {} finally { setIsCheckingBan(false); }
  };

  const handleConfirmBanUser = () => {
    alert("⚠️ AÇÃO RESTRITA!\n\nServidor Backend necessário para exclusão de Auth (Entrega 4).");
    setIsBanModalOpen(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading && !adminUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--gray-50)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--green-700)] border-t-transparent"></div>
          <p className="text-[var(--gray-600)] font-medium">Verificando credenciais...</p>
        </div>
      </div>
    );
  }

  if (!adminUser) return null;

  return (
    <div className="flex h-screen bg-[var(--gray-50)] font-sans overflow-hidden">
      
      {/* OVERLAY MOBILE PARA BARRA LATERAL */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR LATERAL RESPONSIVA */}
      <aside className={`w-64 bg-[var(--gray-900)] text-slate-300 flex flex-col shadow-xl z-40 fixed md:sticky top-0 h-screen transition-transform duration-300 ease-in-out md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center justify-between md:justify-center border-b border-slate-800">
          <div className="flex items-center">
            <img src="/assets/logo_service.png" alt="ServiCE" className="h-8 brightness-0 invert opacity-90" />
            <span className="ml-2 text-xs font-bold uppercase tracking-widest text-red-400">Admin</span>
          </div>
          <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={24} />
          </button>
        </div>
        <div className="p-6 flex flex-col items-center border-b border-slate-800">
          {adminUser?.avatar_url ? (
            <img src={adminUser.avatar_url} alt="Admin" className="h-16 w-16 rounded-full border-2 border-slate-700 object-cover" />
          ) : (
            <div className="h-16 w-16 rounded-full bg-slate-800 flex items-center justify-center text-2xl">👤</div>
          )}
          <h3 className="mt-3 font-semibold text-white text-sm text-center">{adminUser?.full_name || 'Administrador'}</h3>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <button onClick={() => { setActiveTab('overview'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 rounded-[var(--radius-sm)] px-4 py-3 transition-colors text-left ${activeTab === 'overview' ? 'bg-[var(--green-700)] text-white' : 'hover:bg-slate-800 hover:text-white'}`}>
            <TrendingUp size={20} /> <span className="font-medium">Visão Geral</span>
          </button>
          <button onClick={() => { setActiveTab('moderation'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center justify-between rounded-[var(--radius-sm)] px-4 py-3 transition-colors text-left ${activeTab === 'moderation' ? 'bg-[var(--green-700)] text-white' : 'hover:bg-slate-800 hover:text-white'}`}>
            <div className="flex items-center gap-3"><ShieldAlert size={20} /> <span className="font-medium">Moderação</span></div>
            {stats.pendingReports > 0 && <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{stats.pendingReports}</span>}
          </button>
          <button onClick={() => { setActiveTab('users'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 rounded-[var(--radius-sm)] px-4 py-3 transition-colors text-left ${activeTab === 'users' ? 'bg-[var(--green-700)] text-white' : 'hover:bg-slate-800 hover:text-white'}`}>
            <Users size={20} /> <span className="font-medium">Buscar Usuários</span>
          </button>
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button onClick={() => navigate('/')} className="w-full flex items-center gap-3 rounded-[var(--radius-sm)] px-4 py-3 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={20} /> <span className="font-medium">Voltar ao Site</span>
          </button>
          <button onClick={handleLogout} className="w-full mt-2 flex items-center gap-3 rounded-[var(--radius-sm)] px-4 py-3 hover:bg-red-900/50 text-red-400 hover:text-red-300 transition-colors">
            <LogOut size={20} /> <span className="font-medium">Sair</span>
          </button>
        </div>
      </aside>

      {/* ÁREA DO CONTEÚDO PRINCIPAL COM SCROLL INDEPENDENTE */}
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        
        {/* HEADER MOBILE */}
        <div className="md:hidden flex items-center justify-between bg-white p-4 border-b border-[var(--gray-200)] shadow-sm z-20">
          <div className="flex items-center gap-2">
            <img src="/assets/logo_service.png" alt="ServiCE" className="h-6" />
            <span className="text-xs font-bold uppercase tracking-widest text-red-500">Admin</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(true)} className="text-[var(--gray-600)] hover:text-[var(--gray-900)]">
            <Menu size={24} />
          </button>
        </div>

        {/* CONTEÚDO DA PÁGINA */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          
          {/* CABEÇALHO E FILTROS */}
          <header className="mb-6 md:mb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[var(--gray-900)]">
                {activeTab === 'overview' && 'Inteligência de Negócio'}
                {activeTab === 'moderation' && 'Central de Moderação'}
                {activeTab === 'users' && 'Diretório de Usuários'}
              </h1>
              <p className="text-[var(--gray-600)] mt-1 text-sm md:text-base">
                {activeTab === 'overview' && 'Acompanhe as 8 principais métricas de saúde do marketplace.'}
                {activeTab === 'moderation' && 'Analise denúncias, exclua anúncios falsos e bana infratores.'}
                {activeTab === 'users' && 'Busque perfis e analise o histórico completo de cada anunciante.'}
              </p>
            </div>

            {activeTab === 'overview' && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white p-2 rounded-[var(--radius-md)] shadow-sm border border-[var(--gray-200)]">
                <div className="flex items-center gap-2 px-2 py-1 sm:py-0 border-b sm:border-b-0 sm:border-r border-[var(--gray-100)]">
                  <Calendar size={16} className="text-[var(--gray-400)] shrink-0" />
                  <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="bg-transparent border-0 text-sm font-medium text-[var(--gray-600)] focus:ring-0 cursor-pointer w-full">
                    <option value="all">Todo o período</option>
                    <option value="30d">Últimos 30 dias</option>
                    <option value="6m">Últimos 6 meses</option>
                    <option value="1y">Último 1 ano</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 px-2 py-1 sm:py-0">
                  <Filter size={16} className="text-[var(--gray-400)] shrink-0" />
                  <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="bg-transparent border-0 text-sm font-medium text-[var(--gray-600)] focus:ring-0 cursor-pointer w-full sm:max-w-[150px]">
                    <option value="all">Todas as categorias</option>
                    {categoriesDropdown.map(cat => (
                      <option key={cat.id} value={cat.id} className="truncate">{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </header>

          {loading ? (
            <div className="flex h-64 items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-4 border-[var(--green-700)] border-t-transparent"></div></div>
          ) : (
            <>
              {/* =========================================================
                  ABA: VISÃO GERAL (OS 8 GRÁFICOS)
                  ========================================================= */}
              {activeTab === 'overview' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  
                  {/* 6 KPIS PRINCIPAIS */}
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-8">
                    <div className="rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-white p-5 shadow-sm">
                      <p className="text-xs font-semibold text-[var(--gray-400)] uppercase">Montante Vendido (GMV)</p>
                      <p className="text-2xl font-bold text-[var(--green-700)] mt-2">{formatCurrency(stats.totalGMV)}</p>
                    </div>
                    <div className="rounded-[var(--radius-md)] border border-blue-100 bg-blue-50 p-5 shadow-sm">
                      <p className="text-xs font-semibold text-blue-700 uppercase">Comissão da Plataforma (10%)</p>
                      <p className="text-2xl font-bold text-blue-900 mt-2">{formatCurrency(stats.totalGMV * 0.10)}</p>
                    </div>
                    <div className="rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-white p-5 shadow-sm">
                      <p className="text-xs font-semibold text-[var(--gray-400)] uppercase">Serviços Concluídos</p>
                      <p className="text-2xl font-bold text-[var(--gray-900)] mt-2">{stats.totalSold}</p>
                    </div>
                    <div className="rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-white p-5 shadow-sm">
                      <p className="text-xs font-semibold text-[var(--gray-400)] uppercase">Anúncios Ativos</p>
                      <p className="text-2xl font-bold text-[var(--gray-900)] mt-2">{stats.activeListings}</p>
                    </div>
                    <div className="rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-white p-5 shadow-sm">
                      <p className="text-xs font-semibold text-[var(--gray-400)] uppercase">Total de Usuários</p>
                      <p className="text-2xl font-bold text-[var(--gray-900)] mt-2">{stats.totalUsers}</p>
                    </div>
                    <div className="rounded-[var(--radius-md)] border border-red-100 bg-red-50 p-5 shadow-sm">
                      <p className="text-xs font-semibold text-red-600 uppercase">Atenção (Denúncias)</p>
                      <p className="text-2xl font-bold text-red-700 mt-2">{stats.pendingReports}</p>
                    </div>
                  </div>

                  {/* OS 8 GRÁFICOS */}
                  <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 mb-8">
                    
                    {/* Gráfico 1: Receita Mensal */}
                    <div className="rounded-[var(--radius-lg)] border border-[var(--gray-200)] bg-white p-4 md:p-6 shadow-sm w-full min-w-0">
                      <h3 className="text-sm font-bold text-[var(--gray-900)] mb-6 uppercase tracking-wide">1. Receita Gerada por Mês (GMV)</h3>
                      <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartsData.revenueEvolution}>
                          <defs><linearGradient id="colorGmv" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0F6E56" stopOpacity={0.3}/><stop offset="95%" stopColor="#0F6E56" stopOpacity={0}/></linearGradient></defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} />
                          <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `R$${val}`} width={60} />
                          <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{borderRadius: '8px', border: 'none'}} />
                          <Area type="monotone" dataKey="total" name="Receita" stroke="#0F6E56" fillOpacity={1} fill="url(#colorGmv)" />
                        </AreaChart>
                      </ResponsiveContainer></div>
                    </div>

                    {/* Gráfico 2: Evolução de Vendas */}
                    <div className="rounded-[var(--radius-lg)] border border-[var(--gray-200)] bg-white p-4 md:p-6 shadow-sm w-full min-w-0">
                      <h3 className="text-sm font-bold text-[var(--gray-900)] mb-6 uppercase tracking-wide">2. Serviços Concluídos por Mês</h3>
                      <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartsData.salesVolume}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} />
                          <YAxis axisLine={false} tickLine={false} allowDecimals={false} width={40} />
                          <Tooltip contentStyle={{borderRadius: '8px', border: 'none'}} />
                          <Bar dataKey="total" name="Serviços Vendidos" fill="#1a8a6d" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer></div>
                    </div>

                    {/* Gráfico 3: Crescimento de Usuários */}
                    <div className="rounded-[var(--radius-lg)] border border-[var(--gray-200)] bg-white p-4 md:p-6 shadow-sm w-full min-w-0">
                      <h3 className="text-sm font-bold text-[var(--gray-900)] mb-6 uppercase tracking-wide">3. Entrada de Novos Usuários</h3>
                      <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartsData.usersEvolution}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} />
                          <YAxis axisLine={false} tickLine={false} allowDecimals={false} width={40} />
                          <Tooltip contentStyle={{borderRadius: '8px', border: 'none'}} />
                          <Line type="monotone" dataKey="total" name="Novos Cadastros" stroke="#3B82F6" strokeWidth={3} dot={{r: 4}} />
                        </LineChart>
                      </ResponsiveContainer></div>
                    </div>

                    {/* Gráfico 4: Status dos Anúncios */}
                    <div className="rounded-[var(--radius-lg)] border border-[var(--gray-200)] bg-white p-4 md:p-6 shadow-sm w-full min-w-0">
                      <h3 className="text-sm font-bold text-[var(--gray-900)] mb-6 uppercase tracking-wide">4. Distribuição de Status dos Anúncios</h3>
                      <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={chartsData.listingsByStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value" label={({name, percent}) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                            {chartsData.listingsByStatus.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                          </Pie>
                          <Tooltip contentStyle={{borderRadius: '8px', border: 'none'}} />
                        </PieChart>
                      </ResponsiveContainer></div>
                    </div>

                    {/* Gráfico 5: Top Categorias por Anúncio */}
                    <div className="rounded-[var(--radius-lg)] border border-[var(--gray-200)] bg-white p-4 md:p-6 shadow-sm w-full min-w-0">
                      <h3 className="text-sm font-bold text-[var(--gray-900)] mb-6 uppercase tracking-wide">5. Demanda por Categoria (Top 6)</h3>
                      <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={chartsData.listingsByCategory} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({name}) => name}>
                            {chartsData.listingsByCategory.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={{borderRadius: '8px', border: 'none'}} />
                        </PieChart>
                      </ResponsiveContainer></div>
                    </div>

                    {/* Gráfico 6: Ticket Médio por Categoria */}
                    <div className="rounded-[var(--radius-lg)] border border-[var(--gray-200)] bg-white p-4 md:p-6 shadow-sm w-full min-w-0">
                      <h3 className="text-sm font-bold text-[var(--gray-900)] mb-6 uppercase tracking-wide">6. Ticket Médio por Categoria</h3>
                      <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartsData.avgPriceByCategory} layout="vertical" margin={{ left: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                          <XAxis type="number" axisLine={false} tickLine={false} tickFormatter={(val) => `R$${val}`} />
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={90} />
                          <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{borderRadius: '8px', border: 'none'}} />
                          <Bar dataKey="media" name="Preço Médio" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer></div>
                    </div>

                    {/* Gráfico 7: Evolução de Denúncias */}
                    <div className="rounded-[var(--radius-lg)] border border-[var(--gray-200)] bg-white p-4 md:p-6 shadow-sm w-full min-w-0">
                      <h3 className="text-sm font-bold text-[var(--gray-900)] mb-6 uppercase tracking-wide">7. Ocorrências / Denúncias no Tempo</h3>
                      <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartsData.reportsEvolution}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} />
                          <YAxis axisLine={false} tickLine={false} allowDecimals={false} width={40} />
                          <Tooltip contentStyle={{borderRadius: '8px', border: 'none'}} />
                          <Line type="step" dataKey="total" name="Denúncias" stroke="#EF4444" strokeWidth={3} dot={false} />
                        </LineChart>
                      </ResponsiveContainer></div>
                    </div>

                    {/* Gráfico 8: Status das Denúncias */}
                    <div className="rounded-[var(--radius-lg)] border border-[var(--gray-200)] bg-white p-4 md:p-6 shadow-sm w-full min-w-0">
                      <h3 className="text-sm font-bold text-[var(--gray-900)] mb-6 uppercase tracking-wide">8. Eficiência da Moderação (Status)</h3>
                      <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={chartsData.reportsByStatus} cx="50%" cy="50%" innerRadius={40} outerRadius={80} dataKey="value" label={({name}) => name}>
                            {chartsData.reportsByStatus.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                          </Pie>
                          <Tooltip contentStyle={{borderRadius: '8px', border: 'none'}} />
                        </PieChart>
                      </ResponsiveContainer></div>
                    </div>

                  </div>
                </div>
              )}

              {/* ABA MODERAÇÃO */}
              {activeTab === 'moderation' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500 w-full">
                  <div className="rounded-[var(--radius-lg)] border border-[var(--gray-200)] bg-white shadow-sm overflow-hidden w-full">
                    <div className="border-b border-[var(--gray-200)] px-4 md:px-6 py-5 bg-[var(--gray-50)] flex justify-between items-center">
                      <h2 className="text-base md:text-lg font-bold text-[var(--gray-900)] flex items-center gap-2"><AlertOctagon className="text-red-500" />Lista de Denúncias</h2>
                      <span className="text-sm font-medium text-[var(--gray-400)]">{allReports.length} registros</span>
                    </div>
                    {allReports.length === 0 ? (
                      <div className="p-10 md:p-16 text-center text-[var(--gray-400)]"><ShieldAlert className="mx-auto h-16 w-16 text-emerald-300 mb-4" /><p className="text-xl font-semibold text-[var(--gray-600)]">Tudo limpo por aqui!</p></div>
                    ) : (
                      <div className="overflow-x-auto w-full">
                        <table className="w-full text-left text-sm text-[var(--gray-600)] min-w-[700px]">
                          <thead className="bg-[var(--gray-50)] text-xs uppercase text-[var(--gray-400)] border-b border-[var(--gray-200)]">
                            <tr><th className="px-6 py-4">Anúncio</th><th className="px-6 py-4">Motivo</th><th className="px-6 py-4">Denunciante</th><th className="px-6 py-4 text-right">Ações</th></tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--gray-100)]">
                            {allReports.map((report) => (
                              <tr key={report.id} className="hover:bg-[var(--gray-50)]">
                                <td className="px-6 py-4 font-medium text-[var(--gray-900)] max-w-[200px] truncate">{report.listing ? <Link to={`/detalhes/${report.listing.id}`} className="hover:underline">{report.listing.title}</Link> : 'Excluído'}</td>
                                <td className="px-6 py-4"><span className="inline-block rounded-[var(--radius-sm)] bg-red-50 text-red-700 px-2.5 py-1 text-xs font-semibold truncate max-w-[200px]">{report.reason}</span></td>
                                <td className="px-6 py-4">{report.reporter?.full_name || 'Anônimo'}</td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex justify-end gap-2">
                                    <button onClick={() => handleDismissReport(report.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[var(--gray-600)] bg-[var(--gray-100)] rounded-[var(--radius-sm)] hover:bg-[var(--gray-200)]"><CheckCircle size={16} /> Ignorar</button>
                                    <button onClick={() => handleDeleteListing(report.id, report.listing?.id)} disabled={!report.listing} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-[var(--radius-sm)] hover:bg-red-100 disabled:opacity-50"><Trash2 size={16} /> Apagar</button>
                                    <button onClick={() => handleInitiateBan(report.listing?.owner_id)} disabled={!report.listing} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-[var(--gray-900)] rounded-[var(--radius-sm)] hover:bg-[var(--gray-800)] disabled:opacity-50"><UserX size={16} /> Banir</button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ABA USUÁRIOS */}
              {activeTab === 'users' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500 w-full">
                  <div className="bg-white rounded-[var(--radius-lg)] border border-[var(--gray-200)] shadow-sm p-4 md:p-6 mb-6 w-full">
                    <h2 className="text-lg font-bold text-[var(--gray-900)] mb-4">Pesquisar Anunciantes</h2>
                    <form onSubmit={handleSearchUsers} className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gray-400)] h-5 w-5" />
                        <Input type="text" placeholder="Nome do usuário..." className="pl-10 h-12 bg-[var(--gray-50)] border-[var(--gray-200)] rounded-[var(--radius-md)] w-full" value={searchUserTerm} onChange={(e) => setSearchUserTerm(e.target.value)} />
                      </div>
                      <Button type="submit" className="h-12 w-full sm:w-auto px-6 bg-[var(--green-700)] hover:bg-[var(--green-800)] rounded-[var(--radius-md)] text-white">{isSearchingUsers ? 'Buscando...' : 'Pesquisar'}</Button>
                    </form>
                  </div>
                  {usersList.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {usersList.map(u => (
                        <div key={u.id} className="bg-white rounded-[var(--radius-md)] border border-[var(--gray-200)] p-4 md:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                          <div className="flex items-center gap-3 overflow-hidden w-full">
                            {u.avatar_url ? <img src={u.avatar_url} alt="Avatar" className="w-12 h-12 rounded-full object-cover flex-shrink-0" /> : <div className="w-12 h-12 rounded-full bg-[var(--gray-50)] flex items-center justify-center text-lg flex-shrink-0">👤</div>}
                            <div className="truncate"><p className="font-semibold text-[var(--gray-900)] truncate">{u.full_name || 'Sem Nome'}</p><p className="text-xs text-[var(--gray-400)]">Desde {new Date(u.created_at).getFullYear()}</p></div>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => openUserDetails(u)} className="w-full sm:w-auto text-[var(--green-700)] shrink-0">Ver Ficha</Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* MODAIS COM POSICIONAMENTO CENTRALIZADO (FIXED) */}
      <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
        <DialogContent className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[95vw] max-w-md bg-white border-0 p-0 shadow-2xl rounded-[var(--radius-lg)] overflow-hidden">
          {selectedUserForDetails ? (
            <>
              <div className="bg-[var(--gray-900)] p-6 flex flex-col items-center text-center relative">
                {selectedUserForDetails.avatar_url ? <img src={selectedUserForDetails.avatar_url} alt="Avatar" className="w-20 h-20 rounded-full border-4 border-slate-800 object-cover shadow-lg" /> : <div className="w-20 h-20 rounded-full bg-slate-800 border-4 border-slate-700 flex items-center justify-center text-3xl shadow-lg">👤</div>}
                <h2 className="text-xl font-bold text-white mt-3">{selectedUserForDetails.full_name || 'Sem Nome'}</h2>
                <div className="flex items-center gap-1 text-[var(--gray-400)] text-xs mt-1"><Calendar size={12} /> Cadastrado em {new Date(selectedUserForDetails.created_at).toLocaleDateString('pt-BR')}</div>
              </div>
              <div className="p-4 md:p-6">
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div className="bg-[var(--gray-50)] p-3 md:p-4 rounded-[var(--radius-md)] border border-[var(--gray-100)] text-center"><p className="text-[10px] md:text-xs text-[var(--gray-400)] font-semibold uppercase mb-1">Anúncios</p><p className="text-xl md:text-2xl font-bold text-[var(--gray-900)]">{selectedUserForDetails.totalListings}</p></div>
                  <div className="bg-emerald-50 p-3 md:p-4 rounded-[var(--radius-md)] border border-emerald-100 text-center"><p className="text-[10px] md:text-xs text-emerald-700 font-semibold uppercase mb-1">Vendidos</p><p className="text-xl md:text-2xl font-bold text-emerald-700">{selectedUserForDetails.soldListings}</p></div>
                  <div className="bg-red-50 p-3 md:p-4 rounded-[var(--radius-md)] border border-red-100 text-center"><p className="text-[10px] md:text-xs text-red-700 font-semibold uppercase mb-1">Denúncias</p><p className="text-xl md:text-2xl font-bold text-red-700">{selectedUserForDetails.totalReportsAgainst}</p></div>
                  <div className="bg-orange-50 p-3 md:p-4 rounded-[var(--radius-md)] border border-orange-100 text-center"><p className="text-[10px] md:text-xs text-orange-700 font-semibold uppercase mb-1">Apagados</p><p className="text-xl md:text-2xl font-bold text-orange-700">{selectedUserForDetails.deletedByMod}</p></div>
                </div>
              </div>
              <DialogFooter className="bg-[var(--gray-50)] p-4 border-t border-[var(--gray-100)] flex justify-end"><DialogClose asChild><Button variant="outline" className="w-full sm:w-auto">Fechar Ficha</Button></DialogClose></DialogFooter>
            </>
          ) : <div className="p-8 text-center text-[var(--gray-600)]">Carregando dados...</div>}
        </DialogContent>
      </Dialog>

      <Dialog open={isBanModalOpen} onOpenChange={setIsBanModalOpen}>
        <DialogContent className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[95vw] max-w-sm bg-white border-0 p-0 shadow-2xl rounded-[var(--radius-lg)] overflow-hidden">
          <div className="bg-red-50 p-6 flex flex-col items-center text-center border-b border-red-100">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4"><UserX size={32} /></div>
            <DialogTitle className="text-xl font-bold text-red-900">Banir Usuário</DialogTitle>
          </div>
          <div className="p-6 text-center">
            {isCheckingBan ? <p className="text-[var(--gray-400)]">Verificando histórico...</p> : (
              <>
                <p className="text-[var(--gray-600)] mb-4">O usuário possui <strong className="text-red-600 text-lg">{banModalData.acceptedReports}</strong> denúncias aceitas.</p>
                {banModalData.acceptedReports >= 3 ? <p className="text-sm font-medium text-red-600 bg-red-50 p-3 rounded-[var(--radius-sm)] border border-red-100">Limite atingido. Prosseguir com banimento.</p> : <p className="text-sm text-[var(--gray-600)] bg-[var(--gray-50)] p-3 rounded-[var(--radius-sm)] border border-[var(--gray-200)]">São necessárias 3 denúncias aceitas para banir ({banModalData.acceptedReports}/3).</p>}
              </>
            )}
          </div>
          <DialogFooter className="bg-[var(--gray-50)] p-4 border-t border-[var(--gray-100)] flex flex-col sm:flex-row justify-between gap-2">
            <DialogClose asChild><Button variant="outline" className="w-full">Cancelar</Button></DialogClose>
            <Button className="w-full bg-red-600 hover:bg-red-700 text-white" disabled={isCheckingBan || banModalData.acceptedReports < 3} onClick={handleConfirmBanUser}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}