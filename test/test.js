/**
 * @file TAP unit-tests for the `/index.js` module.
 */

"use strict";

var createBatchRequestStream = require("../index");
var tap = require("tape");

tap("Test batch-sizes.", function callback(test){
	var batchSize = 4;
	var numItems = batchSize * 5;

	function request(batch, requestCompleted){
		test.equal(batch.length, batchSize, "Batch size matches.");
		requestCompleted();
	}

	var batchRequestStream = new createBatchRequestStream(
		request, batchSize, 2, {objectMode: true}
	);
	for(var num = 0; num < numItems; num++){
		batchRequestStream.write(num);
	}
	test.end();
});

tap("Test rate-limiting.", function callback(test){
	var batchSize = 4;
	var numItems = batchSize * 5;
	var numLiveRequests = 0;
	var maxLiveRequests = 2;
	var sumRequests = 0;

	function request(batch, requestCompleted){
		var currRequestNum = ++sumRequests;
		numLiveRequests++;
		test.ok(
			numLiveRequests <= maxLiveRequests,
			"Number of live requests less than maxLiveRequests."
		);
		setTimeout(function handleRequest(){
			numLiveRequests--;
			requestCompleted();
			if(currRequestNum == numItems / batchSize){
				test.end();
			}
		}, 100);
	}

	var batchRequestStream = new createBatchRequestStream(
		request, batchSize, maxLiveRequests, {objectMode: true}
	);

	for(var num = 0; num < numItems; num++){
		batchRequestStream.write(num);
	}
});
