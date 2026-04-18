const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusDiv = document.getElementById('status');
const resetButton = document.getElementById('resetButton');

let gameState = { players: {} };
let selfId = null;
let socket = null;
const inputs = {
  w: false,
  a: false,
  s: false,
  d: false,
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
};

function connect() {
  statusDiv.textContent = 'Connecting to game...';

  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const gameId = new URLSearchParams(window.location.search).get('gameId');
  const wsUrl = `${wsProtocol}//${window.location.host}/gm2/api/game?gameId=${gameId}`;
  socket = new WebSocket(wsUrl);

  socket.addEventListener('open', () => {
    statusDiv.textContent = 'Connected! Use WASD and Arrow Keys to move.';
  });

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'init') {
      selfId = message.selfId;
      gameState = message.state;
    } else if (message.type === 'update') {
      gameState = message.gameState;
    }
    requestAnimationFrame(draw);
  });

  socket.addEventListener('close', () => {
    statusDiv.textContent = 'Connection lost. Please refresh.';
  });

  socket.addEventListener('error', () => {
    statusDiv.textContent = 'Connection error.';
  });

  return socket;
}

function setupInputListeners() {
  const sendInput = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'input', inputs }));
    }
  };

  document.addEventListener('keydown', (e) => {
    if (inputs.hasOwnProperty(e.key)) {
      if (!inputs[e.key]) {
        inputs[e.key] = true;
        sendInput();
      }
    }
  });

  document.addEventListener('keyup', (e) => {
    if (inputs.hasOwnProperty(e.key)) {
      if (inputs[e.key]) {
        inputs[e.key] = false;
        sendInput();
      }
    }
  });

  resetButton.addEventListener('click', () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'reset' }));
    }
  });
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw player slots
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = '#ccc';
    ctx.fillRect(10 + i * 60, 10, 50, 50);
  }

  // Draw players
  for (const playerId in gameState.players) {
    const player = gameState.players[playerId];
    ctx.fillStyle = player.color; // Use player's color for their marble
    ctx.fillRect(10 + player.slot * 60, 10, 50, 50); // Draw player in their slot

    // Draw the player's marble on the canvas
    ctx.beginPath();
    ctx.arc(player.x, player.y, 10, 0, 2 * Math.PI);
    ctx.fill();

    if (selfId && playerId.startsWith(selfId)) {
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 3;
      ctx.strokeRect(10 + player.slot * 60, 10, 50, 50);
    }
  }
}

socket = connect();
setupInputListeners();
draw();