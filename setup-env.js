import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const BACKEND_DIR = './service-backend';
const BACKEND_ENV = path.join(BACKEND_DIR, '.env');
const ROOT_ENV = './.env';

const SECRETS_NEEDED = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'MERCADO_PAGO_ACCESS_TOKEN',
  'WEBHOOK_URL',
  'NGROK_AUTHTOKEN',
  'NGROK_DOMAIN'
];

async function setup() {
  console.log('🚀 Iniciando setup automático do ambiente ServiCE...');

  try {
    execSync('gh --version', { stdio: 'ignore' });
  } catch (e) {
    console.error('❌ Erro: GitHub CLI (gh) não está instalado.');
    process.exit(1);
  }

  console.log('\n📥 Buscando variáveis do GitHub...');
  let envContent = '# Gerado automaticamente via setup-env.js\n\n';

  for (const secret of SECRETS_NEEDED) {
    try {
      const value = execSync(`gh variable get ${secret}`, { encoding: 'utf8' }).trim();
      envContent += `${secret}=${value}\n`;
      console.log(`✅ ${secret} configurado.`);
    } catch (e) {
      console.warn(`⚠️  Variável ${secret} não encontrada no GitHub. Usando placeholder.`);
      envContent += `${secret}=INSIRA_O_VALOR_AQUI\n`;
    }
  }

  // Salva no backend
  fs.writeFileSync(BACKEND_ENV, envContent);
  // Salva na raiz (Para o Docker Compose)
  fs.writeFileSync(ROOT_ENV, envContent);

  console.log(`\n✨ Arquivos .env criados na raiz e em ${BACKEND_DIR}!`);
  console.log('👉 Importante: Verifique se a SUPABASE_ANON_KEY foi preenchida.');
  console.log('👉 Agora rode: docker-compose up --build');
}

setup();
