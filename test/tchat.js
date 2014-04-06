

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

    var otherCandidatesIndiceFrom = []; // buffer des indices des "from" des iceCandidates
    var othersCandidates = []; // buffer des iceCandidates
    var otherSDP = new Array(); // permettra de savoir si on doit ajouter le ice candidate ou le mettre dans un buffer en attendant le sdp
    var peerConnection = new Array(); // tableau de connexion. C'est là qu'on établira les connexions avec les autres navigateurs
    var iceServers = [];
    var peerConstraints = {optional: [{RtpDataChannels: true}]};// option lors de la création de connexion. Ici on choisit d'établir un channel de data

    var cptAnswer = 0;
    var cptConnexion = 0;
    var cptReceiveChannel = 0;
    var roomId = false; // id du channel que l'on souhaite rejoindre
    var myId = false; // notre id que le serveur nous fournit
    var howMany = false; // avant de faire des demandes de connexion aux autres clients lorsqu'on rejoint pour la 1er fois un serveur,
    // on va chercher à savoir combien il y a de membre dans la room
    var bitMap = new Array();

    var myStream = false;
    var otherStream = false;

    var socketEvent = document.createEvent('Event'); // permettra de déclancher des évenements en local sur la page html
    socketEvent.initEvent('socketEvent', true, true);
    /*
     * initialisation de iceServers --> va permettre de récupérer notre iceCandidate
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

    var receiveData = function(event) {
        console.log('Received message: ' + event.data);
        document.getElementById("dataChannelReceive").value = event.data;
    };

    // fonction permettant de recevoir le channel de data
    var gotReceiveChannel = function(event) {
        console.log('Receive Channel Callback');
        receiveChannel[cptReceiveChannel] = event.channel;
        receiveChannel[cptReceiveChannel].onmessage = receiveData;
        cptReceiveChannel++;
    };
    // fonction permettant d'envoyer des donnés au serveur
    var sendToServer = function(data) {
        try {
            connection.send(JSON.stringify(data));
            return true;
        } catch (e) {
            console.log('il n\'y a pas de connexion au serveur server.js');
            return false;
        }
    };

    var onSdpError = function(e) {
        var message = JSON.stringify(e, null, '\t');

        if (message.indexOf('RTP/SAVPF Expects at least 4 fields') !== -1) {
            message = 'It seems that you are trying to interop RTP-datachannels with SCTP. It is not supported!';
        }

        console.error('onSdpError:', message);
    };

    var askHowMany = function() {
        var data = {
            type: 'howMany',
            roomId: roomId
        };
        sendToServer(data);
    };

    var initBitMap = function() {
        var i = 0;
        while (i < howMany - 1) {
            bitMap[i] = 0;
            i++;
        }
    };

    var indexOfBitMap = function() {
        var i = 0;
        while ((i < howMany - 1) && (bitMap[i] === 1)) {
            i++;
        }
        if (i < howMany - 1) {
            bitMap[i] = 1;
            return i;
        }
        return -1;
    };

    // =======================================================
    // ===== les methodes propres au protocol webrtc ====== 
    // =======================================================
    
    //permet d'ouvrir un stream video/son
    var takeMedia = function(param, success) {
        // param default 
        if (!param) {
            param = {audio: false, video: true};
        }

        navigator.getMedia = (navigator.getUserMedia ||
                navigator.webkitGetUserMedia || // les fonctions préfixés par webkit sont utilisées par google chrome
                navigator.mozGetUserMedia ||
                navigator.msGetUserMedia);

        navigator.getMedia(param, function(stream) {

            myStream = stream;
            success(myStream);

        }, function(err) {
            console.log("getMedia failed " + err);
        });
    };

    // create ice-candidate
    var createRTCIceCandidate = function(candidate) {
        var ice = new IceCandidate(candidate);
        return ice;
    };

    var setIceCandidates = function(data) {
        // push icecandidate to array if no SDP of other guys is available
        var iceCandidate = data.payload;
        var i = 0;
        if (data.from < myId)
            i = data.from;
        else
            i = data.from - 1;

        console.log("val i dans setIceCandidates :" + i);
        if (otherSDP[i] === null) {
            othersCandidates.push(iceCandidate);
            otherCandidatesIndiceFrom.push(i);
            console.log("iceCandidate mis dans le buffer");
        }
        if (otherSDP[i] &&
                iceCandidate.candidate &&
                iceCandidate.candidate !== null) {
            peerConnection[i].addIceCandidate(createRTCIceCandidate(iceCandidate.candidate));
            console.log("IceCandidate ajouée");
        }
    };

    // create an session description object
    var createRTCSessionDescription = function(sdp) {
        var newSdp = new SessionDescription(sdp);
        console.log("session description crée");
        return newSdp;
    };

    // fin de l'échande de donné entre les navigateurs pour qu'ils puissent communiquer ensemble
    // on ajoute donc les iceCandidate restant dans le buffer
    var handShakeDone = function(data) {
        var lengthBufferIce = othersCandidates.length;
        peerConnection[data.from].setRemoteDescription(createRTCSessionDescription(data.payload));
        // add other guy's ice-candidates to connection
        for (var i = 0; i < lengthBufferIce; i++) {
            if (othersCandidates[i].candidate) {
                peerConnection[otherCandidatesIndiceFrom[i]].addIceCandidate(createRTCIceCandidate(othersCandidates[i].candidate));
            }
        }
        console.log("connexion établit entre tous les navigateurs du channel");
    };


    // on souhaite rejoindre un channel, il faut donc pour cela construire notre question qu'on everra à une personne précise
    var createAsk = function(idMember) {
        peerConnection[cptConnexion] = new PeerConnection(iceServers, peerConstraints); // initialisation de la connexion

        try {
            // création du channel où on enverra des donnés
            sendChannel[cptConnexion] = peerConnection[cptConnexion].createDataChannel("sendDataChannel", {reliable: false});
            console.log('Création d\'un data channel');
        } catch (err) {
            console.log('erreur de création de data channel ' + err);
        }

        peerConnection[cptConnexion].onaddstream = function(e) {
            console.log('stream ajouté');
            otherStream = e.stream;
            // fire event
            socketEvent.eventType = 'streamAdded';
            document.dispatchEvent(socketEvent);
        };

        // lorsque le iceServers nous envois notre iceCandidate on envoit alors cette donnée au client
        peerConnection[cptConnexion].onicecandidate = function(icecandidate) {
            console.log('icecandidate send to room ' + roomId);
            var to = indexOfBitMap();
            if (to === -1) {
                initBitMap();
                to = indexOfBitMap(); // les iceCandidates sont envoyés par udp, il peut donc y avoir des pertes c'est pourquoi 
                // la boite noire webrtc envoit plusieurs fois ce message
            }
            //if (to !== -1) { // le iceCandidate peut être envoyé x fois on a aucun contrôle dessus. Par contre le sdp est envoyé une seule fois
            var data = {
                type: 'iceCandidate',
                roomId: roomId,
                to: to,
                from: myId,
                payload: icecandidate
            };
            console.log("envoi du iceCandidate du client: " + myId + " vers le client :" + to);
            sendToServer(data);
            //}
            console.log("val cptConnexion:" + cptConnexion);

        };

        peerConnection[cptConnexion].createOffer(function(SDP) { // ce message est envoyé une seule fois --> passe par tcp ?
            // set our SDP as local description
            peerConnection[cptConnexion].setLocalDescription(SDP);

            // on envoit la demande de connexion à un autre navigateur
            var data = {
                type: 'ask',
                roomId: roomId,
                to: idMember,
                from: myId,
                payload: SDP
            };
            console.log("envoi du sdp du client: " + myId);
            sendToServer(data);
            cptConnexion++;
            createManyAsk(idMember + 1);

        }, onSdpError, null);
    };

    var createManyAsk = function(idMember) {
        var i = idMember;
        if (i < howMany - 1) { // on évite de s'envoyer à soit même le message, celui qui rejoint un channel est le dernier à avoir rejoint
            createAsk(idMember);
            i++;
        }
    };

    // après avoir reçu des informations de l'utilisateur demandeur on fabrique notre réponse
    // la réponse est symétrique à la demande de connexion à quelques détails près notamment l'ajout du data channel reçu
    var createAnswer = function(d) {
        peerConnection[cptConnexion] = new PeerConnection(iceServers, peerConstraints);

        //ajout de la description du navigateur du demandeur de connexion
        try {
            peerConnection[cptConnexion].setRemoteDescription(createRTCSessionDescription(d.payload));
        } catch (err) {
            console.log("erreur lors de l'ajout de la description d'une session " + err);
            return;
        }

        // ajout du channel qu'on a reçu du demandeur de connexion
        try {
            peerConnection[cptConnexion].ondatachannel = gotReceiveChannel;
            console.log('join dataChannel');
        } catch (err) {
            console.log('erreur lors de l\'ajout d\'un data channel: ' + err);
        }

        try {
            // création du channel où on enverra des donnés
            sendChannel[cptConnexion] = peerConnection[cptConnexion].createDataChannel("sendDataChannel", {reliable: false});
            console.log('Création d\'un data channel dans la réponse');
        } catch (err) {
            console.log('erreur de création de data channel dans la réponse :' + err);
        }

        peerConnection[cptConnexion].onaddstream = function(e) {
            console.log('stream added');
            otherStream = e.stream;
            // fire event
            socketEvent.eventType = 'streamAdded';
            document.dispatchEvent(socketEvent);
        };

        peerConnection[cptConnexion].onicecandidate = function(icecandidate) {
            console.log('icecandidate send to room ' + roomId);
            var data = {
                type: 'iceCandidate',
                roomId: roomId,
                to: d.from,
                from: myId,
                payload: icecandidate
            };
            console.log("envoi du iceCandidate du client: " + myId + " vers le client :" + d.from);
            sendToServer(data);
        };

        peerConnection[cptConnexion].createAnswer(function(SDP) {
            // set our SDP as local description
            peerConnection[cptConnexion].setLocalDescription(SDP);

            // on envoit la réponse de connexion à un autre navigateur
            var data = {
                type: 'answer',
                roomId: roomId,
                to: d.from,
                from: myId,
                payload: SDP
            };
            console.log("envoi du sdp du client: " + myId);
            sendToServer(data);
            console.log("val de cptConnexion dans sdp:" + cptConnexion);
            cptConnexion++;

        }, onSdpError, null);
        console.log("val de cptConnexion dans fin answer :" + cptConnexion);
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
                case 'getMyId':
                    myId = data.id;
                    console.log("id de client reçu: je suis le client: " + myId);
                    break;
                case 'creatRoom':
                    roomId = data.roomId;
                    console.log("room créé : " + roomId);
                    break;
                case 'joinRoom':
                    myId = data.id;
                    console.log("id de client reçu: je suis le client: " + myId);
                    askHowMany();
                    break
                case 'howMany':
                    howMany = data.taille;
                    initBitMap();
                    createManyAsk(0);
                    break;
                case 'ask':
                    console.log("on a reçu une demande de connexion venant de :" + data.from + " la réponse va être produite...");
                    if (data.from < myId) {
                        otherSDP[data.from] = data.payload;
                        console.log("je suis arrivé avant toi");
                    }
                    else {
                        otherSDP[data.from - 1] = data.payload;
                        console.log("je suis arrivé après toi");
                    }
                    console.log("taille de otherSDP: " + otherSDP.length);
                    createAnswer(data);
                    break;
                case 'answer':
                    console.log("réponse reçu venant de:" + data.from);
                    otherSDP[data.from] = data.payload;
                    cptAnswer++;
                    peerConnection[data.from].ondatachannel = gotReceiveChannel;
                    if (cptAnswer === myId)
                        handShakeDone(data);
                    else {
                        peerConnection[data.from].setRemoteDescription(createRTCSessionDescription(otherSDP[data.from]));
                    }
                    break;
                case 'iceCandidate':
                    console.log("iceCandidate reçu venant de :" + data.from);
                    setIceCandidates(data);
                    break;
                default:
                    console.log("message de type inconnu reçu: " + data.type);
                    break;

            }
        };
    };



    //permet de demander son id que le serveur nous fournira en fontion du nbre de perso sur le channel 
    this.joinRoom = function(room) {
        var data = {
            type: 'joinRoom',
            roomId: room
        };
        roomId = room;
        sendToServer(data);
    };

    //permet de demander l'id du channel
    this.createRoom = function() {
        var data = {
            type: 'creatRoom'
        };
        sendToServer(data);
    };

    // on souhaite fermer la connexion avec le serveur
    this.close = function() {
        if (myId !== false) {
            var data = {
                type: 'close',
                roomId: roomId,
                id: myId
            };
            sendToServer(data);
        }
    };

    //fonction pour envoyer des donnés dans des channels
    this.sendData = function() {
        var data = document.getElementById("dataChannelSend").value;
        var i = 0;
        var length = sendChannel.length;
        console.log("il y a " + length + " channels");
        while (i < length) {
            sendChannel[i].send(data);
            i++;
        }
        console.log("message envoyé à " + length + " channel");
    };



    this.openMedia = function() {
        
        var success = function(myStream) {
            var ownVideo = document.getElementById('ownVideo');
            ownVideo.src = URL.createObjectURL(myStream);
            ownVideo.play();
            
            var i = 0;
            var length = peerConnection.length;
            while(i<length){
                peerConnection[i].addStream(myStream);
                i++;
            }
        };
        takeMedia(null, success);
    };

    /*
     * ====================
     * ====== getter ======
     * ====================
     */

    this.getOtherStream = function() {
        return otherStream;
    };

}