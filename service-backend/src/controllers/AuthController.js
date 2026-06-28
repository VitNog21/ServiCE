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
  // Função para redefinir senha DIRETAMENTE (Ideal para testes e sem depender de e-mail/SMTP)
  async resetPasswordDirect(req, res) {
    const { email, password } = req.body;

    try {
      if (!email || !password) {
        return res.status(400).json({ error: 'E-mail e nova senha são obrigatórios.' });
      }

      // 1. Obter a lista de usuários usando os privilégios de Admin do backend
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) throw listError;

      // 2. Buscar o usuário correspondente ao e-mail
      const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado com esse e-mail.' });
      }

      // 3. Atualizar a senha do usuário usando o ID
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { password: password }
      );

      if (updateError) throw updateError;

      res.status(200).json({ message: 'Senha redefinida com sucesso!' });
    } catch (error) {
      console.error("Erro ao redefinir senha no backend:", error);
      res.status(500).json({ error: error.message || 'Erro interno ao redefinir senha.' });
    }
  }
}

export default new AuthController();