import { Assets, Point, Sprite } from "pixi.js";

const imgUrlRoot = import.meta.env.VITE_IMAGE_URL_ROOT;

export class Player {
  constructor(name, isBot) {
    this.name = name;
    this.isBot = isBot;
  }
}

const Directions = Object.freeze({
  KEEPER: "KEEPER",
  LEFT: "LEFT",
  ACROSS: "ACROSS",
  RIGHT: "RIGHT",
});

const getNextDirection = (direction) => {
  switch (direction) {
    case Directions.KEEPER:
      return Directions.LEFT;
    case Directions.LEFT:
      return Directions.ACROSS;
    case Directions.ACROSS:
      return Directions.RIGHT;
    case Directions.RIGHT:
      return Directions.KEEPER;
    default:
      return "";
  }
};

export class TrickState {
  constructor(trickNumber, leader, cards, winner) {
    this.trickNumner = trickNumber;
    this.leader = leader;
    this.cards = cards;
    this.winner = winner;
  }

  static OFFSET = 100;

  getCards() {
    return this.cards;
  }

  async animateCards(app) {
    let direction = this.leader;
    if (this.cards.length === 1) {
      app.stage.removeChildren();
    }
    for (const card of this.cards) {
      await this.animateCard(app, card, direction);
      direction = getNextDirection(direction);
    }
  }

  animateCard(app, card, direction) {
    const origin = this.getOrigin(direction, app);
    const destination = this.getDestination(direction, app);
    const speed = 10;
    console.log(
      `Animating card:${card.rank} ${card.suit} ${direction} ${destination}`,
    );

    return new Promise((resolve) => {
      const sprite = card.getSprite();
      if (app.stage.children.indexOf(sprite) >= 0) {
        // each card can only appear once in the scene
        resolve(card);
      } else {
        sprite.scale.set(0.5);
        sprite.anchor.set(0.5);
        sprite.position.set(origin.x, origin.y);
        app.stage.addChild(sprite);

        const animation = (ticker) => {
          // Calculate the distance to the target
          const dx = destination.x - sprite.position.x;
          const dy = destination.y - sprite.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // If the object is close enough to the target, stop moving
          if (distance < speed * ticker.deltaTime) {
            sprite.position.set(destination.x, destination.y);
            // stop/remove the animation after reaching destination
            resolve(card);
            app.ticker.remove(animation);
          } else {
            // Calculate the movement amount for this frame
            let moveX = 0;
            if (dx !== 0) {
              moveX = (dx / distance) * speed * ticker.deltaTime;
            }
            let moveY = 0;
            if (dy !== 0) {
              moveY = (dy / distance) * speed * ticker.deltaTime;
            }

            // Update the object's position
            sprite.position.set(
              sprite.position.x + moveX,
              sprite.position.y + moveY,
            );
          }
        };
        app.ticker.add(animation);
      }
    });
  }

  getOrigin(direction, app) {
    switch (direction) {
      case Directions.KEEPER:
        return new Point(app.screen.width / 2, app.screen.height);
      case Directions.LEFT:
        return new Point(0, app.screen.height / 2);
      case Directions.ACROSS:
        return new Point(app.screen.width / 2, 0);
      case Directions.RIGHT:
        return new Point(app.screen.width, app.screen.height / 2);
      default:
        return new Point(0, 0);
    }
  }

  getDestination(direction, app) {
    switch (direction) {
      case Directions.KEEPER:
        return new Point(
          app.screen.width / 2,
          app.screen.height / 2 + TrickState.OFFSET,
        );
      case Directions.LEFT:
        return new Point(
          app.screen.width / 2 - TrickState.OFFSET,
          app.screen.height / 2,
        );
      case Directions.ACROSS:
        return new Point(
          app.screen.width / 2,
          app.screen.height / 2 - TrickState.OFFSET,
        );
      case Directions.RIGHT:
        return new Point(
          app.screen.width / 2 + TrickState.OFFSET,
          app.screen.height / 2,
        );
      default:
        console.log("DEFAULT DESTINATION");
        return new Point(0, 0);
    }
  }
}

export class RoundState {
  constructor(roundNumber, passDirection, trick) {
    this.roundNumner = roundNumber;
    this.passDirection = passDirection;
    this.trick = trick;
  }

  getTrickCards() {
    if (this.trick !== null) {
      return this.trick.getCards();
    }
    return {};
  }
}

export class GameState {
  constructor(id, players, over, round) {
    this.id = id;
    this.players = players;
    this.over = over;
    this.round = round;
  }

  /**
   * Parse the game state JSON with custom code. Build in class transformers require
   * the use of typescript.
   *
   * @param jsonData
   * @returns {GameState}
   */
  static fromJson(jsonData) {
    let trick = null;
    if ("trick" in jsonData.round) {
      let cards = [];
      let jsonTrick = jsonData.round.trick;
      jsonTrick.cards.forEach((jsonCard) => {
        cards.push(new Card(jsonCard.rank, jsonCard.suit));
      });
      trick = new TrickState(
        jsonTrick.number,
        jsonTrick.leader,
        cards,
        jsonTrick.winner,
      );
    }
    let jsonRound = jsonData.round;
    let round = new RoundState(
      jsonRound.number,
      jsonRound.passDirection,
      trick,
    );
    // this gets a little ugly...
    let players = new Map();
    players.set("KEEPER", this.getPlayer(jsonData.players.KEEPER));
    players.set("LEFT", this.getPlayer(jsonData.players.LEFT));
    players.set("ACROSS", this.getPlayer(jsonData.players.ACROSS));
    players.set("RIGHT", this.getPlayer(jsonData.players.RIGHT));
    return new GameState(jsonData.id, players, jsonData.over, round);
  }

  static getPlayer(jsonData) {
    return new Player(jsonData.name, jsonData.isBot);
  }

  getTrickCards() {
    return this.round.getTrickCards();
  }

  async updateStage(app) {
    if (this.getTrickCards().length > 0) {
      await this.round.trick.animateCards(app);
    }
  }
}

const Suits = Object.freeze({
  CLUBS: "CLUBS",
  DIAMONDS: "DIAMONDS",
  SPADES: "SPADES",
  HEARTS: "HEARTS",
});

const Ranks = Object.freeze({
  TWO: "TWO",
  THREE: "THREE",
  FOUR: "FOUR",
  FIVE: "FIVE",
  SIX: "SIX",
  SEVEN: "SEVEN",
  EIGHT: "EIGHT",
  NINE: "NINE",
  TEN: "TEN",
  JACK: "JACK",
  QUEEN: "QUEEN",
  KING: "KING",
  ACE: "ACE",
});

export class Card {
  constructor(rank, suit) {
    this.rank = rank;
    this.suit = suit;
  }

  getSprite() {
    return SPRITE_POOL.getSprite(this.getSvgPath());
  }

  getSvgPath() {
    return `${imgUrlRoot}/cards/${this.getSvgSuit()}-${this.getSvgSuffix()}.svg`;
  }

  getSvgSuit() {
    switch (this.suit) {
      case Suits.CLUBS:
        return "CLUB";
      case Suits.DIAMONDS:
        return "DIAMOND";
      case Suits.SPADES:
        return "SPADE";
      case Suits.HEARTS:
        return "HEART";
      default:
        return "";
    }
  }

  getSvgSuffix() {
    switch (this.rank) {
      case Ranks.TWO:
        return "2";
      case Ranks.THREE:
        return "3";
      case Ranks.FOUR:
        return "4";
      case Ranks.FIVE:
        return "5";
      case Ranks.SIX:
        return "6";
      case Ranks.SEVEN:
        return "7";
      case Ranks.EIGHT:
        return "8";
      case Ranks.NINE:
        return "9";
      case Ranks.TEN:
        return "10";
      case Ranks.JACK:
        return "11-JACK";
      case Ranks.QUEEN:
        return "12-QUEEN";
      case Ranks.KING:
        return "13-KING";
      case Ranks.ACE:
        return "1";
      default:
        return "";
    }
  }
}

export class SpritePool {
  constructor() {
    this.pool = new Map();
  }

  async initialize() {
    for (const suit of Object.values(Suits)) {
      for (const rank of Object.values(Ranks)) {
        const card = new Card(rank, suit);
        Assets.load(card.getSvgPath())
          .then((texture) => new Sprite(texture))
          .then((sprite) => this.addSprite(card.getSvgPath(), sprite));
      }
    }
  }

  addSprite(key, sprite) {
    this.pool.set(key, sprite);
  }

  getSprite(key) {
    return this.pool.get(key);
  }
}

export const SPRITE_POOL = new SpritePool();

export class GameEventHandler {
  constructor(app) {
    this.app = app;
    this.eventQueue = [];
    this.isProcessing = false;
  }

  async processEvent(event) {
    this.eventQueue.push(event);
    if (this.isProcessing || this.eventQueue.length === 0) return;
    this.isProcessing = true;

    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      await event.updateStage(this.app); // Process one by one
    }

    this.isProcessing = false;
  }
}
