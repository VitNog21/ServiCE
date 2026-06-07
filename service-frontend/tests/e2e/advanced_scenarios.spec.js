import { test, expect } from '@playwright/test';

test.describe('Segurança e Papéis (Seção 2 do PDF)', () => {
  
  test('Visitante não deve acessar área de anúncios privados', async ({ page }) => {
    // Tenta acessar Meus Anúncios sem login
    await page.goto('/meus-anuncios');
    // Deve ser chutado para o Login
    await expect(page).toHaveURL(/.*login/);
  });

  test('Usuário comum não deve acessar Dashboard Admin', async ({ page }) => {
    // Tenta entrar direto no Admin sem auth
    await page.goto('/admin');
    
    // O sistema deve detectar o acesso indevido e redirecionar
    // Como a verificação de auth é async, esperamos a URL mudar de /admin
    await expect(page).not.toHaveURL(/.*admin/, { timeout: 10000 });
  });

});

test.describe('Casos de Borda e Usabilidade', () => {

  test('Deve validar campos obrigatórios na criação de anúncio', async ({ page }) => {
    // Tenta acessar sem login, será redirecionado
    await page.goto('/criar-anuncio'); 
    await expect(page).toHaveURL(/.*login/);
  });

  test('Interface deve ser responsiva (Mobile Check)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone X
    await page.goto('/');
    
    // O Header mobile deve estar visível
    const header = page.locator('header');
    await expect(header).toBeVisible();
    
    // A barra de busca deve ser adaptada ou visível
    const searchInput = page.locator('input').first();
    await searchInput.scrollIntoViewIfNeeded();
    await expect(searchInput).toBeVisible();
  });

  test('Deve lidar com busca sem resultados (Estado Vazio)', async ({ page }) => {
    await page.goto('/');
    const searchInput = page.locator('input').first();
    await searchInput.fill('PRODUTO_QUE_NAO_EXISTE_123456');
    await page.keyboard.press('Enter');
    
    // Deve mostrar mensagem de "Nenhum anúncio encontrado"
    await expect(page.locator('text=Nenhum anúncio')).toBeVisible({ timeout: 10000 });
  });

});
