const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusDiv = document.getElementById('status');

let gameState = { players: {} };
let selfId = null;

function connect() {
  const urlParams = new URLSearchParams(window.location.search);
  const gameId = urlParams.get('gameId');

  if (!gameId) {
    statusDiv.textContent = 'No game ID found. Redirecting...';
    // In a real scenario, you might redirect to a lobby page.
    // For now, we just show an error.
    window.location.href = '/gm2/'; // Redirect to get a new gameId
    return;
  }

  statusDiv.textContent = `Connecting to game ${gameId}...`;

  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${wsProtocol}//${window.location.host}/api/game/${gameId}`;
  const socket = new WebSocket(wsUrl);

  socket.addEventListener('open', () => {
    statusDiv.textContent = 'Connected! Use arrow keys to move.';
  });

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'state') {
      gameState = message.state;
      if (message.selfId) {
        selfId = message.selfId;
      }
      requestAnimationFrame(draw);
    }
  });

  socket.addEventListener('close', () => {
    statusDiv.textContent = 'Connection lost. Please refresh.';
  });

  socket.addEventListener('error', (err) => {
    console.error('WebSocket Error:', err);
    statusDiv.textContent = 'Connection error.';
  });

  document.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'input', key: event.key }));
      }
    }
  });
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw finish line
  ctx.fillStyle = '#00ff00';
  ctx.fillRect(0, 50, canvas.width, 5);
  ctx.fillStyle = '#000';
  ctx.fillText('Finish', canvas.width / 2 - 20, 40);

  // Draw players
  for (const id in gameState.players) {
    const player = gameState.players[id];
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 10, 0, 2 * Math.PI); // Draw as circles
    ctx.fill();

    if (id === selfId) {
      ctx.strokeStyle = 'black';
      ctx.stroke();
    }
  }
}

connect();