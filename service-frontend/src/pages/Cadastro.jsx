import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import '../css/login.css';

const Cadastro = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const navigate = useNavigate();

  // Login/Cadastro com Google
  const handleGoogleSignUp = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (error) {
      alert("Erro ao cadastrar com Google: " + error.message);
    }
  };

  // Cadastro Tradicional via Backend Node.js
  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("As senhas não coincidem!");
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao criar conta');

      alert(`Sucesso! Um e-mail de confirmação foi enviado para ${email}.`);
      navigate('/login');
    } catch (error) {
      alert(error.message);
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
        <h2 className="login-title">Criar Conta</h2>
        
        <form onSubmit={handleRegister}>
          <div className="input-group">
            <label>Nome Completo</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="input-group">
            <label>E-mail</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="input-group">
            <label>Senha</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="input-group">
            <label>Confirmar Senha</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn-primary">Cadastrar</button>
        </form>

        <div className="divider">ou</div>

        <button type="button" className="btn-google" onClick={handleGoogleSignUp}>
          <img src="https://www.gstatic.com/images/branding/product/2x/googleg_48dp.png" alt="Google" />
          Cadastrar com Google
        </button>

        <p className="register-link">
          Já tem uma conta? <Link to="/login">Entrar</Link>
        </p>
      </div>
    </div>
  );
};

export default Cadastro;