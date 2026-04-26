import swaggerAutogen from 'swagger-autogen';

const outputFile = './swagger_output.json';
const endpointsFiles = ['./src/server.js'];

const doc = {
  info: {
    title: 'ServiCE API',
    description: 'Documentacao automatica das rotas da API do ServiCE.',
    version: '1.0.0'
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Servidor local'
    }
  ],
  tags: [
    {
      name: 'Auth',
      description: 'Rotas de autenticacao'
    },
    {
      name: 'Categories',
      description: 'Rotas de categorias'
    },
    {
      name: 'Orders',
      description: 'Rotas de pedidos'
    }
  ]
};

const generateSwagger = swaggerAutogen({ openapi: '3.0.0' });

generateSwagger(outputFile, endpointsFiles, doc).then(() => {
  console.log('Arquivo swagger_output.json gerado com sucesso.');
});
