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
                case 'close':
                    console.log("le client id: " + data.id + " ferme la connexion");
                    rooms[data.roomId].unset(this);
                    this.close();
                    break;
                case 'howMany':
                    console.log("demande de combien de personne sur la room")
                    var length = rooms[data.roomId].length;
                    var data = {
                        type: 'howMany',
                        taille: length
                    };
                    send(this, data);
                    break;
                case 'joinRoom':
                    var length = rooms[data.roomId].length;
                    rooms[data.roomId][length] = this;
                    var data = {
                        type: 'joinRoom',
                        id: length
                    };
                    send(this, data);
                    break;
                case 'creatRoom':
                    var roomId = "Robair";
                    // on envoit l'id de la room au createur
                    var data = {
                        type: 'creatRoom',
                        roomId: roomId
                    };

                    rooms[roomId] = new Array();
                    var length = rooms[roomId].length;
                    // on ajoute le createur à la room;
                    rooms[roomId][length] = this;

                    //on envoit l'id du createur à son createur
                    send(this, data);
                    data = {
                        type: 'getMyId',
                        id: length
                    };
                    send(this, data);
                    break;
                case 'iceCandidate':
                    console.log("envoi d'un icecandidate venant de :" + data.from + " et allant vers:" + data.to);
                    send(rooms[data.roomId][data.to], data);
                    break;
                case 'sdp':
                    console.log("envoi d'un sdp venant de :" + data.from + " et allant vers:" + data.to);
                    send(rooms[data.roomId][data.to], data);
                    break;
                default:
                    console.log("type de message inconnu: " + data.type);
                    break;
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

Array.prototype.unset = function(val) {
    var index = this.indexOf(val);
    if (index > -1) {
        this.splice(index, 1);
    }
}