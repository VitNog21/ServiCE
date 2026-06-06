FROM node:20-alpine

WORKDIR /app

# Definir argumentos de build para que o Vite os reconheça durante npm run build (se necessário)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_URL

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

# No modo dev, o Vite precisa do --host para aceitar conexões do Docker
CMD ["npm", "run", "dev"]
