import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import '../css/login.css';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Garantir que a pessoa tem uma sessão ativa (injetada pelo link do Supabase)
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setMessage({
          type: 'error',
          text: 'Sessão expirada ou inválida. Solicite um novo link de recuperação.'
        });
      }
    };
    checkSession();
  }, []);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
      setMessage({ type: 'error', text: 'A senha deve ter pelo menos 6 caracteres.' });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas não coincidem.' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setMessage({
        type: 'success',
        text: 'Senha alterada com sucesso! Redirecionando para o login...'
      });

      // Desloga o usuário da sessão temporária
      await supabase.auth.signOut();

      setTimeout(() => {
        navigate('/login');
      }, 2500);

    } catch (error) {
      console.error('Erro ao redefinir senha:', error.message);
      setMessage({
        type: 'error',
        text: 'Erro ao redefinir a senha. Tente novamente ou peça um novo link.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <img 
          src="/assets/logo_service.png" 
          alt="ServiCE" 
          className="login-logo" 
          onClick={() => navigate('/')}
        />
        
        <h2 className="login-title">Nova Senha</h2>
        
        {message.text && (
          <div className={`alert alert-${message.type}`}>{message.text}</div>
        )}

        <form onSubmit={handleUpdatePassword}>
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
      </div>
    </div>
  );
};

export default ResetPassword;
