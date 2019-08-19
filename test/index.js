var ws = require('../index.js');
var http = require('http');

var wss = ws.createServer(function(c) {
	c.on('data', function(frm) {
		c.write(new TextDecoder().decode(frm.PayloadData));
	});
});
hp = http.createServer(function(req, res) {
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
