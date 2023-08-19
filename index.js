const express = require('express');
const bodyParser = require('body-parser');
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const axios = require('axios');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

const sessions = {};

app.post('/whatsapp', async (req, res) => {
  const twiml = new MessagingResponse();
  const fromNumber = req.body.From;
  const message = req.body.Body.trim().toLowerCase();

  if (!sessions[fromNumber]) {
    sessions[fromNumber] = { state: 'waiting_for_any_message' };
    twiml.message('Olá! Bem-vindo ao nosso chatbot. Digite qualquer mensagem para continuar.');
  } else {
    const session = sessions[fromNumber];

    switch (session.state) {
      case 'waiting_for_any_message':
        session.state = 'waiting_for_cep';
        twiml.message('Ótimo! Agora, por favor, digite o CEP para o qual deseja obter o endereço completo.');
        break;

      case 'waiting_for_cep':
        if (isValidCEP(message)) {
          try {
            const address = await getAddressFromCEP(message);
            twiml.message(`Endereço: ${address}`);
          } catch (error) {
            console.error('Erro:', error);
            twiml.message('Desculpe, ocorreu um erro ao obter o endereço.');
          }
        } else {
          twiml.message('Por favor, insira um CEP válido.');
        }
        session.state = 'waiting_for_any_message';
        break;
    }
  }

  res.writeHead(200, { 'Content-Type': 'text/xml' });
  res.end(twiml.toString());
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});

function isValidCEP(cep) {
  return /^[0-9]{8}$/.test(cep);
}

async function getAddressFromCEP(cep) {
  const response = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);
  const data = response.data;

  if (data.erro) {
    throw new Error('CEP não encontrado');
  }

  return `${data.logradouro}, ${data.bairro}, ${data.localidade}, ${data.uf}`;
}