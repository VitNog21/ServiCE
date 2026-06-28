import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { supabase } from './supabase';
import Home from './pages/Home';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';
import EditProfile from './pages/EditProfile';
import CreateListing from './pages/CreateListing';
import MyListings from './pages/MyListings';
import ProductDetails from './pages/ProductDetails';
import CategoryProducts from './pages/CategoryProducts';
import Chat from './pages/Chat';
import DashboardAdmin from './pages/DashboardAdmin';
import CompletarLocalizacao from './pages/CompletarLocalizacao';
import Checkout from './pages/Checkout';
import Success from './pages/Success';
import Failure from './pages/Failure';
import Search from './pages/Search';
import { ToastProvider } from './components/ui/toast';
import MyOrders from './pages/MyOrders';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Componente auxiliar para escutar eventos de autenticação do Supabase
function AuthListener() {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Quando o Supabase detecta que o usuário clicou no link de recuperação de senha do email
      if (event === 'PASSWORD_RECOVERY') {
        console.log('PASSWORD_RECOVERY event triggered, navigating to /recuperar-senha');
        navigate('/recuperar-senha');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return null;
}

function App() {
  return (
    <ToastProvider>
      <Router>
        <AuthListener />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/busca" element={<Search />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/perfil" element={<EditProfile />} />
          <Route path="/criar-anuncio" element={<CreateListing />} />
          <Route path="/editar-anuncio/:listingId" element={<CreateListing />} />
          <Route path="/meus-anuncios" element={<MyListings />} />
          <Route path="/detalhes/:id" element={<ProductDetails />} />
          <Route path="/categoria/:categoryId" element={<CategoryProducts />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/chat/:listingId/:receiverId" element={<Chat />} />
          <Route path="/admin" element={<DashboardAdmin />} />
          <Route path="/completar-localizacao" element={<CompletarLocalizacao />} />
          <Route path="/checkout/:orderId" element={<Checkout />} />
          <Route path="/sucesso" element={<Success />} />
          <Route path="/falha" element={<Failure />} />
          <Route path="/meus-pedidos" element={<MyOrders />} />
          <Route path="/esqueci-senha" element={<ForgotPassword />} />
          <Route path="/recuperar-senha" element={<ResetPassword />} />
        </Routes>
      </Router>
    </ToastProvider>
  );
}

export default App;