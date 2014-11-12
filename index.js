/**
 * @file Exports a function that creates a Writable stream that buffers and
 * rate-limits asynchronous requests.
 */

"use strict";

var stream = require("stream");

/**
 * Create a buffered, rate-limited Writable Stream.
 *
 * @param {function(batch, requestCompleted)} request The function to execute
 *      on each buffered batch of data. Must accept two arguments:
 *
 *          {array} batch An array of objects written to the Stream. Will be of
 *          length `batchSize` unless it's the last and the number of objects
 *          sent in is not evenly divisible by `batchSize`.
 *
 *          {function} requestCompleted Must be called by the callback sent to
 *          the asynchronous request made by `request()`. This is used to track
 *          the number of live concurrent requests, and thus manage
 *          rate-limiting.
 *
 * @param {int} [batchSize=100] The number of items in each batch.
 * @param {int} [maxLiveRequests=100] The maximum number of incomplete requests
 *      to keep open at any given time.
 * @param {Object} [streamOptions] Options sent to `stream.Writable()`;
 *      for example: `{objectMode: true}`.
 */
function createStream(request, batchSize, maxLiveRequests, streamOptions){
	var writeStream = new stream.Writable(streamOptions);

	var batchSize = batchSize || 100;
	var batch = [];

	// Used to rate-limit the number of open requests.
	var liveRequests = 0;
	var maxLiveRequests = maxLiveRequests || 100;
	var streamPaused = false;

	/**
	 * Signals the completion of a request. Used to decrement `liveRequests`
	 * and manage rate-limiting.
	 */
	function requestCompleted(){
		writeStream.emit("requestCompleted");
	}

	writeStream.on("requestCompleted", function updateLiveRequests(){
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

	writeStream.on("finish", function (){
		if(batch.length > 0){
			request(batch, requestCompleted);
		}
	});

	return writeStream;
}

module.exports = createStream;
