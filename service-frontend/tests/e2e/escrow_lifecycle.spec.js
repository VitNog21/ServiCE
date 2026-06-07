import { test, expect } from '@playwright/test';

/**
 * História de Usuário: Ciclo de Vida do Anúncio e Fluxo de Garantia (Escrow)
 * Como usuário, quero ter segurança de que itens vendidos não podem ser comprados novamente
 * e que o pagamento só é finalizado após minha confirmação.
 */
test.describe('Garantia ServiCE e Ciclo de Vida do Produto', () => {

  test.beforeEach(async ({ page }) => {
    // Navega para a URL base (definida no config como http://localhost:5173)
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Cenário 1: Bloqueio de compra para usuário não autenticado', async ({ page }) => {
    // Localizador por role garante acessibilidade e robustez
    const firstProduct = page.locator('a[href*="detalhes"], .listing-card').first();
    
    if (await firstProduct.isVisible()) {
      await firstProduct.click();
      
      // Valida redirecionamento para detalhes
      await expect(page).toHaveURL(/.*detalhes/);

      // Procura o botão de compra pelo texto (insensível a maiúsculas/minúsculas)
      const buyButton = page.getByRole('button', { name: /Comprar Agora/i });
      await expect(buyButton).toBeVisible();
      
      // Ação: Tenta comprar sem estar logado
      await buyButton.click();
      
      // Asserção: Deve ser redirecionado para a trava de segurança (Login)
      await expect(page).toHaveURL(/.*login/);
    }
  });

  test('Cenário 2: Integridade de Item Vendido (Sold Status)', async ({ page }) => {
    // Localiza especificamente um item marcado como Vendido
    const soldBadge = page.getByText(/Vendido/i).first();
    
    if (await soldBadge.isVisible()) {
      await soldBadge.click();

      // Valida se a mensagem de alerta de item vendido aparece na tela de detalhes
      await expect(page.getByText(/Este item já foi vendido/i)).toBeVisible();
      
      // Valida se o botão principal de compra está desativado (Prevenção de dupla venda)
      const buyButton = page.getByRole('button', { name: /Vendido/i });
      await expect(buyButton).toBeDisabled();
      
      // Valida se o botão de chat também está desativado para itens finalizados
      const chatButton = page.getByRole('button', { name: /Conversar pelo Chat/i });
      await expect(chatButton).toBeDisabled();
    }
  });

  test('Cenário 3: Proteção de Acesso à Gestão de Pedidos', async ({ page }) => {
    // Tenta forçar entrada na URL de pedidos (Escrow)
    await page.goto('/meus-pedidos');
    
    // Asserção: Valida que a aplicação protege dados sensíveis redirecionando visitantes
    await expect(page).toHaveURL(/.*login/);
  });

  test('Cenário 4: Responsividade da Busca Crítica', async ({ page }) => {
    // Simula dispositivo móvel para teste de usabilidade
    await page.setViewportSize({ width: 375, height: 812 });
    
    const searchInput = page.getByPlaceholder(/Estou procurando por/i);
    await expect(searchInput).toBeVisible();
    
    // Valida se a busca mantém funcionalidade em telas menores
    await searchInput.fill('Limpeza');
    await page.keyboard.press('Enter');
    
    await expect(page.getByText(/Filtrando por:/i)).toBeVisible();
  });

});
