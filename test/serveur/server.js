// port de notre websocket
var port = 6969,
// ce qu'il faut à notre websocket pour fonctionner
        webSocketServer = require('websocket').server,
        http = require('http'),
        // gestion des channels:
        rooms = new Array();

// création du serveur http
var server = http.createServer(function(request, response) {
});

//le serveur écoute sur le port 
server.listen(port, function() {
    console.log((new Date()) + " le serveur écoute sur le port " + port);
});

// création du serveur websocket
var wsServer = new webSocketServer({
    httpServer: server
});

// le serveur recoit une requete il faut donc la traiter
wsServer.on('request', function(request) {
    console.log("le serveur a recu une requete :" + request);
    // on accepte toutes les connexions
    var connection = request.accept(null, request.origin);

    connection.on('message', function(message) {
        console.log('on a recu un message de ' + request.origin);
        // tous les messages seront des messages formes par JSON
        try {
            var data = JSON.parse(message.utf8Data);
        }
        catch (e) {
            console.log('ce message n est pas formate en JSON');
        }
        if (data !== undefined && data.type !== undefined) {
            switch (data.type) {

            }
        }
        else {// faire quelques choses s'il manque des champs dans le message

        }
    });
    
    // methode privée qui permettra d'envoyer des data à l'utilisateur (ie connection)
    var send = function(connection, data) {
        try {
            connection.sendUTF(JSON.stringify(data));
        }
        catch (e) {
            console.log('\n\n!!!### ERREUR FATALE ###!!!\n');
            console.log(e + '\n');
            return;
        }
    };
});