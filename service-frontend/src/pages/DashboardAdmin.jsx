import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { 
  Users, LayoutList, AlertOctagon, TrendingUp, ArrowLeft, LogOut, Settings, ShieldAlert, CheckCircle, XCircle
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';
import '../css/global.css';

// Cores para o gráfico de pizza (Categorias)
const COLORS = ['#0A847C', '#10B981', '#3B82F6', '#F59E0B', '#6366F1', '#EC4899'];

export default function DashboardAdmin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState(null);
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalListings: 0,
    pendingReports: 0,
    activeListings: 0,
    totalSold: 0
  });

  const [recentReports, setRecentReports] = useState([]);
  
  // Estados para os Gráficos
  const [userChartData, setUserChartData] = useState([]);
  const [salesChartData, setSalesChartData] = useState([]);
  const [reportsChartData, setReportsChartData] = useState([]);
  const [categoryChartData, setCategoryChartData] = useState([]);

  useEffect(() => {
    checkAdminAccessAndLoadData();
  }, []);

  // Função auxiliar para agrupar dados por mês (Janeiro a Dezembro)
  const groupDataByMonth = (dataArray, dateField = 'created_at') => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const grouped = months.map(m => ({ name: m, total: 0 }));
    
    if (dataArray) {
      dataArray.forEach(item => {
        const date = new Date(item[dateField]);
        grouped[date.getMonth()].total += 1;
      });
    }
    // Retorna apenas os meses até o mês atual para o gráfico não ficar vazio no futuro
    const currentMonth = new Date().getMonth();
    return grouped.slice(0, currentMonth + 1);
  };

  const checkAdminAccessAndLoadData = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return navigate('/login');

      const { data: profile } = await supabase.from('profiles').select('role, full_name, avatar_url').eq('id', user.id).single();
      if (!profile || profile.role !== 'admin') return navigate('/');
      setAdminUser(profile);

      // 1. CARREGAR MÉTRICAS DOS CARDS (Top)
      const [
        { count: usersCount },
        { count: listingsCount },
        { count: activeListingsCount },
        { count: soldCount },
        { count: reportsCount }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('listings').select('*', { count: 'exact', head: true }),
        supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'sold'),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      ]);

      setStats({
        totalUsers: usersCount || 0,
        totalListings: listingsCount || 0,
        activeListings: activeListingsCount || 0,
        totalSold: soldCount || 0,
        pendingReports: reportsCount || 0
      });

      // 2. CARREGAR DADOS PARA OS GRÁFICOS
      
      // Evolução de Usuários
      const { data: usersData } = await supabase.from('profiles').select('created_at');
      setUserChartData(groupDataByMonth(usersData));

      // Evolução de Vendas (Lendo exatamente os que o dono marcou como 'sold')
      const { data: soldData } = await supabase.from('listings').select('created_at').eq('status', 'sold');
      setSalesChartData(groupDataByMonth(soldData));

      // Evolução de Denúncias
      const { data: reportsEvolutionData } = await supabase.from('reports').select('created_at');
      setReportsChartData(groupDataByMonth(reportsEvolutionData));

      // Categorias mais populares (Join de listings com categories)
      const { data: catData } = await supabase.from('listings').select('category:categories(name)');
      if (catData) {
        const catCounts = {};
        catData.forEach(item => {
          const catName = item.category?.name || 'Sem Categoria';
          catCounts[catName] = (catCounts[catName] || 0) + 1;
        });
        const formattedCatData = Object.keys(catCounts).map(key => ({
          name: key,
          value: catCounts[key]
        })).sort((a, b) => b.value - a.value).slice(0, 5); // Pega o Top 5
        setCategoryChartData(formattedCatData);
      }

      // 3. CARREGAR DENÚNCIAS RECENTES (Tabela)
      const { data: reportsData } = await supabase
        .from('reports')
        .select('id, reason, status, created_at, reporter:reporter_id(full_name), listing:listing_id(title, id)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentReports(reportsData || []);

    } catch (error) {
      console.error('Erro ao carregar dashboard admin:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#0A847C] border-t-transparent"></div>
          <p className="text-slate-500 font-medium">Analisando dados do marketplace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl z-10 sticky top-0 h-screen">
        <div className="p-6 flex items-center justify-center border-b border-slate-800">
          <img src="/assets/logo_service.png" alt="ServiCE" className="h-8 brightness-0 invert opacity-90" />
          <span className="ml-2 text-xs font-bold uppercase tracking-widest text-red-400">Admin</span>
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
          <Link to="/admin" className="flex items-center gap-3 rounded-lg bg-[#0A847C] px-4 py-3 text-white transition-colors">
            <TrendingUp size={20} />
            <span className="font-medium">Visão Geral</span>
          </Link>
          <button className="w-full flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-slate-800 hover:text-white transition-colors text-left opacity-50 cursor-not-allowed" title="Em breve">
            <ShieldAlert size={20} />
            <span className="font-medium">Moderação</span>
          </button>
          <button className="w-full flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-slate-800 hover:text-white transition-colors text-left opacity-50 cursor-not-allowed" title="Em breve">
            <Users size={20} />
            <span className="font-medium">Usuários</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button onClick={() => navigate('/')} className="w-full flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
            <span className="font-medium">Voltar ao Site</span>
          </button>
          <button onClick={handleLogout} className="w-full mt-2 flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-red-900/50 text-red-400 hover:text-red-300 transition-colors">
            <LogOut size={20} />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Dashboard Administrativo</h1>
            <p className="text-slate-500 mt-1">Acompanhe as métricas, vendas e crescimento da plataforma.</p>
          </div>
          <button className="p-2 text-slate-400 hover:text-slate-600 bg-white rounded-full shadow-sm border border-slate-200">
            <Settings size={24} />
          </button>
        </header>

        {/* CARDS DE MÉTRICAS RÁPIDAS */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total de Usuários</h3>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Users size={24} /></div>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.totalUsers}</p>
            <p className="text-sm text-blue-600 font-medium mt-2 flex items-center gap-1">Registrados na base</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Anúncios Ativos</h3>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><LayoutList size={24} /></div>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.activeListings}</p>
            <p className="text-sm text-slate-500 font-medium mt-2">De {stats.totalListings} criados no total</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm border-l-4 border-l-[#0A847C]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Serviços Vendidos</h3>
              <div className="p-2 bg-[#0A847C]/10 text-[#0A847C] rounded-lg"><CheckCircle size={24} /></div>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.totalSold}</p>
            <p className="text-sm text-[#0A847C] font-medium mt-2 flex items-center gap-1">
              <TrendingUp size={16} /> Marcados como concluídos
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Denúncias</h3>
              <div className="p-2 bg-red-50 text-red-600 rounded-lg"><AlertOctagon size={24} /></div>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.pendingReports}</p>
            <p className="text-sm text-red-500 font-medium mt-2">Pendentes de moderação</p>
          </div>
        </div>

        {/* ÁREA DE GRÁFICOS */}
        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          
          {/* Gráfico 1: Vendas (Serviços Concluídos) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Evolução de Vendas / Conclusões</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B'}} allowDecimals={false} />
                  <Tooltip cursor={{fill: '#F1F5F9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="total" name="Serviços Vendidos" fill="#0A847C" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico 2: Evolução de Cadastros */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Crescimento de Usuários</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={userChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B'}} allowDecimals={false} />
                  <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Line type="monotone" dataKey="total" name="Novos Usuários" stroke="#3B82F6" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico 3: Categorias Mais Populares */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Top Categorias (Mais Anúncios)</h3>
            <div className="h-64 w-full">
              {categoryChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({name, percent}) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400">Sem dados de categoria</div>
              )}
            </div>
          </div>

          {/* Gráfico 4: Evolução de Denúncias */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Volume de Denúncias Recebidas</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={reportsChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B'}} allowDecimals={false} />
                  <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Line type="step" dataKey="total" name="Denúncias" stroke="#EF4444" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* TABELA DE DENÚNCIAS RECENTES */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4 flex justify-between items-center bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-900">Moderação de Denúncias Pendentes</h2>
          </div>
          
          {recentReports.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <ShieldAlert className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <p>Nenhuma denúncia pendente de moderação no momento.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Anúncio</th>
                    <th className="px-6 py-3 font-semibold">Motivo da Denúncia</th>
                    <th className="px-6 py-3 font-semibold">Denunciante</th>
                    <th className="px-6 py-3 font-semibold text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentReports.map((report) => (
                    <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">
                        <Link to={`/detalhes/${report.listing?.id}`} className="hover:text-[#0A847C] hover:underline" target="_blank">
                          {report.listing?.title || 'Anúncio Excluído'}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                          {report.reason}
                        </span>
                      </td>
                      <td className="px-6 py-4">{report.reporter?.full_name || 'Usuário'}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Ignorar (Falso Alarme)">
                            <CheckCircle size={18} />
                          </button>
                          <button className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Deletar Anúncio">
                            <XCircle size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}