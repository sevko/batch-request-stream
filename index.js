/**
 * @file Exports a function that creates a Writable stream that buffers and
 * rate-limits asynchronous requests.
 */

"use strict";

var stream = require("stream");

/**
 * Create a buffered, rate-limited Writable Stream.
 *
 * @param options Configuration object, which must contain the following
 *      mandatory keys and may contain the optional ones (note JSDoc `[]`
 *      syntax for optional values).
 *
 *      {function(batch, requestCompleted)} request The function to execute
 *          on each buffered batch of data. Must accept two arguments:
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
 *      {int} [batchSize=100] The number of items in each batch.
 *      {int} [maxLiveRequests=100] The maximum number of incomplete requests
 *          to keep open at any given time.
 *      {Object} [streamOptions] Options sent to `stream.Writable()`;
 *          for example: `{objectMode: true}`.
 */
function createStream(options){
	var writeStream = new stream.Writable(options.streamOptions);

	var batchSize = options.batchSize || 100;
	var batch = [];

	// Used to rate-limit the number of open requests.
	var liveRequests = 0;
	var maxLiveRequests = options.maxLiveRequests || 100;
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
			options.request(batch, requestCompleted);
			batch = [];

			if(liveRequests >= maxLiveRequests){
				streamPaused = true;
				this.once("resumeStream", next);
				return;
			}
		}
		next();
	};

	writeStream.on("finish", function (){
		if(batch.length > 0){
			options.request(batch, requestCompleted);
		}
	});

	return writeStream;
}

module.exports = createStream;
