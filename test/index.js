var ws = require('../index.js');
var http = require('http');

var wss = ws.createServer(function(c) {
	c.on('data', function(frm) {
		c.write(Buffer.from(new Uint8Array(200000)));
	});
});
hp = http.createServer(function(req, res) {
	console.log('server is begin!!!');
	var body = '';
	req.on('data', function(buf) {
		if (body == undefined) {
			body = buf;
		} else {
			body += buf;
		}
	});
	req.on('end', function() {
		wss.filter(req, res);
	});
});
hp.listen(6009);
