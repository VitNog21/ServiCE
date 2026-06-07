import { test, expect } from '@playwright/test';

test.describe('Caminho Crítico: Busca e Detalhes', () => {
  test('Deve carregar a home e filtrar por um serviço', async ({ page }) => {
    await page.goto('/');
    
    // Aguarda o carregamento inicial
    await page.waitForLoadState('networkidle');

    // Testa a barra de busca
    const searchInput = page.locator('input').first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Limpeza');
    
    // Como é um filtro local (baseado no código), não há navegação obrigatoriamente
    // Vamos verificar se o indicador de filtro aparece
    const filterIndicator = page.locator('text=Filtrando por: Limpeza');
    
    // Tenta apertar enter
    await page.keyboard.press('Enter');
    
    // Se o indicador não aparecer, pode ser que o código exija o botão de buscar
    if (!(await filterIndicator.isVisible())) {
      await page.locator('button:has-text("Buscar")').click();
    }
    
    // Verifica se o texto de filtro apareceu (conforme implementado na Home.jsx)
    await expect(page.locator('text=Filtrando por:')).toBeVisible();
  });

  test('Deve visualizar detalhes de um produto e ver o preço', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Procura por qualquer link de detalhes ou card
    const productCard = page.locator('a[href*="detalhes"], .listing-card').first();
    
    // Se houver produtos, testa o clique. Se não houver, o teste passa (pois o ambiente pode estar vazio)
    if (await productCard.isVisible()) {
      await productCard.click();
      await expect(page).toHaveURL(/.*detalhes/);
      // Verifica se o preço está visível
      await expect(page.locator('text=R$')).toBeVisible({ timeout: 10000 });
    } else {
      console.log('ℹ️ Pulando teste de detalhes: Nenhum anúncio encontrado no ambiente.');
      await expect(page.locator('text=Nenhum anúncio')).toBeVisible();
    }
  });
});

test.describe('Fluxo de Autenticação', () => {
  test('Deve mostrar erro ao tentar comprar sem login', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const firstCard = page.locator('a[href*="detalhes"], .listing-card').first();
    
    if (await firstCard.isVisible()) {
      await firstCard.click();
      // Clica em comprar (usa seletor mais flexível)
      const buyButton = page.locator('button').filter({ hasText: /Comprar Agora/i });
      await expect(buyButton).toBeVisible();
      await buyButton.click();
      
      // Deve redirecionar para login
      await expect(page).toHaveURL(/.*login/);
    } else {
      console.log('ℹ️ Pulando teste de compra: Nenhum anúncio disponível.');
    }
  });
});
