/**
 * @file TAP unit-tests for the `../index` module.
 */

"use strict";

var createBatchRequestStream = require("../index");
var tap = require("tape");

/**
 * Test whether `createBatchRequestStream()` is buffering the correct number of
 * items per request, by checking the length of the `buffer` argument passed to
 * the `request()` callback.
 */
tap("Test batch-sizes.", function callback(test){
	var batchSize = 4;
	var numItems = batchSize * 5;

	function request(batch, requestCompleted){
		test.equal(batch.length, batchSize, "Batch size matches.");
		requestCompleted();
	}

	var batchRequestStream = new createBatchRequestStream({
		request: request,
		batchSize: batchSize,
		maxLiveRequests: 2,
		streamOptions: {objectMode: true}
	});
	for(var num = 0; num < numItems; num++){
		batchRequestStream.write(num);
	}
	test.end();
});

/**
 * Test whether `createBatchRequestStream()` is keeping less than
 * `maxLiveRequests` requests open at any given time, by keeping internal
 * counters that are incremented and decremented by the `request()` callback.
 */
tap("Test rate-limiting.", function callback(test){
	var batchSize = 4;
	var numItems = batchSize * 5;

	// Used to test rate-limiting in `request()`.
	var numLiveRequests = 0;
	var maxLiveRequests = 2;

	// Used to call `test.end()` when the last request has been sent.
	var sumRequests = 0;

	function request(batch, requestCompleted){
		var currRequestNum = ++sumRequests;
		numLiveRequests++;
		test.ok(
			numLiveRequests <= maxLiveRequests,
			"Number of live requests less than maxLiveRequests."
		);

		// Simulate an async I/O request.
		setTimeout(function handleRequest(){
			numLiveRequests--;
			requestCompleted();
			if(currRequestNum == numItems / batchSize){
				test.end();
			}
		}, 100);
	}

	var batchRequestStream = new createBatchRequestStream({
		request: request,
		batchSize: batchSize,
		maxLiveRequests: maxLiveRequests,
		streamOptions: {objectMode: true}
	});

	for(var num = 0; num < numItems; num++){
		batchRequestStream.write(num);
	}
});
