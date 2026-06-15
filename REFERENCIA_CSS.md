# 🎨 REFERÊNCIA TÉCNICA - CSS RESPONSIVO

## RESUMO DAS MUDANÇAS

### 1. BREAKPOINTS PADRÃO

```css
/* Ultra Pequenas (Mobile) */
@media (max-width: 479px) {
  /* 320px, 375px, 414px */
  padding: 12px;
  font-size: 14px;
}

/* Pequenas (Tablet pequeno) */
@media (min-width: 480px) and (max-width: 768px) {
  /* 480px, 540px, 640px, 768px */
  padding: 16px;
  font-size: 15px;
}

/* Médias e Grandes (Desktop) */
@media (min-width: 769px) {
  /* 1024px, 1440px, 1920px+ */
  padding: 24px;
  font-size: 16px;
}
```

---

## 2. PADRÕES DE RESPONSIVIDADE

### A. Padding/Margin Responsivo

#### Header
```css
/* Desktop: 20px 5% = 20px calc(5% do viewport) */
padding: 20px 5%;

@media (max-width: 479px) {
  padding: 12px;  /* Fixed em mobile para consistência */
}
```

#### Cards
```css
/* Desktop: 24px */
padding: 24px;

@media (max-width: 768px) {
  padding: 16px;
}

@media (max-width: 479px) {
  padding: 12px;
}
```

### B. Grid Responsiva

#### Cards em Grid
```css
/* Desktop: 3 colunas */
grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));

@media (max-width: 768px) {
  /* Tablet: 2 colunas */
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}

@media (max-width: 479px) {
  /* Mobile: 1 coluna */
  grid-template-columns: 1fr;
}
```

### C. Tipografia Responsiva

```css
/* Usando Tailwind (recomendado) */
className="text-[20px] sm:text-[24px] md:text-[28px]"

/* Ou CSS puro */
font-size: 16px;

@media (max-width: 768px) {
  font-size: 14px;
}

@media (max-width: 479px) {
  font-size: 13px;
}
```

### D. Flexbox Responsiva

```css
/* Desktop: lado a lado */
display: flex;
flex-direction: row;
gap: 24px;

@media (max-width: 768px) {
  /* Mobile: stack vertical */
  flex-direction: column;
  gap: 16px;
}
```

---

## 3. COMPONENTES ESPECÍFICOS

### HEADER (global.css)
```css
/* Desktop */
height: auto;
padding: 20px 5%;
display: flex;
justify-content: space-between;
gap: 20px;

@media (max-width: 768px) {
  padding: 16px 12px;
  flex-wrap: wrap;
}

@media (max-width: 479px) {
  padding: 12px;
  height: auto;
}
```

### SEARCH TOOLBAR (global.css)
```css
/* Desktop */
display: flex;
gap: 16px;
margin: 20px 5%;

@media (max-width: 768px) {
  flex-direction: column;
  gap: 12px;
  margin: 16px 12px;
}

@media (max-width: 479px) {
  margin: 12px;
}
```

### CHAT SIDEBAR (chat.css)
```css
/* Desktop */
width: 320px;
height: 100vh;
border-right: 1px solid #ddd;
overflow-y: auto;

@media (max-width: 768px) {
  /* Tablet: full width, altura máxima */
  width: 100%;
  height: 250px;
  border-right: none;
  border-bottom: 1px solid #ddd;
  overflow-x: auto;
}

@media (max-width: 479px) {
  height: 200px;
}
```

### FORM GRID (create-listing.css)
```css
/* Desktop: 2 colunas com proporção */
display: grid;
grid-template-columns: 2fr 1fr;
gap: 20px;

@media (max-width: 768px) {
  /* Tablet: 2 colunas iguais */
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 479px) {
  /* Mobile: 1 coluna */
  grid-template-columns: 1fr;
  gap: 12px;
}
```

### CHECKOUT CONTAINER (checkout.jsx)
```jsx
/* Centralização perfeita */
className="
  min-h-screen 
  bg-gradient-to-br from-[#F5F5F5] to-[#E8F5F1]
  px-3 sm:px-4 md:px-6
  py-4 sm:py-6 md:py-12
  flex items-center justify-center
"
```

---

## 4. TOUCH-FRIENDLY TARGETS

### Minimuns Garantidos
```css
/* Todos os botões */
button {
  min-height: 44px;  /* Touch target padrão */
  min-width: 44px;
  padding: 8px 16px; /* + padding */
}

/* Todos os inputs */
input, select, textarea {
  min-height: 44px;
  padding: 8px 12px;
  font-size: 16px; /* Evita auto-zoom em iOS */
}

/* Links e áreas clicáveis */
a, [role="button"] {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
```

---

## 5. IMAGENS RESPONSIVAS

### Logos
```css
/* Desktop: 45px */
height: 45px;
width: auto;

@media (max-width: 768px) {
  height: 40px;
}

@media (max-width: 479px) {
  height: 36px;
}
```

### Avatars
```css
/* Desktop: 120px */
width: 120px;
height: 120px;
border-radius: 50%;

@media (max-width: 768px) {
  width: 110px;
  height: 110px;
}

@media (max-width: 479px) {
  width: 100px;
  height: 100px;
}
```

### Thumbnails
```jsx
/* Produtos em grid */
className="
  h-24 sm:h-28 w-24 sm:w-28
"
/* 96px mobile, 112px tablet, 112px+ desktop */
```

---

## 6. CENTRALIZAÇÃO (Checkout Fix)

### Padrão Recomendado
```jsx
<div className="flex items-center justify-center min-h-screen">
  <div className="mx-auto w-full max-w-2xl px-4">
    {/* Conteúdo aqui */}
  </div>
</div>
```

### Alternativa com CSS
```css
.container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}

.content {
  max-width: 640px;
  width: 100%;
  margin: 0 auto;
  padding: 0 16px;
}
```

---

## 7. ANIMAÇÕES RESPONSIVAS

### Mantém em Mobile
```css
/* Todos os breakpoints */
@media (max-width: 479px) {
  /* Reduzir complexidade */
  animation-duration: 0.15s;
  transition-duration: 100ms;
}
```

---

## 8. VERIFICAÇÃO DE COMPATIBILIDADE

### Navegadores Suportados
```
✅ Chrome 90+
✅ Firefox 88+
✅ Safari 14+
✅ Edge 90+
✅ Samsung Internet 14+
✅ Opera 76+
```

### Media Query Support
```
✅ @media (max-width)    → Todos
✅ @media (min-width)    → Todos
✅ @media (orientation)  → Todos
✅ @media print          → Todos
```

---

## 9. TAMANHOS DE FONTE PADRÃO

### Hierarquia Tipográfica
```
Títulos H1:   28px → 24px → 20px (desktop → tablet → mobile)
Títulos H2:   24px → 20px → 18px
Títulos H3:   20px → 18px → 16px
Corpo:        16px → 15px → 14px
Pequeno:      14px → 13px → 12px
Micro:        12px → 11px → 10px
```

---

## 10. ESPAÇAMENTO PADRÃO

### Escala de Espaçamento
```
Desktop:  4px  8px  12px  16px  20px  24px  32px  40px  48px
Tablet:   4px  8px  12px  16px  16px  20px  24px  32px  40px
Mobile:   4px  6px   8px  12px  12px  16px  20px  24px  32px
```

---

## 11. LAYOUT MAX-WIDTH

### Limites de Largura
```
Mobile (< 480px):   100% (full-width com padding)
Tablet (480-768px): 100% (full-width com padding)
Desktop (> 768px):  
  - Cards: 640px (max-w-2xl)
  - Contenedor: 1200px (max-w-5xl)
  - Slides: 100% até 1200px
```

---

## 12. LISTA DE VERIFICAÇÃO CSS

- [x] Media queries em todos os CSS principais
- [x] Padding/margin responsivo
- [x] Grids adaptáveis
- [x] Tipografia dimensionada
- [x] Imagens responsivas
- [x] Touch targets 44px+
- [x] Nenhum scroll horizontal
- [x] Cores mantidas
- [x] Animações mantidas
- [x] Compatibilidade navegadores

---

## 13. DEBUGGING CSS

### DevTools Chrome
```
1. F12 → Elements
2. Selecionar elemento
3. Styles → Filter (media queries)
4. Verificar cascata de estilos
```

### Validar Responsividade
```
F12 → Toggle device toolbar (Ctrl+Shift+M)
Arrastar slider para testar tamanhos
Verificar em 320px, 480px, 768px, 1024px
```

---

## 14. PERFORMANCE CSS

### Otimizações Aplicadas
```css
/* ✅ Media queries agrupadas */
@media (max-width: 479px) {
  .class1 { }
  .class2 { }
  .class3 { }
}

/* ❌ Evitar (não fazer) */
.class1 { @media (max-width: 479px) { } }
.class2 { @media (max-width: 479px) { } }
```

---

## 15. REFERÊNCIA RÁPIDA

### Copiar & Colar Templates

#### Template: Card Responsivo
```css
.card {
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

@media (max-width: 768px) {
  .card { padding: 16px; }
}

@media (max-width: 479px) {
  .card { padding: 12px; }
}
```

#### Template: Grid Responsiva
```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

@media (max-width: 768px) {
  .grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
  }
}

@media (max-width: 479px) {
  .grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}
```

---

**Referência Completa: PRONTA** ✅

Use este arquivo como guia ao fazer futuras alterações no CSS.
