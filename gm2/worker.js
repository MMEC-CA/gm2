/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Serve the static assets from the pages build output directory
    if (path.startsWith('/gm2/')) {
      // This request is for a static asset.
      // In a real-world scenario, you'd serve files from the `pages_build_output_dir`.
      // However, in this integrated environment, we let the default Pages handling serve it.
      // This block is conceptually important for local testing (`wrangler dev`).
      return env.ASSETS.fetch(request);
    }

    // Handle WebSocket upgrade requests for game rooms.
    if (path.startsWith('/api/game/')) {
      const gameId = path.split('/')[3];
      if (!gameId) {
        return new Response('Invalid game ID', { status: 400 });
      }

      const id = env.GAME_ROOM.idFromName(gameId);
      const stub = env.GAME_ROOM.get(id);

      return stub.fetch(request);
    }

    // For the root path, redirect to a new game lobby.
    if (path === '/gm2/' || path === '/gm2') {
      const newGameId = crypto.randomUUID();
      return Response.redirect(`${url.origin}/gm2/index.html?gameId=${newGameId}`, 302);
    }

    return new Response('Not found', { status: 404 });
  },
};