/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

//closeButton.onclick = closeDataChannels;

function WebRTC() {

    /*
     * 	Private Attributes
     */
    var moz = !!navigator.mozGetUserMedia;
    var connection = false;
    var roomId = false; // here is the room-ID stored
    var myStream = false; // my media-stream
    var otherStream = false; // other guy`s media-stream
    var sendChannel = new Array();
    var receiveChannel = new Array();
    var nbreChannel = 0;
    var peerConnection = new Array(); // RTCPeerconnection
    var iceServers = [];
    var peerConstraints = {optional: [{RtpDataChannels: true}]};// set DTLS encrpytion
    var otherSDP = false;
    var othersCandidates = []; // other guy's icecandidates
    var PeerConnection = window.RTCPeerConnection
            || window.webkitRTCPeerConnection
            || window.mozRTCPeerConnection;

    var SessionDescription = window.RTCSessionDescription
            || window.webkitRTCSessionDescription
            || window.mozRTCSessionDescription;

    var IceCandidate = window.RTCIceCandidate
            || window.webkitRTCIceCandidate
            || window.mozRTCIceCandidate;
    // via this element we will send events to the view
    var socketEvent = document.createEvent('Event');
    socketEvent.initEvent('socketEvent', true, true);

    /*
     * initialisation de iceServers --> va permettre de récupérer son ip 
     */

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
    /*
     * 	Private Methods
     */

    // encode to JSON and send data to server
    var sendToServer = function(data) {
        try {
            connection.send(JSON.stringify(data));
            return true;
        } catch (e) {
            console.log('There is no connection to the websocket server');
            return false;
        }
    };

    // create ice-candidate
    var createRTCIceCandidate = function(candidate) {
        var ice = new IceCandidate(candidate);
        return ice;
    };

    // create an session description object
    var createRTCSessionDescription = function(sdp) {
        console.log("sdp :" + sdp);
        if (typeof (SessionDescription) == 'function') {
            var newSdp = new SessionDescription(sdp);
            console.log('SessionDescription is a function');
        }
        else
            var newSdp = new RTCSessionDescription(sdp);

        console.log("in createRTCSessionDescription newSdp " + newSdp);
        return newSdp;
    };
    // set or save the icecandidates
    var setIceCandidates = function(iceCandidate) {
        // push icecandidate to array if no SDP of other guys is available
        if (!otherSDP) {
            othersCandidates.push(iceCandidate);
        }
        // add icecandidates immediately if not Firefox & if remoteDescription is set
        if (otherSDP &&
                iceCandidate.candidate &&
                iceCandidate.candidate !== null) {
            peerConnection[nbreChannel].addIceCandidate(createRTCIceCandidate(iceCandidate.candidate));
        }
    };

    // exchange of connection info is done, set SDP and ice-candidates
    var handshakeDone = function() {
        peerConnection[nbreChannel].setRemoteDescription(createRTCSessionDescription(otherSDP));
        // add other guy's ice-candidates to connection
        for (var i = 0; i < othersCandidates.length; i++) {
            if (othersCandidates[i].candidate) {
                peerConnection[nbreChannel].addIceCandidate(createRTCIceCandidate(othersCandidates[i].candidate));
            }
        }
        // fire event
        socketEvent.eventType = 'p2pConnectionReady';
        document.dispatchEvent(socketEvent);
    };

    // create an offer for an peerconnection
    var createOffer = function() {
        peerConnection[nbreChannel] = new PeerConnection(iceServers, peerConstraints);

        try {
            sendChannel[nbreChannel] = peerConnection[nbreChannel].createDataChannel("sendDataChannel", {reliable: false});
            console.log('Created send data channel');
        } catch (err) {
            console.log('dataChannel creation failed ' + err);
        }

        // we receive our icecandidates and send them to the other guy
        peerConnection[nbreChannel].onicecandidate = function(icecandidate) {
            console.log('icecandidate send to room ' + roomId);
            // send candidates to other guy
            var data = {
                type: 'iceCandidate',
                roomId: roomId,
                payload: icecandidate
            };
            sendToServer(data);
        };

        // we actually create the offer
        if (moz) {
            peerConnection[nbreChannel].createOffer(function(SDP) {
                // set our SDP as local description
                peerConnection[nbreChannel].setLocalDescription(SDP);
                console.log('sending offer from :' + SDP.sdp + '\n');
                console.log('sending offer to: ' + roomId);
                // send SDP to other guy
                var data = {
                    type: 'offer',
                    roomId: roomId,
                    payload: SDP
                };
                sendToServer(data);
            }, onSdpError, null);
        }
        else {
            peerConnection[nbreChannel].createOffer(function(SDP) {
                // set our SDP as local description
                peerConnection[nbreChannel].setLocalDescription(SDP);
                console.log('sending offer from :' + SDP.sdp + '\n');
                console.log('sending offer to: ' + roomId);
                // send SDP to other guy
                var data = {
                    type: 'offer',
                    roomId: roomId,
                    payload: SDP
                };
                sendToServer(data);
            });
        }
    };

    // create an answer for an received offer
    var createAnswer = function() {
        // create new peer-object
        peerConnection[nbreChannel] = new PeerConnection(iceServers, peerConstraints);

        // set remote-description
        try {
            peerConnection[nbreChannel].setRemoteDescription(createRTCSessionDescription(otherSDP));
        } catch (err) {
            console.log("failed in setting remote description " + err);
            return;
        }

        // we receive our icecandidates and send them to the other guy
        try {
            peerConnection[nbreChannel].ondatachannel = gotReceiveChannel;
            console.log('join dataChannel');
        } catch (err) {
            console.log('dataChannel joingning ' + err);
        }
        try {
            sendChannel[nbreChannel] = peerConnection[nbreChannel].createDataChannel("sendDataChannel", {reliable: false});
            console.log('Created send data channel');
        } catch (err) {
            console.log('dataChannel creation failed ' + err);
        }

        peerConnection[nbreChannel].onicecandidate = function(icecandidate) {
            console.log('icecandidate send to room ' + roomId);
            // send candidates to other guy
            var data = {
                type: 'iceCandidate',
                roomId: roomId,
                payload: icecandidate
            };
            sendToServer(data);
        };

        // we create the answer
        if (moz) { // utilisation de firefox
            peerConnection[nbreChannel].createAnswer(function(SDP) {
                // set our SDP as local description
                peerConnection[nbreChannel].setLocalDescription(SDP);

                // add other guy's ice-candidates to connection
                for (var i = 0; i < othersCandidates.length; i++) {
                    if (othersCandidates[i].candidate) {
                        peerConnection[nbreChannel].addIceCandidate(ceateRTCIceCandidate(othersCandidates[i].candidate));
                    }
                }

                // send SDP to other guy
                console.log('sending answer from :' + SDP.sdp + '\n');
                console.log('sending answer to: ' + roomId);
                var data = {
                    type: 'answer',
                    roomId: roomId,
                    payload: SDP
                };
                sendToServer(data);
            }, onSdpError, null);
        }
        else {// google chrome
            peerConnection[nbreChannel].createAnswer(function(SDP) {
                // set our SDP as local description
                peerConnection[nbreChannel].setLocalDescription(SDP);

                // add other guy's ice-candidates to connection
                for (var i = 0; i < othersCandidates.length; i++) {
                    if (othersCandidates[i].candidate) {
                        peerConnection[nbreChannel].addIceCandidate(ceateRTCIceCandidate(othersCandidates[i].candidate));
                    }
                }

                // send SDP to other guy
                //console.log('val dsp :'+SDP);
                var data = {
                    type: 'answer',
                    roomId: roomId,
                    payload: SDP
                };
                sendToServer(data);
            });
        }
    };

    var onSdpError = function(e) {
        var message = JSON.stringify(e, null, '\t');

        if (message.indexOf('RTP/SAVPF Expects at least 4 fields') != -1) {
            message = 'It seems that you are trying to interop RTP-datachannels with SCTP. It is not supported!';
        }

        console.error('onSdpError:', message);
    }

    /*
     * 	Public Methods
     */

    // this function handles all the websocket-stuff
    this.connectToSocket = function(wsUrl) {
        // open the websocket
        connection = new WebSocket(wsUrl);

        // connection was successful
        connection.onopen = function(event) {
            console.log((new Date()) + ' Connection successfully established');
        };

        // connection couldn't be established
        connection.onerror = function(error) {
            console.log((new Date()) + ' WebSocket connection error: ');
            console.log(error);
        };

        // connection was closed
        connection.onclose = function(event) {
            console.log((new Date()) + ' Connection was closed');
        };

        // this function is called whenever the server sends some data
        connection.onmessage = function(message) {
            try {
                var data = JSON.parse(message.data);
            } catch (e) {
                console.log('This doesn\'t look like a valid JSON or something else went wrong.');
                console.log(message);
                return;
            }
            switch (data.type) {
                // the server has created a room and returns the room-ID
                case 'roomCreated':
                    // set room
                    roomId = data.payload;

                    // fire event
                    socketEvent.eventType = 'roomCreated';
                    document.dispatchEvent(socketEvent);
                    break;
                    // other guy wants to join our room
                case 'offer':
                    console.log('offer received, answer will be created');
                    try {
                        otherSDP = data.payload;
                    } catch (err) {
                        console.log("data failed after offer received :" + err);
                    }
                    createAnswer();
                    break;
                    // we receive the answer
                case 'answer':
                    console.log('answer received, connection will be established');
                    otherSDP = data.payload;
                    peerConnection[nbreChannel].ondatachannel = gotReceiveChannel;
                    handshakeDone();
                    break;
                    // we receive icecandidates from the other guy
                case 'iceCandidate':
                    setIceCandidates(data.payload);
                    break;
            }
        };
    };

    this.getRoomId = function() {
        return roomId;
    };

    // this function tells the server to create a new room
    this.createRoom = function() {
        console.log("entrer dans creatRoom");
        // create data-object
        var data = {
            type: 'createRoom',
            payload: false
        };
        console.log("sortie de creatRoom--> on va envoyer des fuckings données");
        // send data-object to server
        return sendToServer(data);
    };
    // connect to a room
    this.joinRoom = function(id) {
        roomId = id;
        createOffer();
    };

    // methode permettant d'envoyer des datas
    this.sendData = function() {
        var data = document.getElementById("dataChannelSend").value;
        for (var i = 0; i < nbreChannel; i++) {
            sendChannel[i].send(data);
        }
        console.log('Sent data to '+nbreChannel+' channel: ' + data);
    };

    //methode permettant de recevoir des data
    function receiveData(event) {
        console.log('Received message: ' + event.data);
        document.getElementById("dataChannelReceive").value = event.data;
    }

    // fonction permettant de recevoir le channel de data
    function gotReceiveChannel(event) {
        console.log('Receive Channel Callback');
        receiveChannel[nbreChannel] = event.channel;
        receiveChannel[nbreChannel].onmessage = receiveData;
        nbreChannel++;
    }
}