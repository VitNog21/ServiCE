import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../css/login.css';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Fallback seguro caso a Vercel não tenha a variável de ambiente injetada
  const API_URL = import.meta.env.VITE_API_URL || 'https://service-uakj.onrender.com';

  const handleResetPasswordDirect = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
      setMessage({ type: 'error', text: 'A nova senha deve ter pelo menos 6 caracteres.' });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas não coincidem.' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Chama o backend diretamente usando privilégios Admin do Supabase
      const response = await fetch(`${API_URL}/api/auth/reset-password-direct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao redefinir a senha.');
      }

      setMessage({
        type: 'success',
        text: 'Senha redefinida com sucesso! Redirecionando para o login...'
      });

      setTimeout(() => {
        navigate('/login');
      }, 2500);

    } catch (error) {
      console.error('Erro ao processar redefinição direta:', error.message);
      setMessage({
        type: 'error',
        text: error.message || 'Erro de conexão com o servidor.'
      });
    } finally {
      setLoading(false);
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
        
        <h2 className="login-title">Recuperar Senha</h2>
        
        {message.text && (
          <div className={`alert alert-${message.type}`}>{message.text}</div>
        )}

        <p style={{ color: 'var(--gray-500)', fontSize: '14px', marginBottom: '24px', textAlign: 'center', lineHeight: '1.5' }}>
          Digite o seu e-mail cadastrado e defina sua nova senha. A alteração será aplicada instantaneamente sem a necessidade de e-mail de confirmação.
        </p>

        <form onSubmit={handleResetPasswordDirect}>
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
            <label>Nova Senha</label>
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

          <div className="input-group">
            <label>Confirmar Nova Senha</label>
            <input 
              type="password" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              required 
              disabled={loading}
              placeholder="Digite a senha novamente"
              minLength="6"
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Redefinindo...' : 'Atualizar Senha'}
          </button>
        </form>

        <p className="register-link">
          Lembrou a senha? <Link to="/login">Entre aqui</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
