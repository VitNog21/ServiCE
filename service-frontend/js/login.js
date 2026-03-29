document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault(); 

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    // Fazendo a chamada REAL para o nosso Backend Node.js
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erro ao fazer login');
    }

    // Pegando o nome que vem do Supabase (se existir) e salvando na memória
    const userName = data.user.user_metadata?.name || 'Usuário';
    const userData = { email: email, name: userName };
    
    localStorage.setItem('service_user', JSON.stringify(userData));
    localStorage.setItem('service_token', data.token); // O token de segurança!

    window.location.href = 'index.html'; // Volta pra home

  } catch (error) {
    alert(error.message); // Exibe "Email ou senha incorretos"
  }
});