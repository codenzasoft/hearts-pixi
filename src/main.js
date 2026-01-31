import { Application, Assets, Sprite } from "pixi.js";

// const apiUrl = import.meta.env.VITE_API_URL;
const wsUrl = import.meta.env.VITE_WS_URL;

const getLastPathSegment = (url) => {
  const pathname = new URL(url).pathname;
  const parts = pathname.split("/");
  // The pop() method removes the last element and returns it.
  // Calling it a second time handles cases where the URL ends in a trailing slash.
  return parts.pop() || parts.pop();
};

const openWebSocket = (url) => {
  let ws = new WebSocket(url);
  ws.onopen = () => {
    console.log("Connected to WebSocket server");
    // TODO: send an initial message if needed
  };

  ws.onmessage = (event) => {
    console.log(`Received: ${event.data}`);
    // Update your PixiJS scene based on the data
    // Example: parse JSON data and update object positions
    // const data = JSON.parse(event.data);
    // myPixiSprite.x = data.x;
  };

  ws.onclose = () => {
    console.log("Disconnected from WebSocket server");
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
  };
  return ws;
};

(async () => {
  const theUrl = window.location.href;
  const gameId = getLastPathSegment(theUrl);
  console.log(`Href: ${theUrl}`);
  console.log(`Game ID: ${gameId}`);

  // Create a new application
  const app = new Application();

  // Initialize the application
  await app.init({ background: "green", resizeTo: window });

  // Append the application canvas to the document body
  document.getElementById("pixi-container").appendChild(app.canvas);

  openWebSocket(wsUrl + "/games/ws/hearts/" + gameId);

  // Load the card texture
  const cardTexture = await Assets.load("/assets/cards/SPADE-12-QUEEN.svg");

  // Create a card Sprite
  const card = new Sprite(cardTexture);

  // Center the sprite's anchor point
  card.anchor.set(0.5);

  // Move the sprite to the center of the screen
  card.position.set(app.screen.width / 2, app.screen.height / 2);

  // Add the card to the stage
  app.stage.addChild(card);

  // Listen for animate update
  // app.ticker.add((time) => {
  //   // Just for fun, let's rotate tbe card a little.
  //   // * Delta is 1 if running at 100% performance *
  //   // * Creates frame-independent transformation *
  //   card.rotation += 0.1 * time.deltaTime;
  // });
})();
