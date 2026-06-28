import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import '../css/login.css';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/recuperar-senha`,
      });

      if (error) throw error;

      setMessage({
        type: 'success',
        text: 'Link de recuperação enviado! Verifique sua caixa de entrada e spam.'
      });
    } catch (error) {
      console.error('Erro ao solicitar recuperação:', error.message);
      setMessage({
        type: 'error',
        text: 'Erro ao enviar link de recuperação. Verifique o e-mail digitado.'
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
          Digite o seu e-mail cadastrado. Enviaremos um link para você redefinir sua senha.
        </p>

        <form onSubmit={handleResetPassword}>
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

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
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
