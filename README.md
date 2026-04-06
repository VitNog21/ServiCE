# 🛠️ ServiCE - Marketplace de Serviços e Produtos

O **ServiCE** é uma plataforma completa para anúncio, venda e contratação de serviços e produtos, utilizando uma arquitetura moderna com React no frontend e Node.js no backend, integrada ao ecossistema Supabase.

---

## 🏗️ Estrutura do Projeto

O repositório está dividido em dois módulos principais:

### 1. [Frontend (React + Vite)](./service-frontend)
Interface do usuário focada em performance e experiência (UX).
- **Tecnologias:** React 19, Vite, TailwindCSS (opcional/configurado), Lucide React (ícones), React Router DOM.
- **Páginas Principais:** Home, Login, Cadastro, Perfil, Criar Anúncio e Meus Anúncios.

### 2. [Backend (Node.js + Express)](./service-backend)
API REST responsável pela lógica de negócios complexa e integrações.
- **Tecnologias:** Express, Supabase JS SDK, CORS, Dotenv.
- **Arquitetura:** Controller -> Service -> Route (Padrão de camadas).

---

## 💰 Operação de Venda (Lógica do Sistema)

Para garantir segurança e robustez nas transações, o fluxo de venda segue este padrão:

### 🗄️ Modelagem de Dados (Tabela `pedidos`)
A tabela de pedidos no Supabase deve conter:
- `id`: Identificador único (UUID).
- `anuncio_id`: Referência ao item vendido.
- `comprador_id` / `vendedor_id`: Referência aos usuários envolvidos.
- `valor_total`: Preço final da transação.
- `status`: Ciclo de vida da venda (`pendente` -> `pago` -> `em_transito` -> `concluido`).

### 🔄 Fluxo da Transação
1. **Intenção:** O comprador clica em "Comprar" na página do anúncio.
2. **Reserva:** Um registro é criado em `pedidos` com status `pendente`.
3. **Pagamento:** O usuário é direcionado ao Checkout (Stripe/Mercado Pago).
4. **Confirmação (Webhook):** O gateway de pagamento avisa o Backend quando o dinheiro cai.
5. **Atualização:** O status muda para `pago`, liberando o chat entre as partes.
6. **Finalização:** Após a prestação do serviço, o comprador confirma o recebimento e o valor é liberado ao vendedor.

### 💡 Detalhamento da Lógica Frontend
Para garantir uma experiência segura e sem erros, o frontend (`ProductDetails.jsx`) implementa:
- **Captura Dinâmica de Contexto (`useParams`):** Identifica o produto via ID na URL, permitindo que uma única página sirva para todos os anúncios.
- **Proteção de Rota (Check de Autenticação):** Antes de iniciar a compra, verifica se o usuário está logado via `supabase.auth.getUser()`, redirecionando para o login se necessário.
- **Imutabilidade do Pedido:** O preço é capturado no momento do clique e salvo no registro do pedido, protegendo o comprador de alterações de preço posteriores pelo vendedor.
- **Prevenção de Cliques Duplos (Loading State):** O botão de compra é desabilitado e entra em estado de "Processando" assim que clicado, evitando a criação de pedidos duplicados por instabilidade de rede ou impaciência do usuário.

---

## 🚀 Como Rodar o Projeto

### Pré-requisitos
- Node.js instalado.
- Conta no Supabase configurada.

### Passo 1: Configuração do Ambiente
Crie arquivos `.env` nas pastas `service-frontend` e `service-backend` com as seguintes chaves:
```env
VITE_SUPABASE_URL=seu_url_aqui
VITE_SUPABASE_ANON_KEY=sua_chave_aqui
```

### Passo 2: Instalação e Execução
No terminal, execute em cada pasta:

**Backend:**
```bash
cd service-backend
npm install
npm run dev
```

**Frontend:**
```bash
cd service-frontend
npm install
npm run dev
```

---

## 🛠️ Próximos Passos (Roadmap)
- [ ] Implementar a tabela `pedidos` no SQL do Supabase.
- [ ] Criar a página de Checkout no Frontend.
- [ ] Integrar Webhooks de pagamento no Backend.
- [ ] Desenvolver o Chat em Tempo Real (Supabase Realtime).
