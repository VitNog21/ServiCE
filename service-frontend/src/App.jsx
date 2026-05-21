import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home'; // Ajustado para H maiúsculo
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
import Search from './pages/Search';
import { ToastProvider } from './components/ui/toast';

function App() {
  return (
    <ToastProvider>
      <Router>
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
        </Routes>
      </Router>
    </ToastProvider>
  );
}

export default App;