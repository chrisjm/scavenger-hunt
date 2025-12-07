import { Server } from 'socket.io';

export function setupSocketIO(server) {
	const io = new Server(server, {
		cors: {
			origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:5173'],
			methods: ['GET', 'POST']
		}
	});

	// Socket.IO connection handling
	io.on('connection', (socket) => {
		console.log('User connected:', socket.id);

		socket.on('join-room', (userId) => {
			socket.join('scavenger-hunt');
			console.log(`User ${userId} joined the scavenger hunt room`);
		});

		socket.on('disconnect', () => {
			console.log('User disconnected:', socket.id);
		});
	});

	return io;
}
