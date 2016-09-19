// Chat.io Node.js server
// Handles user authencation, socket.io chat, and client managemnt
// Logging will be handled by RethinkDB

var path    = require('path'),
    crypto  = require('crypto'),
    express = require('express'),
    app     = express(),
    http    = require('http').createServer(app),
    io      = require('socket.io')(http);

//called every time a connection is made
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
  res.sendFile(path.join(__dirname + '/chat.html'));
});

//for heroku
var port = process.env.PORT || 3000;
http.listen(port);

/*Logs*/
// contains a list of all chat that goes on in a room
var chatlog = []

// list of current users
var allUsers = {}

// list of logged in users
var regiOnline = []
//delete a user from the list
function removeOnline(socket){
  for(var i = regiOnline.length - 1; i >= 0; i--) {
    if(regiOnline[i].id == socket.id) {
      regiOnline.splice(i, 1);
    }
  }    
}

// list of registered users and passwords (should be in database)
var registered = {}

io.on('connection', function(socket){

  //let the user know they have created a fresh connection to the socket server
  socket.emit("serverConnected", "You have been connected to chat.io's server.")

  //KEEP TRACK OF USER
  //Give the socket an initial nickname, mirroring its id
  socket.nickname = socket.id;
  //add user to list of connected users
  allUsers[socket.id] = socket;

  //log the number of users connected
  var len = 0;
  for (var users in allUsers) {
      len++;
        console.log('# of connected users: '+len);
  };

  //send new message to everyone
  socket.on('chat message', function(msg){
    //let sending user know that message is recieved
    socket.emit('message recieved', true);
    io.emit('chat message', socket.nickname + " : " + msg);
    chatlog.push(msg);
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
    usr = creds.name
    pas = encrypt(creds.pass)
    if(usr.length < 2 || pas.length <2){
      //too short
      socket.emit('login', {result:false, msg:'tooshort'})
    //include database query here, check for registered users
    }else if(registered[usr] == undefined || registered[usr] == pas) {
      //legal
      registered[usr] = pas;
      socket.nickname = usr;
      allUsers[socket.id] = socket;
      //add user to online member
      regiOnline.push({usr:socket.nickname,id:socket.id})
      socket.emit('login', {result:true, msg:''})
      //sends to everyone
      io.emit('chat message', socket.nickname + " connected to chat!")
      //sends to new user
      socket.emit('chat message', "You can now chat with other logged in users.")
    }else{
      //wrong pass
      socket.emit('login', {result:false, msg:'wrongpass'})
    }
  });

  socket.on('logout', function(data){
    //inform chatters
    io.emit('chat message', socket.nickname + " disconnected.");
    //reset nickname to socket.id
    socket.nickname = socket.id;
    //remove registered user from online
    removeOnline(socket)
  });

  socket.on('disconnect', function(data){
    //inform chatters IF the user was logged in
    if(socket.id != socket.nickname && socket.nickname != undefined){
      io.emit('chat message', socket.nickname + " disconnected.");
    }
    removeOnline(socket)
  });
});

http.listen(3000, function(){
  console.log('Chat.io serving! Listening on *:3000 for http requests.');
});

/*Security for user login info*/
//these should belong in environment variables
var algorithm = 'aes-256-ctr',
    password = 'chatio4life'; //the vulnerabilty

function encrypt(text){
  var cipher = crypto.createCipher(algorithm,password)
  var crypted = cipher.update(text,'utf8','hex')
  crypted += cipher.final('hex');
  return crypted;
}

//not yet used
function decrypt(text){
  var decipher = crypto.createDecipher(algorithm,password)
  var dec = decipher.update(text,'hex','utf8')
  dec += decipher.final('utf8');
  return dec;
}