// Captura os elementos do HTML onde vamos injetar os dados
const grid = document.getElementById('category-grid');
const loadingMsg = document.getElementById('loading-msg');
const errorMsg = document.getElementById('error-msg');

// Função assíncrona para buscar as categorias do backend Node.js
async function loadCategories() {
  try {
    // Faz a requisição para a nossa API na porta 3000
    const response = await fetch('http://localhost:3000/api/categories');
    
    // Se a resposta não for OK (ex: erro 500 do servidor)
    if (!response.ok) {
      throw new Error(`Falha na requisição: ${response.status}`);
    }

    // Converte a resposta para JSON
    const categories = await response.json();

    // Remove a mensagem de carregamento
    loadingMsg.style.display = 'none';

    // Para cada categoria que veio do banco, cria um card no HTML
    categories.forEach(cat => {
      const card = document.createElement('div');
      card.className = 'category-card';
      // Injeta o nome da categoria no card
      card.innerHTML = `<h4 class="category-name">${cat.name}</h4>`;
      
      // Adiciona o card dentro do nosso grid na tela
      grid.appendChild(card);
    });

  } catch (error) {
    console.error("Erro ao carregar dados do backend:", error);
    loadingMsg.style.display = 'none';
    errorMsg.style.display = 'block';
    errorMsg.textContent = "Não foi possível carregar as categorias. O servidor backend está rodando?";
  }
}

// Executa a função automaticamente quando a página carregar
loadCategories();