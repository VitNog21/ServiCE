import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase'; // O arquivo que criamos com as chaves VITE_
import '../css/login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  // 1. Lógica para Login Tradicional (Conecta no seu Node.js)
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao entrar');

      // Salva os dados do usuário vindo do seu Backend
      localStorage.setItem('service_user', JSON.stringify(data.user));
      localStorage.setItem('service_token', data.token);
      
      navigate('/');
    } catch (error) {
      alert(error.message);
    }
  };

  // 2. Lógica para Login com Google (Conecta direto no Supabase)
  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // Garante que ele volte para a sua Home após o login
          redirectTo: window.location.origin 
        }
      });
      if (error) throw error;
    } catch (error) {
      alert("Erro ao autenticar com Google: " + error.message);
    }
  };

  return (
    <div className="login-body">
      <div className="login-card">
        <img 
          src="/assets/logo_service.png" 
          alt="ServiCE" 
          className="login-logo" 
          onClick={() => navigate('/')} 
        />
        <h2 className="login-title">Entrar no ServiCE</h2>
        
        {/* Formulário de E-mail/Senha */}
        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>E-mail</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>
          <div className="input-group">
            <label>Senha</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>
          <button type="submit" className="btn-primary">Entrar</button>
        </form>

        <div className="divider">ou</div>

        {/* Botão do Google atualizado */}
        <button 
          type="button" 
          className="btn-google" 
          onClick={handleGoogleLogin}
        >
          <img src="https://www.gstatic.com/images/branding/product/2x/googleg_48dp.png" alt="Google" />
          Entrar com Google
        </button>

        <p className="register-link">
          Não tem conta? <Link to="/cadastro">Cadastre-se</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;