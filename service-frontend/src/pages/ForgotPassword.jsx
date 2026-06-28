import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import '../css/login.css';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [step, setStep] = useState(1); // 1 = Digitar Email, 2 = Digitar Código OTP + Nova Senha
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // ETAPA 1: Solicitar Código de Recuperação (Via OTP de e-mail)
  const handleRequestCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Usamos signInWithOtp que por padrão envia o código de 6 dígitos ao e-mail
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false // Não cria uma nova conta se o e-mail não existir
        }
      });

      if (error) throw error;

      setMessage({
        type: 'success',
        text: 'Código enviado! Verifique seu e-mail (caixa de entrada e spam).'
      });
      setStep(2); // Avança para o passo de digitar o código
    } catch (error) {
      console.error('Erro ao solicitar código de login OTP:', error.message);
      setMessage({
        type: 'error',
        text: 'Erro ao solicitar código. Verifique se o e-mail está correto e cadastrado.'
      });
    } finally {
      setLoading(false);
    }
  };

  // ETAPA 2: Confirmar OTP e Definir Nova Senha
  const handleVerifyOtpAndReset = async (e) => {
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
      // 1. Validar o código OTP enviado ao e-mail (tipo 'email' para signInWithOtp)
      const { error: otpError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email'
      });

      if (otpError) throw otpError;

      // 2. Com a sessão autenticada, atualizar/definir a senha do usuário
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) throw updateError;

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
      console.error('Erro ao processar alteração com OTP:', error.message);
      setMessage({
        type: 'error',
        text: 'Código inválido ou expirado. Tente novamente ou solicite um novo código.'
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

        {step === 1 ? (
          <>
            <p style={{ color: 'var(--gray-500)', fontSize: '14px', marginBottom: '24px', textAlign: 'center', lineHeight: '1.5' }}>
              Digite o seu e-mail cadastrado. Enviaremos um código de 6 dígitos para você redefinir sua senha.
            </p>

            <form onSubmit={handleRequestCode}>
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
                {loading ? 'Enviando...' : 'Enviar Código de Recuperação'}
              </button>
            </form>
          </>
        ) : (
          <>
            <p style={{ color: 'var(--gray-500)', fontSize: '14px', marginBottom: '24px', textAlign: 'center', lineHeight: '1.5' }}>
              Insira o código de 6 dígitos enviado para <strong>{email}</strong> e escolha sua nova senha.
            </p>

            <form onSubmit={handleVerifyOtpAndReset}>
              <div className="input-group">
                <label>Código de 6 dígitos</label>
                <input 
                  type="text" 
                  value={token} 
                  onChange={(e) => setToken(e.target.value)} 
                  required 
                  disabled={loading}
                  placeholder="000000"
                  maxLength="6"
                  style={{ textAlign: 'center', fontSize: '20px', letterSpacing: '0.3em' }}
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

              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <button 
                  type="button" 
                  onClick={handleRequestCode} 
                  disabled={loading}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: 'var(--green-700)', 
                    fontWeight: '600', 
                    cursor: 'pointer', 
                    fontSize: '14px',
                    transition: 'opacity 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.opacity = '0.8'}
                  onMouseOut={(e) => e.target.style.opacity = '1'}
                >
                  Não recebeu o código? Reenviar código
                </button>
              </div>
            </form>
          </>
        )}

        <p className="register-link">
          Lembrou a senha? <Link to="/login">Entre aqui</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
