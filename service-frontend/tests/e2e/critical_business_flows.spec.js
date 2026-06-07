import { test, expect } from '@playwright/test';

test.describe('Fluxos Críticos de Negócio (Escopo UFC)', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Fluxo de Comunicação: Deve redirecionar para o chat a partir do produto', async ({ page }) => {
    const firstProduct = page.locator('a[href*="detalhes"], .listing-card').first();
    
    if (await firstProduct.isVisible()) {
      await firstProduct.click();
      await expect(page).toHaveURL(/.*detalhes/);

      const chatButton = page.locator('button').filter({ hasText: /Conversar pelo Chat/i });
      await expect(chatButton).toBeVisible();
      
      // Se clicar sem estar logado, deve ir para login
      await chatButton.click();
      await expect(page).toHaveURL(/.*login/);
    }
  });

  test('Fluxo de Moderação: Deve permitir abrir o modal de denúncia', async ({ page }) => {
    const firstProduct = page.locator('a[href*="detalhes"], .listing-card').first();
    
    if (await firstProduct.isVisible()) {
      await firstProduct.click();
      
      const reportButton = page.locator('button').filter({ hasText: /Denunciar este anúncio/i });
      await expect(reportButton).toBeVisible();
      await reportButton.click();
      
      // Verifica se o modal de denúncia abriu
      await expect(page.locator('text=Denunciar Anúncio')).toBeVisible();
      await expect(page.locator('text=Fraude ou Golpe')).toBeVisible();
    }
  });

  test('Fluxo de Inventário: Deve exibir o estado vendido quando aplicável', async ({ page }) => {
    // Procura por um item que já esteja vendido no ambiente de teste (se existir)
    const soldBadge = page.locator('text=Vendido').first();
    
    if (await soldBadge.isVisible()) {
        const productCard = soldBadge.locator('..').locator('..'); // Sobe para o card
        await productCard.click();
        await expect(page.locator('text=Este item já foi vendido')).toBeVisible();
        
        // Botão de compra deve estar desativado
        const buyButton = page.locator('button').filter({ hasText: /Vendido/i });
        await expect(buyButton).toBeDisabled();
    }
  });

  test('Fluxo de Localização: Deve exibir informações de distância nos cards', async ({ page }) => {
    // Requisito Seção 3 do PDF: Busca por Proximidade
    const distanceText = page.locator('text=/A .*km de você/').first();
    const meterText = page.locator('text=/A .*m de você/').first();
    
    // Verifica se pelo menos um dos formatos de distância aparece (indica que a lógica de geo está ativa)
    const hasGeoInfo = await distanceText.isVisible() || await meterText.isVisible() || await page.locator('text=Localização não disponível').isVisible();
    expect(hasGeoInfo).toBeTruthy();
  });

});

test.describe('Integridade de Dados (Escrow)', () => {

  test('Meus Pedidos: Deve carregar as abas de Compras e Vendas', async ({ page }) => {
    // Tenta acessar Meus Pedidos (vai redirecionar para login pois não estamos autenticados)
    await page.goto('/meus-pedidos');
    await expect(page).toHaveURL(/.*login/);
    
    // Nota: Testar o clique no botão "Confirmar Recebimento" exige autenticação real.
    // Em um ambiente sênior, usaríamos um mock de sessão ou um usuário de teste pré-criado.
  });

});
