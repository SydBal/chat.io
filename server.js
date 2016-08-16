// Chat.io Node.js server
// Handles user authencation, socket.io chat, and client managemnt
// Logging will be handled by RethinkDB

var express = require('express'),
    path =require('path'),
    app = express(),
    http = require('http').createServer(app),
    path = require('path')
    io = require('socket.io')(http);


io.use(function(socket, next) {
  var handshakeData = socket.request;
  // make sure the handshake data looks good as before
  // if error do this:
    // next(new Error('not authorized');
  // else just call next
  next();
});

app.use('/scripts', express.static(path.join(__dirname + '/node_modules/bootstrap-material-design/dist/')));
app.use('/public', express.static(path.join(__dirname + '/public/')));

// Serve index
app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname + '/index.html'));
});

// Serve chat.io
app.get('/chat', function(req, res) {
  res.sendFile(path.join(__dirname + '/chat.html'));
});

//for heroku
var port = process.env.PORT || 3000;
http.listen(port);

/*Logs
 */

// contains a list of all chat that goes on in a room
var chatlog = []

// list of current users
var allUsers = {}

// list of logged in users
var regiOnline = []

// list of registered users and passwords (should be in database)
var registered = {}



io.on('connection', function(socket){

  //Give the socket an initial nickname, mirroring its id
  socket.nickname = socket.id;

  //add user to list of connected users
  allUsers[socket.id] = socket;

  //log the number of users connected
  var len = 0;
  for (var users in allUsers) {
      len++;
  }
  console.log('# of connected users: '+len);

  //sends to everyone
  io.emit('chat message', socket.id + " connected to chat!")

  //sends to new user
  socket.emit('chat message', "You can now chat with other logged in users.")

  //send new message to everyone
  socket.on('chat message', function(msg){
    io.emit('chat message', msg);
    chatlog.push(msg)
  });

  // handle disconnecting users
  socket.on('disconnect', function(){
    delete allUsers[socket.id];
    var len = 0;
    for (var users in allUsers) {
        len++;
    }
    console.log('# of connected users: '+len);
  });

  //handle login requestion
  socket.on('login', function(creds){
    usr = creds[0]
    pas = creds[1]
    if(usr.length < 2 || pas.length <2){
      //too short
      socket.emit('login', [false, 'tooshort'])
    }else if(registered[usr] == undefined || registered[usr] == pas) {
      //legal
      registered[usr] = pas;
      socket.nickname = usr;
      allUsers[socket.id] = socket;
      socket.emit('login', [true, ''])
    }else{
      //wrong pass
      socket.emit('login', [false, 'wrongpass'])
    }
  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});
