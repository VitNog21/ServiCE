document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault(); 

  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

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

    alert("Quase lá! Um e-mail de confirmação foi enviado para " + email + ". Por favor, clique no link do e-mail antes de fazer o login.");
    
    // Redireciona para a tela de Login para ele entrar DEPOIS de confirmar
    window.location.href = 'login.html'; 

  } catch (error) {
    alert("Erro no cadastro: " + error.message);
  }
});