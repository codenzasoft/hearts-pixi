import { Application } from "pixi.js";
import { GameEventHandler, GameState, SPRITE_POOL } from "./hearts.js";

const wsUrl = import.meta.env.VITE_WS_URL;
const devGameId = import.meta.env.VITE_DEV_GAME_ID;

const getLastPathSegment = (url) => {
  const pathname = new URL(url).pathname;
  const parts = pathname.split("/");
  // The pop() method removes the last element and returns it.
  // Calling it a second time handles cases where the URL ends in a trailing slash.
  return parts.pop() || parts.pop();
};

const getGameId = () => {
  const theUrl = window.location.href;
  let gameId = getLastPathSegment(theUrl);
  if (gameId.length === 0) {
    gameId = devGameId;
    console.log(`Using game ID from env.development: ${gameId}`);
  } else {
    console.log(`Using game ID from window URL: ${gameId}`);
  }
  return gameId;
};

const openWebSocket = (url, eventHandler) => {
  let ws = new WebSocket(url);
  ws.onopen = () => {
    console.log("Connected to WebSocket server");
    eventHandler.setWebsocket(ws);
  };

  ws.onmessage = (event) => {
    // Update PixiJS scene based on the data
    const gameJson = JSON.parse(event.data);
    const gameState = GameState.fromJson(gameJson);
    eventHandler.processEvent(gameState);
    console.log(`Received: ${event.data}`);
  };

  ws.onclose = () => {
    console.log("Disconnected from WebSocket server");
    eventHandler.setWebsocket(null);
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
  };
  return ws;
};

(async () => {
  const gameId = getGameId();

  // Create a new application
  const app = new Application();

  // Initialize the application
  await app.init({ background: "green", resizeTo: window });

  // Append the application canvas to the document body
  document.getElementById("pixi-container").appendChild(app.canvas);

  await SPRITE_POOL.initialize();
  const eventHandler = new GameEventHandler(app);

  openWebSocket(wsUrl + "/games/ws/hearts/" + gameId, eventHandler);

  // Listen for animate update
  // app.ticker.add((time) => {
  //   // Just for fun, let's rotate tbe card a little.
  //   // * Delta is 1 if running at 100% performance *
  //   // * Creates frame-independent transformation *
  //   card.rotation += 0.1 * time.deltaTime;
  // });
})();
