var once = require('once');

var noop = function() {};

var isRequest = function(stream) {
	return stream.setHeader && typeof stream.abort === 'function';
};

var isChildProcess = function(stream) {
	return stream.stdio && Array.isArray(stream.stdio) && stream.stdio.length === 3
};

var dWebEOS = function(stream, opts, callback) {
	if (typeof opts === 'function') return dWebEOS(stream, null, opts);
	if (!opts) opts = {};

	callback = once(callback || noop);

	var dwWriteStream = stream._writableState;
	var dwReadStream = stream._readableState;
	var dwReadableStream = opts.readable || (opts.readable !== false && stream.readable);
	var dwWritableStream = opts.writable || (opts.writable !== false && stream.writable);

	var onDwOriginalFinish = function() {
		if (!stream.writable) onDwFinish();
	};

	var onDwFinish = function() {
		dwWritableStream = false;
		if (!dwReadableStream) callback.call(stream);
	};

	var onDwEnd = function() {
		dwReadableStream = false;
		if (!dwWritableStream) callback.call(stream);
	};

	var onDwExit = function(exitCode) {
		callback.call(stream, exitCode ? new Error('exited with error code: ' + exitCode) : null);
	};

	var onDwError = function(err) {
		callback.call(stream, err);
	};

	var onDwClose = function() {
		if (dwReadableStream && !(dwReadStream && dwReadStream.ended)) return callback.call(stream, new Error('premature close'));
		if (dwWritableStream && !(dwWriteStream && dwWriteStream.ended)) return callback.call(stream, new Error('premature close'));
	};

	var onDwRequest = function() {
		stream.req.on('finish', onDwFinish);
	};

	if (isRequest(stream)) {
		stream.on('complete', onDwFinish);
		stream.on('abort', onDwClose);
		if (stream.req) onDwRequest();
		else stream.on('request', onDwRequest);
	} else if (dwWritableStream && !dwWriteStream) { // original streams
		stream.on('end', onDwOriginalFinish);
		stream.on('close', onDwOriginalFinish);
	}

	if (isChildProcess(stream)) stream.on('exit', onDwExit);

	stream.on('end', onDwEnd);
	stream.on('finish', onDwFinish);
	if (opts.error !== false) stream.on('error', onDwError);
	stream.on('close', onDwClose);

	return function() {
		stream.removeListener('complete', onDwFinish);
		stream.removeListener('abort', onDwClose);
		stream.removeListener('request', onDwRequest);
		if (stream.req) stream.req.removeListener('finish', onDwFinish);
		stream.removeListener('end', onDwOriginalFinish);
		stream.removeListener('close', onDwOriginalFinish);
		stream.removeListener('finish', onDwFinish);
		stream.removeListener('exit', onDwExit);
		stream.removeListener('end', onDwEnd);
		stream.removeListener('error', onDwError);
		stream.removeListener('close', onDwClose);
	};
};

module.exports = dWebEOS;
