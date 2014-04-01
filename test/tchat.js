

// classe WebRTC. Cette classe va permettre de mettre en relation deux utilisateurs présent sur la même page web
// Le principe est simple. Tout d'abord, on récupère son adresse ip grace à un IceServers.
// Ensuite en passant par un serveur websocket, on envoit des données à l'autre utilisateur afin de se connecter à lui
// On envoit un IceCandidate et une donnée nommée SDP
// Lors de la réception de ces informations l'autre utilisateur va renvoyer les mêmes informations qui sont cette fois
// propre à son navigateur internet.
// Une fois la connexion établie, les flux échangés entre les utilisateurs ne passent plus par un serveur.


function WebRTC() {
    //attribut de classe
    var connection = false; // connexion au serveur ws
    var sendChannel = new Array(); // tableau de channel dans lesquels on enverra des données
    var receiveChannel = new Array(); // tableau de channel dans lesquels on recevra des informations

    var PeerConnection = window.RTCPeerConnection // suivant le navigateur internet la fonction diffère
            || window.webkitRTCPeerConnection // google chrome
            || window.mozRTCPeerConnection; // mozzila

    var SessionDescription = window.RTCSessionDescription
            || window.webkitRTCSessionDescription
            || window.mozRTCSessionDescription;

    var IceCandidate = window.RTCIceCandidate
            || window.webkitRTCIceCandidate
            || window.mozRTCIceCandidate;

    var peerConnection = new Array(); // tableau de connexion. C'est là qu'on établira les connexions avec les autres navigateurs
    var iceServers = [];
    var peerConstraints = {optional: [{RtpDataChannels: true}]};// option lors de la création de connexion. Ici on choisit d'établir un channel de data
    
    var cptConnexion = 0;

    /*
     * initialisation de iceServers --> va permettre de récupérer son ip
     */
    var moz = !!navigator.mozGetUserMedia; // détermine si on est sur mozzila
    if (moz) {
        iceServers.push({
            url: 'stun:23.21.150.121'
        });

        iceServers.push({
            url: 'stun:stun.services.mozilla.com'
        });
    }

    if (!moz) {
        iceServers.push({
            url: 'stun:stun.l.google.com:19302'
        });

        iceServers.push({
            url: 'stun:stun.anyfirewall.com:3478'
        });
    }
    iceServers = {
        iceServers: iceServers
    };
    /*===================================
     * ========== methode privee ========
     * ==================================
     */

    // on souhaite rejoindre un channel, il faut donc pour cela construire notre question
    var createAsk = function() {
        peerConnection[cptConnexion] = new PeerConnection(iceServers, peerConstraints); // initialisation de la connexion
        
        try {
            sendChannel[cptConnexion] = peerConnection.createDataChannel("sendDataChannel", {reliable: false});
            console.log('Création d\'un data channe');
        } catch (err) {
            console.log('erreur de création de data channel ' + err);
        }

    };

    // après avoir reçu des informations de l'utilisateur demandeur on fabrique notre réponse
    var createAnswer = function() {

    };

    /*===================================
     * ========== methode publique ======
     * ==================================
     */

    this.connectToSocket = function(wsUrl) {
        // ouverture de la connexion au serveur d'url wsUrl
        connection = new WebSocket(wsUrl);

        // connexion etablie
        connection.onopen = function(event) {
            console.log((new Date()) + ' la connexion a bien été établit avec le serveur');
        };

        // la connexion ne s'est pas etablie
        connection.onerror = function(error) {
            console.log((new Date()) + ' il y a eu une erreur de connexion');
            console.log(error);
        };

        // fermeture de connexion
        connection.onclose = function(event) {
            console.log((new Date()) + ' la connexion a été fermée');
        };

        // fonction appelée lorsqu'on reçoit un message
        connection.onmessage = function(message) {
            try {
                var data = JSON.parse(message.data);
            } catch (e) {
                console.log('ce message ne ressemble pas à un message de type JSON');
                console.log(message);
                return;
            }
            switch (data.type) {
                default:
                    console.log("message de type inconnu reçu: " + data.type);
                    break;

            }
        };
    };

    this.sendData = function() {
        var data = document.getElementById("dataChannelSend").value;
        var i = 0;
        var length = sendChannel.length;
        while (i < length) {
            sendChannel[i].send(data);
            i++;
        }
        console.log("message envoyé à " + length + " channel");
    };

}