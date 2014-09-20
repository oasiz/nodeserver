var cluster = require('cluster');
var numCPUs = require('os').cpus().length;
var workers = {};

if (cluster.isMaster) {
   var server = require('http').createServer();
   var io = require('socket.io').listen(server);

   var RedisStore = require('socket.io/lib/stores/redis');
   var redis = require('socket.io/node_modules/redis');
   io.set('store', new RedisStore({
      redisPub: redis.createClient(),
      redisSub: redis.createClient(),
      redisClient: redis.createClient()
   }));

   for (var i = 0; i < numCPUs; i++) {
      cluster.fork();
   }

   cluster.on('exit', function(worker, code, signal) {
      console.log('Worker ' + worker.process.pid + ' died.');
   });
} else {
   var io = require('socket.io').listen(5120);

   var RedisStore = require('socket.io/lib/stores/redis');
   var redis = require('socket.io/node_modules/redis');
   io.set('store', new RedisStore({
      redisPub: redis.createClient(),
      redisSub: redis.createClient(),
      redisClient: redis.createClient()
   }));

   io.sockets.on('connection', function (socket) {

      socket.on('join_room', function (data) {
         if (typeof socket !== 'undefined') {
            // data.id should be set if user is logged in
            if (typeof data.id !== 'undefined' && data.id > 0) {
               // Check if socket is already in room
               var roomlist = io.sockets.clients(data.id);
               var occupantSocket;
               if (typeof roomlist[0] !== 'undefined') {
                  // Should only be one socket in a private room
                  occupantSocket = roomlist[0];
               }
               if (socket !== occupantSocket) {
                  // Socket hasn't joined before so join it now
                  socket.join(data.id);
               }
            } else {
               // User ID isn't set so disconnect the socket
               socket.disconnect();
            }
         }
      });

      socket.on('send_msg', function (data) {
         if (typeof socket !== 'undefined') {
            if (typeof data.id_sendee !== 'undefined' && data.id_sendee > 0) {
               // Check if anyone is in the room before broadcasting
               var roomlist = io.sockets.clients(data.id_sendee);
               if (typeof roomlist[0] !== 'undefined') {
                  // Push alerts aren't that critical so use volatile
                  // socket.broadcast.to(data.id_sendee).volatile.emit('newalert', { 'newalert', {sender: data.sender, msg: data.msg });
               }
            } else {
               socket.disconnect();
            }
         }
      });
   });
}
