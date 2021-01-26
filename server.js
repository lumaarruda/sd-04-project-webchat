require('dotenv').config();

const moment = require('moment');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const express = require('express');

const { save, getAll, msgSendTo, getPrivate } = require('./models/messages');

const app = express();

const server = http.createServer(app);
const io = socketIo(server);

app.use('/', express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

let clients = [];
let guestId = 0;

io.on('connection', async (socket) => {
  guestId++;
  // Traz todas mensagens do banco de dados e envia para o front
  const history = await getAll();
  io.emit('history', history);

  // Escuta a entrada do nickname assim que inicia a conexão
  socket.on('nickname', (nickname) => {
    clients.filter((client) => socket.id !== client.id);
    clients.push({ id: socket.id, nickname });
    socket.emit('nickname', nickname);
    io.emit('online-users', clients);
  });

  socket.on('private-chat', async ({ privateStatus, nickname, to }) => {
    console.log(privateStatus, nickname, to);
    if (!privateStatus) {
      const history = await getAll();
      console.log(history);
      io.emit('history', history);
    }
    const historyPrivate = await getPrivate(nickname, to);
    console.log(historyPrivate);
    return socket.emit('history', historyPrivate);
  });

  // Escuta a mensagem vinda do FRONT e armazena no banco de dados,
  //  e retorna para o FRONT a msg formatada.
  socket.on('message', async ({ chatMessage, nickname, privateStatus, to }) => {
    const newDate = new Date();
    const date = moment(newDate).format('DD-MM-yyyy HH:mm:ss');
    console.log(privateStatus);
    if (privateStatus) {
      const userTosend = clients.filter((client) => client.nickname === to)[0];
      const msg = `${date} (private) - ${nickname}: ${chatMessage}`;
      await msgSendTo({ nickname, chatMessage, date, to: userTosend.nickname });
      io.to(socket.id).emit('message', msg);
      return io.to(userTosend.id).emit('message', msg);
    }
    const msg = `${date} - ${nickname}: ${chatMessage}`;
    io.emit('message', msg);
    const obj = {
      chatMessage,
      nickname,
      timestamp: date,
    };
    await save(obj);
  });

  socket.on('logged', ({ nickname }) => {
    if (nickname === 'Guest') {
      const obj = { id: socket.id, nickname: `Guest${guestId}` };
      clients.push(obj);
      console.log('obj', obj);
      return io.emit('online-users', clients);
    }
    const obj = { id: socket.id, nickname };
    clients.push(obj);
    io.emit('online-users', clients);
  });

  // Usuario foi desconectado
  socket.on('disconnect', (nickname) => {
    clients.filter((client) => client !== nickname);
    clients = [];
    io.emit('online-users', clients);
  });
});

server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
