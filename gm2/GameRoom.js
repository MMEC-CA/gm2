export class GameRoom {
  constructor(state, env) {
    this.state = state;
    this.sessions = [];
    this.gameState = { players: {} }; // { playerId: { slot, color, x, y } }
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
    const session = { socket, id: sessionId, playerIds: [] };
    this.sessions.push(session);

    // Let's create two players for this session if slots are available
    for (let i = 0; i < 2; i++) {
      const availableSlots = [0, 1, 2, 3];
      const takenSlots = Object.values(this.gameState.players).map(p => p.slot);
      const nextSlot = availableSlots.find(s => !takenSlots.includes(s));

      if (nextSlot !== undefined) {
        const playerId = `${sessionId}-${i}`;
        session.playerIds.push(playerId);
        this.gameState.players[playerId] = {
          slot: nextSlot,
          color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
          x: 100 + Math.random() * 600,
          y: 100 + Math.random() * 400,
        };
      }
    }

    // Send the initial state to the new client
    // The client will identify its players based on the session ID prefix.
    socket.send(JSON.stringify({ type: 'init', state: this.gameState, selfId: sessionId }));

    // Broadcast the updated state to all clients
    this.broadcast(JSON.stringify({ type: 'update', gameState: this.gameState }));

    socket.addEventListener('message', async (message) => {
      try {
        const data = JSON.parse(message.data);
        if (data.type === 'input') {
          this.handleInput(session.playerIds, data.inputs);
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
      this.removeSession(session);
      this.broadcast(JSON.stringify({ type: 'update', gameState: this.gameState }));
    });

    socket.addEventListener('error', (err) => {
      console.error('Socket error:', err);
      this.removeSession(session);
      this.broadcast(JSON.stringify({ type: 'update', gameState: this.gameState }));
    });
  }

  handleInput(playerIds, inputs) {
    const speed = 5;

    // Handle WASD for the first player
    const player1 = this.gameState.players[playerIds[0]];
    if (player1) {
      if (inputs.w) player1.y -= speed;
      if (inputs.s) player1.y += speed;
      if (inputs.a) player1.x -= speed;
      if (inputs.d) player1.x += speed;
    }

    // Handle Arrow keys for the second player
    const player2 = this.gameState.players[playerIds[1]];
    if (player2) {
      if (inputs.ArrowUp) player2.y -= speed;
      if (inputs.ArrowDown) player2.y += speed;
      if (inputs.ArrowLeft) player2.x -= speed;
      if (inputs.ArrowRight) player2.x += speed;
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
        this.removeSession(session);
        return false;
      }
    });
  }

  removeSession(session) {
    session.playerIds.forEach(playerId => {
      delete this.gameState.players[playerId];
    });
    this.sessions = this.sessions.filter((s) => s.id !== session.id);
  }
}