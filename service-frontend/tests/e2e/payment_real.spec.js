import { test, chromium, expect } from '@playwright/test';

/**
 * TESTE DE PAGAMENTO NO BROWSER REAL (VIA PLAYWRIGHT TEST)
 * 
 * Comando para abrir o Chrome:
 * "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\temp\chrome-session"
 */
test('Fluxo de Pagamento no Navegador Ativo', async () => {
  console.log('🔗 Conectando ao Chrome em 127.0.0.1:9222...');
  
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const defaultContext = browser.contexts()[0];
  const page = defaultContext.pages()[0] || await defaultContext.newPage();

  console.log('🚀 Iniciando teste...');

  // 1. Acesso
  await page.goto('http://localhost:5173/');
  await page.bringToFront();

  // 2. Seleção
  const productCard = page.locator('a[href*="detalhes"], .listing-card').first();
  await expect(productCard).toBeVisible({ timeout: 10000 });
  await productCard.click();

  // 3. Checkout
  const buyButton = page.getByRole('button', { name: /Comprar Agora/i });
  await expect(buyButton).toBeVisible();
  await buyButton.click();
  
  await expect(page).toHaveURL(/.*checkout/, { timeout: 15000 });
  console.log('✅ Tela de checkout interna carregada.');

  // 4. Mercado Pago
  const mpButton = page.getByRole('button', { name: /Pagar com Mercado Pago/i });
  await mpButton.click();
  
  console.log('💳 Redirecionando para o Mercado Pago...');
  await page.waitForURL(/.*mercadopago.com/, { timeout: 45000 });
  
  console.log('🏁 Sucesso! O gateway foi carregado no seu navegador.');
  
  // Detach para não fechar o seu browser ao terminar o teste
  await browser.detach();
});
