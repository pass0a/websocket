import * as http from 'http';

export interface websocket {
	/**
         * events.EventEmitter
         * 1. close
         * 2. disconnect
         * 3. error
         * 4. exit
         * 5. message
         */
	write(buf: any): void;
	on(event: string, listener: (...args: any[]) => void): this;
	on(event: 'close', listener: (code: number, signal: string) => void): this;
	filter(request: http.IncomingMessage, response: http.ServerResponse): void;
}

// no `options` definitely means stdout/stderr are `string`.
export function createServer(...args: any[]): websocket;
