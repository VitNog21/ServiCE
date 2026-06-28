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
              placeholder="Seu nome"
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

        {/* TODO: Reativar Google OAuth quando o Supabase tiver a redirect URL configurada
        <div className="divider">ou</div>
        <button type="button" className="btn-google" onClick={handleGoogleRegister} disabled={loading}>
          Cadastrar com Google
        </button>
        */}

        <p className="register-link">
          Já tem conta? <Link to="/login">Entre aqui</Link>
        </p>
      </div>
    </div>
  );
};

export default Cadastro;