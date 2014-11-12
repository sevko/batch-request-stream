/**
 * @file TAP unit-tests for the `/index.js` module.
 */

"use strict";

var createBatchRequestStream = require("../index");
var tap = require("tape");

tap("Test batch-sizes.", function callback(test){
	var batchSize = 4;

	function request(batch, requestCompleted){
		test.equal(batch.length, batchSize, "Batch size matches.");
		requestCompleted();
	}

	var batchRequestStream = new createBatchRequestStream(
		request, batchSize, 2,
		{
			objectMode: true
		}
	);
	for(var num = 0; num < batchSize * 10; num++){
		batchRequestStream.write(num);
	}
	test.end();
});
