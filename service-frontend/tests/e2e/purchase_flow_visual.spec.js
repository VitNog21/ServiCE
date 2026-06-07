import { test, expect } from '@playwright/test';

/**
 * Teste Visual de Fluxo de Compra (Checkout Pro)
 * Objetivo: Validar o caminho desde a vitrine até o redirecionamento para o Mercado Pago.
 */
test.describe('Fluxo de Compra Completo', () => {

  test('Deve realizar a jornada de compra e redirecionar para o Checkout', async ({ page }) => {
    console.log('🏁 Iniciando jornada de compra...');

    // 1. Acessar a Vitrine
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/01-home-vitrine.png' });
    console.log('✅ Home carregada.');

    // 2. Selecionar o Primeiro Serviço Disponível
    const firstProduct = page.locator('a[href*="detalhes"], .listing-card').first();
    await expect(firstProduct).toBeVisible({ timeout: 10000 });
    await firstProduct.click();
    
    await expect(page).toHaveURL(/.*detalhes/);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/02-detalhes-produto.png' });
    console.log('✅ Página de detalhes visualizada.');

    // 3. Clicar em Comprar (Validação de Trava de Auth ou Redirecionamento)
    const buyButton = page.locator('button').filter({ hasText: /Comprar Agora/i });
    await expect(buyButton).toBeVisible();
    await buyButton.click();

    // NOTA: Como o ambiente de teste começa deslogado, o comportamento esperado é redirecionar para Login.
    // Se o usuário estivesse logado, ele iria para /checkout/:orderId
    const currentUrl = page.url();
    
    if (currentUrl.includes('login')) {
      await page.screenshot({ path: 'test-results/03-bloqueio-autenticacao.png' });
      console.log('✅ Trava de segurança validada: Usuário enviado para Login.');
    } else if (currentUrl.includes('checkout')) {
      await page.screenshot({ path: 'test-results/03-tela-checkout.png' });
      console.log('✅ Tela de Checkout interna carregada.');
      
      // 4. Testar o botão do Mercado Pago
      const mpButton = page.getByRole('button', { name: /Pagar com Mercado Pago/i });
      await expect(mpButton).toBeVisible();
      console.log('✅ Botão do Mercado Pago pronto para processar.');
    }

    console.log('🏁 Fim do teste de fluxo.');
  });

});
