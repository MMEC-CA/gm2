/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { GameRoom } from './GameRoom.js';

export { GameRoom };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle WebSocket upgrade requests for game rooms.
    if (path.startsWith('/gm2/api/game')) {
      const gameId = url.searchParams.get('gameId');
      if (!gameId) {
        return new Response('Invalid game ID', { status: 400 });
      }
      const id = env.GAME_ROOM.idFromName(gameId);
      const stub = env.GAME_ROOM.get(id);

      return stub.fetch(request);
    }

    // Serve the static assets from the pages build output directory
    if (path.startsWith('/gm2/')) {
      // Create a new request with the /gm2/ prefix removed for asset matching
      const assetPath = path.substring(4) || '/'; // /gm2/ -> /
      const assetUrl = new URL(assetPath, request.url);
      const assetRequest = new Request(assetUrl, request);
      return env.ASSETS.fetch(assetRequest);
    }

    // For the root path, redirect to a new game lobby.
    if (path === '/' || path === '/gm2' || path === '/gm2/') {
      const newGameId = crypto.randomUUID();
      return Response.redirect(`${url.origin}/gm2/index.html?gameId=${newGameId}`, 302);
    }

    return new Response('Not found', { status: 404 });
  },
};