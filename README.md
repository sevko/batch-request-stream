[![Build Status](https://travis-ci.org/sevko/batch-request-stream.svg?branch=master)](https://travis-ci.org/sevko/batch-request-stream)

[![NPM](https://nodei.co/npm/batch-request-stream.png)](https://nodei.co/npm/batch-request-stream/)

# batch request stream
Make batched and rate-limited requests for data flowing through a node.js Stream; useful when you need to make
slow, asynchronous I/O calls (which are optimally batched) for items coming down a fast read stream, and don't want to
throttle the responding service.

## api
The package exports a single function which will create and return a `Writable` stream.

`createBatchRequestStream(options)`

  * `options` is a configuration object which must contain the following mandatory keys and may contain the optional
   ones:
  * `request(batch, requestCompleted)`: The function to execute on each buffered batch of data. Must accept two
   arguments: `batch`, an array of the objects written to the stream, and `requestCompleted`, a function that *must* be
   called by whatever callback is sent to the asynchronous I/O function called inside `request()`; see the example for
   clarification. This is used to keep track of the number of live requests and, thus, for rate-limiting.
  * `batchSize` (**optional**, default value: `100`): The number of items to buffer before calling `request()`. If the
   stream has ended and a non-empty batch remains (because the total number of items written isn't evenly divisible by
   `batchSize`), it'll still be sent to `request()`.
  * `maxLiveRequests` (**optional**, default value: `100`): The maximum number of concurrent requests to keep open.
  * `streamOptions` (**optional**): [Options](http://nodejs.org/api/stream.html#stream_new_stream_writable_options)
   to pass to `new stream.Writable()`.

## example

```javascript
var createBatchRequestStream = require("batch-request-stream");

function request(batch, requestCompleted){
	asyncIORequest(batch, function callback(err){
		requestCompleted(); // MUST be called
	});
}

var batchRequestStream = createBatchRequestStream({
	request: request,
	batchSize: 4,
	maxLiveRequests: 3,
	streamOptions: {objectMode: true}
});

fastReadStream.pipe(batchRequestStream);
```
