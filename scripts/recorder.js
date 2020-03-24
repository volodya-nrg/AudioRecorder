(function(window){

 	var WORKER_PATH = 'scripts/recorderWorker.js';

	var Recorder = function(source, cfg){
		var config = cfg || {};
		var bufferLen = 16384;
		this.context = source.context;
		this.node = (this.context.createScriptProcessor ||  this.context.createJavaScriptNode).call(this.context, bufferLen, 2, 2);
		var worker = new Worker(config.workerPath || WORKER_PATH);
		
		worker.postMessage({
			command: 'init',
			config: {
				sampleRate: this.context.sampleRate
			}
		});
		
		var recording = false,
		currCallback;
		
		this.node.onaudioprocess = function(e){
			if (!recording) 
				return;
			
			worker.postMessage({
				command: 'record',
				buffer: [
							e.inputBuffer.getChannelData(0),
							e.inputBuffer.getChannelData(1)
						]
			});
		}
		
		this.record = function(){
			recording = true;
		}
		
		this.stop = function(cb){
			currCallback = cb || config.callback;
			if (!currCallback) 
				throw new Error('Callback not set');
			
			// пока уберем чтоб не конвертировать в mp3
			worker.postMessage({
				command: 'exportMP3'
			});
			recording = false;
		}
		
		worker.onmessage = function(e){
			var blob = e.data;
			currCallback(blob);
			uploadAudio(blob); // моя доработка
			worker.terminate();
		}
		// тут тоже продублировал
		function uploadAudio(wavData){
			var reader = new FileReader();
			
			reader.onload = function(event){
				var fd = new FormData();
				var wavName = encodeURIComponent('audio_recording_' + new Date().getTime() + '.mp3');
				
				fd.append('fname', wavName);
				fd.append('data', event.target.result);
				$.ajax({
					type: 'POST',
					url: 'upload.php',
					data: fd,
					processData: false,
					contentType: false
				}).done(function(data) {
					console.log(data);
					log.innerHTML += "\n" + data;
				});
			};
			
			reader.readAsDataURL(wavData);
		}
		source.connect(this.node);
  };

  window.Recorder = Recorder;
})(window);
