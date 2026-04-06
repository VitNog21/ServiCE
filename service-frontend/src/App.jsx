import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { supabase } from './supabase'; // Certifique-se de que o caminho está correto
import Home from './pages/home'; // Cuidado com o "h" minúsculo se o arquivo for Home.jsx
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';
import EditProfile from './pages/EditProfile';
import CreateListing from './pages/CreateListing';
import MyListings from './pages/MyListings';

function App() {

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        console.log('✅ App.jsx: Login detetado com sucesso!', session.user.email);
      }
    });
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/perfil" element={<EditProfile />} />
        <Route path="/criar-anuncio" element={<CreateListing />} />
        <Route path="/meus-anuncios" element={<MyListings />} />
      </Routes>
    </Router>
  );
}

export default App;