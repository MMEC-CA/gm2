export class GameRoom {
  constructor(state, env) {
    this.state = state;
    this.sessions = [];
    this.gameState = { players: {} }; // { sessionId: { slot, color, x, y } }
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

    const availableSlots = [0, 1, 2, 3];
    const takenSlots = Object.values(this.gameState.players).map(p => p.slot);
    const nextSlot = availableSlots.find(s => !takenSlots.includes(s));

    // Initialize player state
    if (nextSlot !== undefined) {
      this.gameState.players[sessionId] = {
        slot: nextSlot,
        color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
        x: 100 + Math.random() * 600,
        y: 100 + Math.random() * 400,
      };
    }

    // Send the initial state to the new client
    socket.send(JSON.stringify({ type: 'init', state: this.gameState, selfId: sessionId }));

    // Broadcast the updated state to all clients
    this.broadcast(JSON.stringify({ type: 'update', gameState: this.gameState }));

    socket.addEventListener('message', async (message) => {
      try {
        const data = JSON.parse(message.data);
        if (data.type === 'input') {
          this.handleInput(sessionId, data.inputs);
          this.broadcast(JSON.stringify({ type: 'update', gameState: this.gameState }));
        } else if (data.type === 'reset') {
          this.resetGame();
          this.broadcast(JSON.stringify({ type: 'update', gameState: this.gameState }));
        }
      } catch (e) {
        console.error('Error parsing message:', e);
      }
    });

    socket.addEventListener('close', () => {
      this.removeSession(sessionId);
      this.broadcast(JSON.stringify({ type: 'update', gameState: this.gameState }));
    });

    socket.addEventListener('error', (err) => {
      console.error('Socket error:', err);
      this.removeSession(sessionId);
      this.broadcast(JSON.stringify({ type: 'update', gameState: this.gameState }));
    });
  }

  handleInput(sessionId, inputs) {
    const player = this.gameState.players[sessionId];
    if (!player) return;

    const speed = 5;
    if (inputs.w) {
      player.y -= speed;
    }
    if (inputs.s) {
      player.y += speed;
    }
    if (inputs.a) {
      player.x -= speed;
    }
    if (inputs.d) {
      player.x += speed;
    }
  }

  resetGame() {
    for (const playerId in this.gameState.players) {
      const player = this.gameState.players[playerId];
      player.x = 100 + Math.random() * 600;
      player.y = 100 + Math.random() * 400;
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
    delete this.gameState.players[sessionId];
    this.sessions = this.sessions.filter((s) => s.id !== sessionId);
  }
}