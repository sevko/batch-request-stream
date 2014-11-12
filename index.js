"use strict";

var stream = require("stream");

function createStream(request, batchSize, maxLiveRequests, streamOptions){
	var batchSize = batchSize || 100;
	var batch = [];

	var maxLiveRequests = maxLiveRequests || 100;
	var liveRequests = 0;

	/**
	 * @TODO: Integrate streamEnded.
	 */
	var streamEnded = false;
	var streamPaused = false;

	var writeStream = new stream.Writable(streamOptions);

	function requestCompleted(){
		writeStream.emit("requestCompleted");
	}

	writeStream.on("requestCompleted", function requestCompleted(){
		liveRequests--;
		if(streamPaused && liveRequests < maxLiveRequests){
			streamPaused = false;
			writeStream.emit("resumeStream");
		}
	});

	writeStream._write = function _write(data, enc, next){
		batch.push(data);
		if(batch.length == batchSize){
			liveRequests++;
			request(batch, requestCompleted);
			batch = [];

			if(liveRequests >= maxLiveRequests){
				streamPaused = true;
				this.once("resumeStream", next);
			}
			else {
				next();
			}
		}
		else {
			next();
		}
	};
	return writeStream;
}

module.exports = createStream;
