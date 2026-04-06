import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import '../css/login.css'; // Usamos o mesmo CSS do Login para manter o padrão visual!

const Cadastro = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // 1. Cadastro com Email e Senha (VIA SUPABASE)
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name, // Guarda o nome nos metadados para o Perfil usar depois
            name: name
          }
        }
      });

      if (error) throw error;

      // Se o email já existir no Supabase, ele não dá erro diretamente (por segurança), 
      // mas devolve um array de identidades vazio. Vamos tratar isso:
      if (data?.user && data.user.identities && data.user.identities.length === 0) {
        setMessage({ type: 'error', text: 'Este email já está cadastrado. Faça login.' });
        setLoading(false);
        return;
      }

      setMessage({ type: 'success', text: 'Conta criada com sucesso! A redirecionar...' });
      
      // Limpeza de segurança
      localStorage.removeItem('service_user');

      setTimeout(() => navigate('/'), 2000);
    } catch (error) {
      console.error('Erro no cadastro:', error.message);
      setMessage({ type: 'error', text: 'Erro ao criar conta. A senha deve ter pelo menos 6 caracteres.' });
    } finally {
      setLoading(false);
    }
  };

  // 2. Cadastro com Google (Usa a mesma função do Login)
  const handleGoogleRegister = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });

      if (error) throw error;
    } catch (error) {
      console.error('Erro no Google Register:', error.message);
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
        
        <h2 className="login-title">Crie sua conta</h2>
        
        {message.text && (
          <div className={`alert alert-${message.type}`}>{message.text}</div>
        )}

        <form onSubmit={handleRegister}>
          <div className="input-group">
            <label>Nome Completo</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
              disabled={loading}
              placeholder="João Silva"
            />
          </div>

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
              placeholder="Mínimo 6 caracteres"
              minLength="6"
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'A criar conta...' : 'Cadastrar'}
          </button>
        </form>

        <div className="divider">ou</div>

        {/* BOTÃO GOOGLE COM SVG OFICIAL */}
        <button type="button" className="btn-google" onClick={handleGoogleRegister} disabled={loading}>
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ width: '20px', height: '20px' }}>
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
            <path fill="#4285F4" d="M46.64 24.32c0-1.63-.15-3.26-.44-4.84H24v9.03h12.72c-.53 2.84-2.14 5.25-4.59 6.81l7.41 5.74c4.35-4.01 6.81-9.92 6.81-16.74z"></path>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.41-5.74c-2.22 1.48-5.07 2.36-8.48 2.36-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
            <path fill="none" d="M0 0h48v48H0z"></path>
          </svg>
          Cadastrar com Google
        </button>

        <p className="register-link">
          Já tem conta? <Link to="/login">Entre aqui</Link>
        </p>
      </div>
    </div>
  );
};

export default Cadastro;