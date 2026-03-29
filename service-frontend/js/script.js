// ==========================================
// 1. LÓGICA DE USUÁRIO (LOGIN / AVATAR)
// ==========================================
const userStorage = localStorage.getItem('service_user');
const btnLoginNav = document.getElementById('btn-login-nav');
const userAvatar = document.getElementById('user-avatar');

// Se existe um usuário salvo na memória do navegador:
if (userStorage) {
  // Esconde o botão de entrar
  if (btnLoginNav) btnLoginNav.style.display = 'none';
  // Mostra o avatar do usuário
  if (userAvatar) userAvatar.style.display = 'block';

  // Configura a função de Logout (Sair) ao clicar na foto
  if (userAvatar) {
    userAvatar.addEventListener('click', () => {
      if(confirm('Deseja sair da sua conta?')) {
        localStorage.removeItem('service_user'); // Apaga o usuário da memória
        window.location.reload(); // Recarrega a página (o botão volta a aparecer)
      }
    });
  }
}

// ==========================================
// 2. LÓGICA DAS CATEGORIAS (COMUNICAÇÃO API)
// ==========================================
const grid = document.getElementById('category-grid');
const loadingMsg = document.getElementById('loading-msg');
const errorMsg = document.getElementById('error-msg');

async function loadCategories() {
  try {
    const response = await fetch('http://localhost:3000/api/categories');
    
    if (!response.ok) {
      throw new Error(`Falha na requisição: ${response.status}`);
    }

    const categories = await response.json();

    if (loadingMsg) loadingMsg.style.display = 'none';

    categories.forEach(cat => {
      const card = document.createElement('div');
      card.className = 'category-card';
      card.innerHTML = `<h4 class="category-name">${cat.name}</h4>`;
      
      if (grid) grid.appendChild(card);
    });

  } catch (error) {
    console.error("Erro ao carregar dados do backend:", error);
    if (loadingMsg) loadingMsg.style.display = 'none';
    if (errorMsg) {
      errorMsg.style.display = 'block';
      errorMsg.textContent = "Não foi possível carregar as categorias. O servidor backend está rodando?";
    }
  }
}


loadCategories();