const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusDiv = document.getElementById('status');
const resetButton = document.getElementById('resetButton');

let gameState = { players: {}, marble: { x: 0, y: 0 } };
let selfId = null;
let socket = null;
const inputs = { w: false, a: false, s: false, d: false };

function connect() {
  statusDiv.textContent = 'Connecting to game...';

  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const gameId = new URLSearchParams(window.location.search).get('gameId');
  const wsUrl = `${wsProtocol}//${window.location.host}/gm2/api/game?gameId=${gameId}`;
  socket = new WebSocket(wsUrl);

  socket.addEventListener('open', () => {
    statusDiv.textContent = 'Connected! Use WASD to move the marble.';
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
  for (const id in gameState.players) {
    const player = gameState.players[id];
    ctx.fillStyle = player.color;
    ctx.fillRect(10 + player.slot * 60, 10, 50, 50);

    if (id === selfId) {
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 3;
      ctx.strokeRect(10 + player.slot * 60, 10, 50, 50);
    }
  }

  // Draw marble
  ctx.beginPath();
  ctx.arc(gameState.marble.x, gameState.marble.y, 10, 0, 2 * Math.PI);
  ctx.fillStyle = 'black';
  ctx.fill();
}

socket = connect();
setupInputListeners();
draw();