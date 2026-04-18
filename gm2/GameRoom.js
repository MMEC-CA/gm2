export class GameRoom {
  constructor(state, env) {
    this.state = state;
    this.sessions = [];
    this.gameState = {
      players: {}, // { sessionId: { x, y, color } }
    };
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected websocket', { status: 400 });
    }

    const [client, server] = Object.values(new WebSocketPair());
    await this.handleSession(server);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async handleSession(socket) {
    socket.accept();

    const sessionId = crypto.randomUUID();
    this.sessions.push({ socket, id: sessionId });

    // Initialize player state
    this.gameState.players[sessionId] = {
      x: 50 + Math.random() * 100, // Start near the line
      y: 200,
      color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
    };

    // Send the initial state to the new client
    socket.send(JSON.stringify({ type: 'state', state: this.gameState, selfId: sessionId }));

    socket.addEventListener('message', async (message) => {
      try {
        const data = JSON.parse(message.data);
        if (data.type === 'input') {
          this.handleInput(sessionId, data.key);
          this.broadcast(JSON.stringify({ type: 'state', state: this.gameState }));
        }
      } catch (e) {
        console.error('Error parsing message:', e);
      }
    });

    socket.addEventListener('close', () => {
      this.removeSession(sessionId);
      delete this.gameState.players[sessionId];
      this.broadcast(JSON.stringify({ type: 'state', state: this.gameState }));
    });

    socket.addEventListener('error', (err) => {
      console.error('Socket error:', err);
      this.removeSession(sessionId);
      delete this.gameState.players[sessionId];
      this.broadcast(JSON.stringify({ type: 'state', state: this.gameState }));
    });
  }

  handleInput(sessionId, key) {
    const player = this.gameState.players[sessionId];
    if (!player) return;

    const speed = 5;
    switch (key) {
      case 'ArrowUp':
        player.y -= speed;
        break;
      case 'ArrowDown':
        player.y += speed;
        break;
      case 'ArrowLeft':
        player.x -= speed;
        break;
      case 'ArrowRight':
        player.x += speed;
        break;
    }
  }

  broadcast(message) {
    this.sessions = this.sessions.filter((session) => {
      try {
        session.socket.send(message);
        return true;
      } catch (e) {
        console.log('Failed to send to a session, removing it.');
        // If send fails, the socket is likely closed. Remove it.
        delete this.gameState.players[session.id];
        return false;
      }
    });
  }

  removeSession(sessionId) {
    this.sessions = this.sessions.filter((s) => s.id !== sessionId);
  }
}