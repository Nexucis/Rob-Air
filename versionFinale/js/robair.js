function Robair(){

   /* private attributes   */
   var connection = false;
   /* private methode */
   var sendToServer = function(data) {
        try {
            connection.send(JSON.stringify(data));
            return true;
        } catch (e) {
            console.log('There is no connection to the websocket server');
            return false;
        }
    };

    /* public methode*/
   
    this.connectToSocket = function(wsUrl) {
       connection = new WebSocket(wsUrl);
       console.log(connection)

       connection.onopen = function(event) {
            console.log((new Date()) + ' Connection from RoBair to local websocket successfully established');
        };

        // connection couldn't be established
        connection.onerror = function(error) {
            console.log((new Date()) + ' WebSocket connection error: ');
            console.log(error);
        };

	connection.onclose = function(event) {
            console.log((new Date()) + ' Connection was closed');
        };
    }

    this.say = function(str){
        console.log("RobAir says something");
	var data = {
                type: 'message',
                payload: str
            };
        sendToServer(data);
    }
}
