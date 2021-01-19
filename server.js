const http = require('http');
const express = require('express');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const moment = require('moment');
const { getAllMsg, createMsg, getPrivateMessages, createPrivateMsg } = require('./models/msgModel');

const app = express();
const socketIoServer = http.createServer(app); // cria o servidor
const io = socketIo(socketIoServer); // a partir daqui que escuta

const PUBLIC = path.join(__dirname, 'public');

app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.json());

app.use(express.static(PUBLIC));

app.get('/', (_req, res) => {
  res.sendFile('index.html'); // conecta com o index.html
});

let onlineUsers = [];
let thisUser;

io.on('connection', async (socket) => {
  const allMsg = await getAllMsg();
  const allPrivateMsg = await getPrivateMessages();

  io.emit('onlineUsers', onlineUsers);

  socket.on('newUser', (nick) => {
    console.log('esse é o nome atual', nick); // usuario
    thisUser = { id: socket.id, nick };
    onlineUsers.push(thisUser);
    // console.log(onlineUsers);
    io.emit('newUser', onlineUsers);
  });

  const msgSend = [];
  allMsg.map((element) => {
    const { chatMessage, nickname, timestamp } = element;
    return msgSend.push(`${timestamp} - ${nickname}: ${chatMessage}`);
  });

  socket.emit('history', msgSend);

  socket.on('message', async (message) => { // emite e salva mensagens
    const time = moment(new Date()).format('DD-MM-YYYY h:mm:ss a');
    await createMsg(message.chatMessage, message.nickname, time);
    const fullMsgString = `${time} - ${message.nickname}: ${message.chatMessage}`;
    io.emit('message', fullMsgString);
  });

  socket.on('newNickName', (newUser) => {
    onlineUsers.map((user) => {
      const thisNewUser = user;
      if (thisNewUser.id === thisUser.id) thisNewUser.nick = newUser;
      return console.log(user);
    });
    io.emit('newNickName', onlineUsers);
  });

  socket.on('disconnect', () => {
    console.log('usuario se desconectou');
    onlineUsers = onlineUsers.filter((user) => user.id !== socket.id);
    io.emit('disconnect', onlineUsers);
  });

  socket.on('privateMessage', async ({ anotherSocketId, msg, nickname }) => {
    const time = moment(new Date()).format('DD-MM-YYYY h:mm:ss a');
    const userTo = onlineUsers.find((user) => user.id === anotherSocketId);
    await createPrivateMsg(msg, nickname, time, userTo.nick);
    const privateMsgSend = `${nickname} - ${time}: ${msg}`;
    io.to(socket.id).emit('privateMessage', privateMsgSend);
    io.to(anotherSocketId).emit('privateMessageReceiver', privateMsgSend);
  });

  const allMsgPrivate = [];
  allPrivateMsg.map((element) => {
    const { chatMessage, nickname, timestamp } = element;
    return allMsgPrivate.push(`${nickname} - ${timestamp}: ${chatMessage}`);
  });

  socket.emit('privateHistory', allMsgPrivate);
});

socketIoServer.listen(3000, () => {
  console.log('Express ouvindo na porta 3000');
});
