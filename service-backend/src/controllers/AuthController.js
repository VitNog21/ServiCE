import { supabase } from '../config/supabase.js';

class AuthController {
  // Função para CRIAR a conta
  async register(req, res) {
    const { name, email, password } = req.body;

    try {
      // Cria o usuário na tabela de Autenticação do Supabase
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: { name: name } // Salva o nome junto
        }
      });

      if (error) throw error;

      res.status(201).json({ message: 'Usuário criado com sucesso!', user: data.user });
    } catch (error) {
      console.error("Erro no cadastro:", error);
      res.status(400).json({ error: error.message });
    }
  }

  // Função para FAZER LOGIN
  async login(req, res) {
    const { email, password } = req.body;

    try {
      // Tenta logar no Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) throw error;

      res.status(200).json({ 
        message: 'Login realizado com sucesso!', 
        user: data.user,
        token: data.session.access_token 
      });
    } catch (error) {
      console.error("Erro no login:", error);
      res.status(401).json({ error: 'E-mail ou senha incorretos!' });
    }
  }
}

export default new AuthController();