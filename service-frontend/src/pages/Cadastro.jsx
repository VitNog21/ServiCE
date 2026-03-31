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

  // 1. Cadastro com Google (Supabase já loga automaticamente ao criar conta)
  const handleGoogleSignUp = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin // Volta para a Home
        }
      });
      if (error) throw error;
    } catch (error) {
      alert("Erro ao cadastrar com Google: " + error.message);
    }
  };

  // 2. Cadastro Tradicional (Via seu Backend Node.js)
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

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar conta');
      }

      // IMPORTANTE: Salvando os dados para o usuário já estar "logado" ao chegar na Home
      localStorage.setItem('service_user', JSON.stringify(data.user));
      localStorage.setItem('service_token', data.token);

      alert("Conta criada com sucesso! Bem-vindo ao ServiCE.");
      
      // Redireciona direto para a Home já logado
      navigate('/');
      
    } catch (error) {
      alert("Erro no cadastro: " + error.message);
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
          style={{ cursor: 'pointer' }}
        />
        <h2 className="login-title">Criar sua conta</h2>
        
        <form onSubmit={handleRegister}>
          <div className="input-group">
            <label>Nome Completo</label>
            <input 
              type="text" 
              placeholder="Digite seu nome"
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
            />
          </div>

          <div className="input-group">
            <label>E-mail</label>
            <input 
              type="email" 
              placeholder="seu@email.com"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>

          <div className="input-group">
            <label>Senha</label>
            <input 
              type="password" 
              placeholder="Mínimo 6 caracteres"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>

          <div className="input-group">
            <label>Confirmar Senha</label>
            <input 
              type="password" 
              placeholder="Repita sua senha"
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              required 
            />
          </div>

          <button type="submit" className="btn-primary">Criar Conta</button>
        </form>

        <div className="divider">ou</div>

        <button type="button" className="btn-google" onClick={handleGoogleSignUp}>
          <img 
            src="https://www.gstatic.com/images/branding/product/2x/googleg_48dp.png" 
            alt="Google" 
          />
          Cadastrar com Google
        </button>

        <p className="register-link">
          Já tem uma conta? <Link to="/login">Entrar agora</Link>
        </p>
      </div>
    </div>
  );
};

export default Cadastro;