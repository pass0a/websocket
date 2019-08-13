function Server(fconnect) {
	var s;
	var fconnect;
	var crypto = require('crypto');
	var WS = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
	var stream;
	var ev = [];
	var buffer = new Buffer(0);

	this.decodeDataFrame = function() {
		var i = 0,
			j,
			s;
		var frame = {
			// 解析前两个字节的基本数据
			FIN: buffer[i] >> 7,
			Opcode: buffer[i++] & 15,
			Mask: buffer[i] >> 7,
			PayloadLength: buffer[i++] & 0x7f
		};

		if (!frame.FIN) return false;
		// 处理特殊长度126和127
		if (frame.PayloadLength === 126) {
			if (buffer.length < 5) return false;
			frame.PayloadLength = (buffer[i++] << 8) + buffer[i++];
		}
		if (frame.PayloadLength === 127) {
			// 长度一般用四字节的整型，前四个字节通常为长整形留空的
			if (buffer.length < 11) return false;
			i += 4;
			frame.PayloadLength = (buffer[i++] << 24) + (buffer[i++] << 16) + (buffer[i++] << 8) + buffer[i++];
		}
		// 判断是否使用掩码
		if (frame.Mask) {
			// 获取掩码实体
			if (buffer.length < frame.PayloadLength + 4 + i) return false;
			frame.MaskingKey = [ buffer[i++], buffer[i++], buffer[i++], buffer[i++] ];
			// 对数据和掩码做异或运算
			stream = new Uint8Array(frame.PayloadLength);
			for (j = 0; j < frame.PayloadLength; j++) {
				stream[j] = buffer[i + j] ^ frame.MaskingKey[j % 4];
			}
		} else {
			if (buffer.length < frame.PayloadLength + i) return false;
			stream = buffer.slice(i, frame.PayloadLength + i); // 否则直接使用数据
		}
		// 设置上数据部分
		frame.PayloadData = stream;
		buffer = buffer.slice(frame.PayloadLength + i);

		// 返回数据帧
		return frame;
	};

	this.encodeDataFrame = function(data) {
		var head = [];
		var body = new Buffer(data.PayloadData);
		var l = body.length;
		// 输入第一个字节
		head.push((data.FIN << 7) + data.Opcode);
		// 输入第二个字节，判断它的长度并放入相应的后续长度消息
		// 永远不使用掩码
		if (l < 126) {
			head.push(l);
		} else if (l < 0x10000) {
			head.push(126, (l & 0xff00) >> 8, l & 0xff);
		} else {
			head.push(
				127,
				0,
				0,
				0,
				0, // 8字节数据，前4字节一般没用留空
				(l & 0xff000000) >> 24,
				(l & 0xff0000) >> 16,
				(l & 0xff00) >> 8,
				l & 0xff
			);
		}
		// 返回头部分和数据部分的合并缓冲区
		return Buffer.concat([ Buffer.from(head), body ]);
	};
	this.on = function(name, fp) {
		ev[name] = fp;
	};
	function onData(buf) {
		buffer = Buffer.concat([ buffer, Buffer.from(buf) ]);
		var frm;
		while ((frm = this.decodeDataFrame(buffer))) {
			console.log(frm.PayloadLength);
			ev['data'](frm);
		}
	}
	this.write = function(buf) {
		if (s) {
			var frm = { FIN: 1 };
			switch (buf.constructor.name) {
				case 'Uint8Array':
				case 'Buffer':
					frm.Opcode = 2;
					frm.PayloadData = buf;
					break;
				case 'String':
					frm.Opcode = 1;
					frm.PayloadData = buf;
					break;
				default:
					frm.Opcode = 1;
					frm.PayloadData = JSON.stringify(buf);
					break;
			}
			var data = this.encodeDataFrame(frm);
			s.write(data);
		}
	};
	this.filter = function(req, res) {
		if (req.getHeader('Upgrade') == 'websocket') {
			var key = req.getHeader('Sec-WebSocket-Key');
			key = crypto.createHash('sha1').update(key + WS).digest('base64');
			var head = {
				Upgrade: 'websocket',
				Connection: 'Upgrade',
				'Sec-WebSocket-Accept': key
			};
			if (req.getHeader('Sec-WebSocket-Protocol') != undefined) {
				head['Sec-WebSocket-Protocol'] = req.getHeader('Sec-WebSocket-Protocol');
			}
			res.writeHead(101, head);
			s = req.toSession();
			s.on('data', onData.bind(this));
			s.on('close', function() {
				s = undefined;
			});
			if ('function' == typeof fconnect) {
				fconnect(this);
			}
		}
	};
}
exports.createServer = function(fn) {
	//console.log("[test] websocket.createServer");
	return new Server(fn);
};
