//Code found on : https://developer.mozilla.org/fr/docs/WebRTC/Prendre_des_photos_avec_la_webcam#Le_script_complet

(function() {
//To avoid global variables, it encapsulates the script in an anonymous function. We capture the HTML elements we need and we define a width of video
//with height = 0. The proper height will be calculated later

  var streaming = false,
      video        = document.querySelector('#video'),
      cover        = document.querySelector('#cover'),
      canvas       = document.querySelector('#canvas'),
      photo        = document.querySelector('#photo'),
      startbutton  = document.querySelector('#startbutton'),
      width = 500,
      height = 0;

//Now we need to retrieve the video from the webcam. For now it is prefixed by different browsers, so we must test what form is supported
navigator.getMedia = ( navigator.getUserMedia || 
                         navigator.webkitGetUserMedia ||
                         navigator.mozGetUserMedia ||
                         navigator.msGetUserMedia);

//Nous demandons au navigateur de nous donner la vidéo SANS le son et de récupérer le flux dans une fonction callback:
  navigator.getMedia(
    { 
      video: true, 
      audio: false
    },
    function(stream) {
      if (navigator.mozGetUserMedia) { 
        video.mozSrcObject = stream;
      } else {
        var vendorURL = window.URL || window.webkitURL;
        video.src = vendorURL ? vendorURL.createObjectURL(stream) : stream;
      }
      video.play();
    },
    function(err) {
      console.log("An error occured! " + err);
    }
  );

// A SAVOIR: Firefox Nightly nécessite que vous positionnez la propriété mozSrcObject de l'élément vidéo pour pouvoir le jouer; pour les autres navigateurs, positionnez l'attribut src. Alors que Firefox 
//peut utiliser les flux directement, Webkit et Opera ont besoin de créer un objet URL. Cela sera standardisé dans le futur proche.


//Then we must resize the video to good size.
  ownVideo.addEventListener('canplay', function(ev){
    if (!streaming) {
      height = video.videoHeight /10;//video.videoHeight / (video.videoWidth/width);
      video.setAttribute('width', width);
      video.setAttribute('height', height);
      canvas.setAttribute('width', width);
      canvas.setAttribute('height', height);
      streaming = true;
    }
  }, false);

  function takepicture() {
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(video, 0, 0, width, height);
    var data = canvas.toDataURL('image/png');
    photo.setAttribute('src', data);
  }

  startbutton.addEventListener('click', function(ev){
      takepicture();
    ev.preventDefault();
  }, false);

})();


