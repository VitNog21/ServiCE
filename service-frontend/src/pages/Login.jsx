import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import '../css/login.css';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // 1. Login com Email e Senha (VIA SUPABASE)
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Login efetuado com sucesso!' });
      
      // Removemos lixo antigo do localStorage por segurança
      localStorage.removeItem('service_user'); 
      
      setTimeout(() => navigate('/'), 1000);
    } catch (error) {
      console.error('Erro no login:', error.message);
      setMessage({ type: 'error', text: 'Email ou senha incorretos.' });
    } finally {
      setLoading(false);
    }
  };

  // 2. Login com Google (VIA SUPABASE OAUTH)
  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // Usa a origem exata do seu navegador para redirecionar de volta
          redirectTo: window.location.origin
        }
      });

      if (error) throw error;
    } catch (error) {
      console.error('Erro no Google Login:', error.message);
      setMessage({ type: 'error', text: 'Erro ao conectar com o Google.' });
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        
        {/* LOGO DO SITE */}
        <img 
          src="/assets/logo_service.png" 
          alt="ServiCE" 
          className="login-logo" 
          onClick={() => navigate('/')}
        />
        
        <h2 className="login-title">Acesse sua conta</h2>
        
        {message.text && (
          <div className={`alert alert-${message.type}`}>{message.text}</div>
        )}

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              disabled={loading}
              placeholder="seu@email.com"
            />
          </div>

          <div className="input-group">
            <label>Senha</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              disabled={loading}
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'A entrar...' : 'Entrar'}
          </button>
        </form>

        {/* TODO: Reativar Google OAuth quando o Supabase tiver a redirect URL configurada
        <div className="divider">ou</div>
        <button type="button" className="btn-google" onClick={handleGoogleLogin} disabled={loading}>
          Entrar com Google
        </button>
        */}

        <p className="register-link">
          Não tem conta? <Link to="/cadastro">Cadastre-se aqui</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;