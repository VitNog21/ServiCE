import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { supabase } from './supabase'; // Certifique-se de que o caminho está correto
import Home from './pages/Home'; // Ajustado para H maiúsculo
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';
import EditProfile from './pages/EditProfile';
import CreateListing from './pages/CreateListing';
import MyListings from './pages/MyListings';
import ProductDetails from './pages/ProductDetails';
import CategoryProducts from './pages/CategoryProducts';
import Chat from './pages/Chat';

function App() {
// ... resto do código ...
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/perfil" element={<EditProfile />} />
        <Route path="/criar-anuncio" element={<CreateListing />} />
        <Route path="/meus-anuncios" element={<MyListings />} />
        <Route path="/detalhes/:id" element={<ProductDetails />} />
        <Route path="/categoria/:categoryId" element={<CategoryProducts />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/chat/:listingId/:receiverId" element={<Chat />} />
      </Routes>
    </Router>
  );
}

export default App;