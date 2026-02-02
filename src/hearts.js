import {Assets, Point, Sprite} from "pixi.js";

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
      return Directions.ACROSS
    case Directions.ACROSS:
      return Directions.RIGHT;
    case Directions.RIGHT:
      return Directions.KEEPER
    default:
      return "";
  }
}

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
    for (const card of this.cards) {
      await this.animateCard(app, card, direction);
      direction = getNextDirection(direction);
    }
  }

  async animateCard(app, card, direction) {
    const origin = this.getOrigin(direction, app);
    const destination = this.getDestination(direction, app);
    const speed = 5;
    console.log(`Animating card:${card.rank} ${card.suit} ${direction} ${destination}`);

    await card.getSprite().then((sprite) => {
      sprite.scale.set(0.5);
      sprite.anchor.set(0.5)
      sprite.position.set(origin.x, origin.y);
      app.stage.addChild(sprite);

      const animatedCard = (ticker) => {
        // Calculate the distance to the target
        const dx = destination.x - sprite.position.x;
        const dy = destination.y - sprite.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // If the object is close enough to the target, stop moving
        if (distance < speed * ticker.deltaTime) {
          sprite.position.set(destination.x, destination.y);
          // stop/remove the animation after reaching destination
          app.ticker.remove(animatedCard);
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
          sprite.position.set(sprite.position.x + moveX, sprite.position.y + moveY);
        }
      };

      app.ticker.add(animatedCard);
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
        return new Point(0,0);
    }
  }

  getDestination(direction, app) {
    switch (direction) {
      case Directions.KEEPER:
        return new Point(app.screen.width / 2, (app.screen.height / 2) + TrickState.OFFSET);
      case Directions.LEFT:
        return new Point((app.screen.width / 2) - TrickState.OFFSET, app.screen.height / 2);
      case Directions.ACROSS:
        return new Point(app.screen.width / 2, (app.screen.height / 2) - TrickState.OFFSET);
      case Directions.RIGHT:
        return new Point((app.screen.width / 2) + TrickState.OFFSET, app.screen.height / 2);
      default:
        console.log("DEFAULT DESTINATION");
        return new Point(0,0);
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
}

export class Card {
  constructor(rank, suit) {
    this.rank = rank;
    this.suit = suit;
  }

  getSprite() {
    return Assets.load(this.getSvgPath())
        .then((texture) => new Sprite(texture));
  }

  getSvgPath() {
    return `${imgUrlRoot}/cards/${this.getSvgSuit()}-${this.getSvgSuffix()}.svg`;
  }

  getSvgSuit() {
    switch (this.suit) {
      case "CLUBS":
        return "CLUB";
      case "DIAMONDS":
        return "DIAMOND";
      case "SPADES":
        return "SPADE";
      case "HEARTS":
        return "HEART";
      default:
        return "";
    }
  }

  getSvgSuffix() {
    switch (this.rank) {
      case "TWO":
        return "2";
      case "THREE":
        return "3";
      case "FOUR":
        return "4";
      case "FIVE":
        return "5";
      case "SIX":
        return "6";
      case "SEVEN":
        return "7";
      case "EIGHT":
        return "8";
      case "NINE":
        return "9";
      case "TEN":
        return "10";
      case "JACK":
        return "11-JACK";
      case "QUEEN":
        return "12-QUEEN";
      case "KING":
        return "13-KING";
      case "ACE":
        return "1";
      default:
        return "";
    }
  }
}
