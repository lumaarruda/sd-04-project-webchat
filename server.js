require('dotenv/config');
const express = require('express');
const path = require('path');
const http = require('http');
const socketio = require('socket.io');
const moment = require('moment');
const Model = require('./models/chatModel');

const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(express.json());

// set static folder
app.use(express.static(path.join(__dirname, 'public')));

let users = [];

const formatMessage = (nickname, message, timestamp) => {
  return `${timestamp} - ${nickname}: ${message}`;
};

// Conexão
io.on('connection', async (socket) => {  
	// const user = {
	// 	id: socket.id,
	// 	nickname: 'Anonymous',
	//   };

	io.emit('onlineUsers', users)
	
 	const history = await Model.getMessages();
	socket.emit('history', history);  
	  
	socket.broadcast.emit('message', 'New user logged')

  	socket.on('message', async ({ chatMessage, nickname = 'Anonymous' }) => {
   		const date = Date.now();
   		const time = moment(date).format('DD-MM-YYYY h:mm:ss a');
		io.emit('message', formatMessage(nickname, chatMessage, time));
		users.push({id: socket.id, nickname})
		io.emit('onlineUsers', users)
    	// save in BD
    	await Model.saveMessage(chatMessage, nickname, time);
  	});

  	socket.on('disconnect', () => {
		  users = users.filter(user => socket.id !== user.id)
		  io.emit('onlineUsers', users)
	  });
});

server.listen(PORT, () => console.log(`Ouvindo na porta ${PORT}`));
