import { Application, Assets, Sprite } from "pixi.js";
import { Card } from "./hearts.js";

// const apiUrl = import.meta.env.VITE_API_URL;
const wsUrl = import.meta.env.VITE_WS_URL;

const getLastPathSegment = (url) => {
  const pathname = new URL(url).pathname;
  const parts = pathname.split("/");
  // The pop() method removes the last element and returns it.
  // Calling it a second time handles cases where the URL ends in a trailing slash.
  return parts.pop() || parts.pop();
};

const openWebSocket = (url, app) => {
  let ws = new WebSocket(url);
  ws.onopen = () => {
    console.log("Connected to WebSocket server");
    // TODO: send an initial message if needed
  };

  ws.onmessage = (event) => {
    // Update PixiJS scene based on the data
    const gameState = JSON.parse(event.data);
    if (gameState.round.trick.cards) {
      app.stage.removeChildren(); // TODO: do we need to dispose anything?
      let x = 100;
      gameState.round.trick.cards.forEach((c) => {
        const card = new Card(c.rank, c.suit);
        console.log(card.getSvgPath());
        card.getSprite().then((sprite) => {
          sprite.position.set(x, app.screen.height / 2);
          x = x + sprite.width + 10;
          app.stage.addChild(sprite);
          return sprite;
        });
      });
    } else {
      console.log(`Received: ${event.data}`);
    }
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

  openWebSocket(wsUrl + "/games/ws/hearts/" + gameId, app);

  // Load the card texture
  const queen = new Card("QUEEN", "SPADES");
  console.log(`SVG path: ${queen.getSvgPath()}`);
  const cardTexture = await Assets.load(queen.getSvgPath());

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
