const express = require('express');
const http = require('http');
const cors = require('cors')();
const socketIo = require('socket.io');
const path = require('path');
const formatMessage = require('./utils/formatMessage');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
let guestId = 0;

const socketIoServer = http.createServer(app);
const io = socketIo(socketIoServer);

const sockets = [];
const history = [];
const onlineUsers = {};

app.use('/', express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors);

io.on('connection', (socket) => {
  guestId += 1;
  let user = `Guest${guestId}`;

  io.emit('getName', { user });

  socket.on('setName', (userParam) => {
    user = userParam;
  });

  onlineUsers[socket.id] = user;
  socket.broadcast.emit('connectMessage', `${user} está online!`);

  io.emit('setHistory', history);

  socket.on('disconnect', () => {
    socket.broadcast.emit('disconnectMessage', `${user} saiu!`);
    sockets.splice(sockets.indexOf(socket), 1);
    delete onlineUsers[socket.id];
  });
  io.emit('onlineUsers', onlineUsers);

  socket.on('mensagem', (message) => {
    io.emit('menssage', formatMessage(user, message));
    history.push(message);
  });

  socket.on('error', (error) => {
    console.error('Erro no socket: ', error.message);
  });
});

socketIoServer.listen(PORT, () => {
  console.log(`Servidor ouvindo a porta ${PORT}`);
});
