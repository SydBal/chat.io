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

// Serve index
app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname + '/index.html'));
});

//for heroku
var port = process.env.PORT || 3000;
http.listen(port);

// contains a list of all chat that goes on in a room
var chatlog = []

// list of current users
var allUsers = []

// list of logged in users
var regiOnline = []

// list of registered users and passwords
var registered = {}



io.on('connection', function(socket){

  //Give the socket an initial nickname, mirroring its id
  socket.nickname = socket.id

  //add user to list of connected users
  allUsers.push(socket)

  //log the number of users connected
  console.log(allUsers.length)

  //sends to everyone
  io.emit('chat message', socket.id + " connected to chat!")

  //sends to new user
  socket.emit('chat message', "You can now chat with other logged in users.")

  socket.on('chat message', function(msg){
    io.emit('chat message', msg);
    chatlog.push(msg)
    console.log(chatlog)
  });

  // handle disconnecting users
  socket.on('disconnect', function(){
    var i = allUsers.indexOf(socket);
    allUsers.splice(i, 1);
    console.log(allUsers.length)
  });

  //handle login requestion
  socket.on('login', function(creds){
    usr = creds[0]
    pas = creds[1]
    //if user is new, or password is correct, log the pass word and return true
    if(registered[usr] == undefined || registered[usr] == pas) {
      registered[usr] = pas;
      socket.emit('login', true)
    }else{
      //otherwise, login failed
      socket.emit('login', false)
    }
  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});
