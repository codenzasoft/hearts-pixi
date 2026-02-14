import {Assets, HTMLText, Point, Sprite, Text} from "pixi.js";
import js from "@eslint/js";

const imgUrlRoot = import.meta.env.VITE_IMAGE_URL_ROOT;

export class Player {
  constructor(name, isBot) {
    this.name = name;
    this.isBot = isBot;
  }

  getSprite() {
    return SPRITE_POOL.getSprite(this.name);
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
  constructor(trickNumber, leader, cards, moves, winner) {
    this.trickNumner = trickNumber;
    this.leader = leader;
    this.cards = cards;
    this.moves = moves;
    this.winner = winner;
  }

  static OFFSET = 100;

  getCards() {
    return this.cards;
  }

  getTrumpSuit() {
    if (this.cards.length > 0) {
      return this.cards[0].suit;
    } else {
      return null;
    }
  }

  isValidPlay(card) {
    for (const move of this.moves) {
      if (move.isTheSameAs(card)) {
        return true;
      }
    }
    return false;
  }

  isComplete() {
    return this.cards.length === 4;
  }

  async displayPlayedCards(app) {
    let direction = this.leader;
    for (const card of this.cards) {
      await this.displayPlayedCard(app, card, direction);
      direction = getNextDirection(direction);
    }
  }

  displayPlayedCard(app, card, direction) {
    const sprite = card.getSprite();
    let origin;
    let startingR;
    if (sprite.parent === null) {
      origin = this.getOrigin(direction, app);
      startingR = this.getStartingRotation(direction);
    } else {
      origin = new Point(sprite.position.x, sprite.position.y);
      startingR = sprite.rotation;
    }
    const destination = this.getDestination(direction, app);
    const speed = 10;
    const endingR = startingR + Math.PI;

    sprite.position.set(origin.x, origin.y);
    sprite.rotation = startingR;
    if (app.stage.children.indexOf(sprite) < 0) {
      console.log(`adding ${card.rank} ${card.suit} (from playCard)`);
      app.stage.addChild(sprite);
    }

    return new Promise((resolve) => {
      const animation = (ticker) => {
        const complete = this.moveSpriteTowards(sprite, destination, endingR, ticker, speed);
        if (complete) {
          app.ticker.remove(animation);
          resolve(card);
        }
      }
      app.ticker.add(animation);
    });
  }

  moveSpriteTowards(sprite, destination, rotation, ticker, speed) {
    if (destination.x === sprite.position.x && destination.y === sprite.position.y) {
      return true;
    }

    // Calculate the distance to the destination
    const dx = destination.x - sprite.position.x;
    const dy = destination.y - sprite.position.y;
    const dr = rotation - sprite.rotation;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // If the object is close enough to the target, stop moving
    if (distance < speed * ticker.deltaTime) {
      sprite.position.set(destination.x, destination.y);
      sprite.rotation = rotation;
      return true;
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
      const moveR = (dr / distance) * speed * ticker.deltaTime;

      // Update the object's position
      sprite.position.set(
          sprite.position.x + moveX,
          sprite.position.y + moveY,
      );
      sprite.rotation += moveR;
      return false;
    }
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

  getStartingRotation(direction, app) {
    switch (direction) {
      case Directions.KEEPER:
        return 0;
      case Directions.LEFT:
        return 0.5 * Math.PI;
      case Directions.ACROSS:
        return Math.PI;
      case Directions.RIGHT:
        return (2 * Math.PI) - (0.5 * Math.PI);
      default:
        return 0;
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

  async displayTakeTrick(app) {
    const direction = this.winner;
    const destination = this.getOrigin(direction, app);
    const endingR = []
    this.cards.forEach((card, index) => {
      endingR[index] = card.getSprite().rotation - Math.PI;
    });

    return new Promise((resolve) => {
      const animation = (ticker) => {
        let complete = true;
        this.cards.forEach((card, index) => {
          const sprite = card.getSprite();
          complete = this.moveSpriteTowards(sprite, destination, endingR[index], ticker, 10) && complete;
        });
        if (complete) {
          for (const card of this.cards) {
            console.log(`removing ${card.rank} ${card.suit} (from takeTrick)`);
            app.stage.removeChild(card.getSprite());
          }
          app.ticker.remove(animation);
          resolve(this.cards);
        }
      }
      app.ticker.add(animation);
    });
  }
}

export class RoundState {
  constructor(roundNumber, passDirection, passPending, trick, hand, score) {
    this.roundNumner = roundNumber;
    this.passDirection = passDirection;
    this.passPending = passPending;
    this.trick = trick;
    this.hand = hand;
    this.score = score;
  }

  displayHand(app) {
    const pass = STATE_CACHE.getPass();
    const cards = this.hand.filter(card => !pass.containsCard(card));
    if (cards.length > 0) {
      // a bit of a hack - get a card to determine spacing/layout
      const aSprite = cards.at(0).getSprite()
      const cardWidth = aSprite.width;
      const cardHeight = aSprite.height;
      const handWidth = cards.length * cardWidth / 2; // divide by 2 to overlap cards
      let x = (app.screen.width / 2) - (handWidth / 2);
      const y = app.screen.height - (cardHeight / 1.5);
      const eventMode = this.getHandEventMode();
      for (const card of cards) {
        const sprite = card.getSprite();
        sprite.eventMode = eventMode;
        sprite.position.set(x, y);
        sprite.rotation = 0;
        if (app.stage.children.indexOf(sprite) < 0) {
          console.log(`adding ${card.rank} ${card.suit} (from displayHand)`);
          app.stage.addChild(sprite);
        }
        x = x + (cardWidth / 2);
      }
    }
  }

  async displayTrick(app) {
    if (this.hasTrick()) {
      await this.trick.displayPlayedCards(app);
    }
  }

  async displayPass(app) {
    const pass = STATE_CACHE.getPass();
    if (!pass.isEmpty()) {
      // a bit of a hack - get a card to determine spacing/layout
      const aSprite = pass.getCards().at(0).getSprite()
      const cardWidth = aSprite.width;
      const space = cardWidth / 4;
      const numCards = pass.getCards().length;
      const passWidth = (numCards * cardWidth) + ((numCards - 1) * space);
      let x = (app.screen.width / 2) - (passWidth / 2);
      const y = app.screen.height / 2;
      for (const card of pass.getCards()) {
          const sprite = card.getSprite();
          sprite.eventMode = "static";
          sprite.position.set(x, y);
          sprite.rotation = 0;
          if (app.stage.children.indexOf(sprite) < 0) {
            console.log(`adding ${card.rank} ${card.suit} (from displayHand)`);
            app.stage.addChild(sprite);
          }
          x = x + cardWidth + space;
      }
    }
  }

  async displayTakeTrick(app) {
    if (this.isTrickComplete()) {
      await this.trick.displayTakeTrick(app);
    }
  }

  hasTrick() {
    return this.trick !== null;
  }

  isTrickComplete() {
    return this.hasTrick() && this.trick.isComplete();
  }

  getHandEventMode() {
    if (this.isPassPending()) {
      return "static";
    } else {
      return "passive";
    }
  }

  hookMove(app, eventHandler) {
    if (this.isPassPending()) {
      this.hookPass(app, eventHandler);
    } else if (this.hasTrick()) {
      this.hookPlay(app, eventHandler);
    }
  }

  isPassPending() {
    return this.passPending.indexOf(Directions.KEEPER) >= 0;
  }

  hookPlay(app, eventHandler) {
    for (const card of this.hand) {
      const sprite = card.getSprite();
      if (this.trick.isValidPlay(card)) {
        console.log(`Card ${card.rank} ${card.suit} is VALID`)
        sprite.setMove(Moves.PLAY);
        sprite.eventMode = "static";
      } else {
        console.log(`Card ${card.rank} ${card.suit} is INVALID`)
        sprite.setMove(Moves.NONE);
        sprite.eventMode = "passive";
      }
    }
  }

  hookPass(app, eventHandler) {
    for (const card of this.hand) {
      card.getSprite().setMove(Moves.PASS);
      const sprite = card.getSprite();
      sprite.eventMode = "static";
    }
  }
}

export class GameState {
  constructor(id, players, over, score, round) {
    this.id = id;
    this.players = players;
    this.over = over;
    this.score = score;
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
      let moves = []
      if (jsonTrick.moves !== undefined) {
        jsonTrick.moves.forEach((jsonCard) => {
          moves.push(new Card(jsonCard.rank, jsonCard.suit));
        });
      }
      trick = new TrickState(
        jsonTrick.number,
        jsonTrick.leader,
        cards,
        moves,
        jsonTrick.winner,
      );
    }
    let jsonRound = jsonData.round;
    let hand = [];
    if ("hand" in jsonRound) {
      jsonRound.hand.forEach((jsonCard) => {
        hand.push(new Card(jsonCard.rank, jsonCard.suit));
      });
    }
    let passPending = [];
    if (jsonRound.passPending !== undefined) {
      passPending = jsonRound.passPending;
    }
    let score = new Map();
    score.set(Directions.KEEPER, jsonRound.score.KEEPER);
    score.set(Directions.LEFT, jsonRound.score.LEFT);
    score.set(Directions.ACROSS, jsonRound.score.ACROSS);
    score.set(Directions.RIGHT, jsonRound.score.RIGHT);
    let round = new RoundState(
      jsonRound.number,
      jsonRound.passDirection,
      passPending,
      trick,
      hand,
      score,
    );
    // this gets a little ugly...
    let players = new Map();
    players.set(Directions.KEEPER, this.buildPlayer(jsonData.players.KEEPER));
    players.set(Directions.LEFT, this.buildPlayer(jsonData.players.LEFT));
    players.set(Directions.ACROSS, this.buildPlayer(jsonData.players.ACROSS));
    players.set(Directions.RIGHT, this.buildPlayer(jsonData.players.RIGHT));

    let roundScores = new Map();
    roundScores.set(Directions.KEEPER, jsonData.score.KEEPER);
    roundScores.set(Directions.LEFT, jsonData.score.LEFT);
    roundScores.set(Directions.ACROSS, jsonData.score.ACROSS);
    roundScores.set(Directions.RIGHT, jsonData.score.RIGHT);

    return new GameState(jsonData.id, players, jsonData.over, roundScores, round);
  }

  static buildPlayer(jsonData) {
    return new Player(jsonData.name, jsonData.isBot);
  }

  getPlayer(direction) {
    return this.players.get(direction);
  }

  updateScoreBoard(app) {
    let sprite = SPRITE_POOL.getSprite("score-board");
    if (sprite === undefined) {
      sprite = new HTMLText({
        text: this.buildTable(),
        style: {
          fontFamily: 'Arial',
          fontSize: 36,
          fill: 'white',
        }
      });
      SPRITE_POOL.addSprite("score-board", sprite);
      sprite.anchor.set(0);
      sprite.position.set(0,0);
      app.stage.addChild(sprite);
    } else {
      sprite.text = this.buildTable();
    }
  }

  buildTable() {
    let table = "<table>";
    this.players.forEach((player, direction, map) => {
      table += this.buildTableRow(direction);
    });
    table += "</table>";
    return table;
  }

  buildTableRow(direction) {
    let row = "<tr>";
    const player = this.getPlayer(direction);
    row += `<th>${player.name}</th>`;
    const scores = this.score.get(direction);
    const total = scores.reduce((acc, currentValue) => acc + currentValue, 0);
    for (const score of scores) {
      row += `<td>${score}</td>`;
    }
    row += `<th>${total}</th></tr>`
    return row;
  }

  displayPlayers(app) {
    this.players.forEach((player, direction, map) => {
      let sprite = SPRITE_POOL.getSprite(player.name);
      if (sprite === undefined) {
        sprite = new Text({
          text: player.name + ` (${this.getRoundScore(direction)})` ,
          style: {
            fontFamily: 'Arial',
            fontSize: 48,
            fill: 'white',
          }
        });
        SPRITE_POOL.addSprite(player.name, sprite);
        const position = this.getPlayerPosition(app, direction, sprite);
        sprite.position.set(position.x, position.y);
        app.stage.addChild(sprite);
      } else {
        sprite.text = player.name + ` (${this.getRoundScore(direction)})`;
      }
    });
  }

  getTotalScore(direction) {
    return this.score.get(direction).reduce((acc, currentValue) => acc + currentValue, 0);
  }

  getRoundScore(direction) {
    return this.round.score.get(direction);
  }

  getPlayerPosition(app, direction, sprite) {
    switch (direction) {
      case Directions.ACROSS:
        return new Point(app.screen.width / 2, sprite.height / 2);
      case Directions.RIGHT:
        return new Point( app.screen.width - (sprite.width / 2), app.screen.height / 2);
      case Directions.KEEPER:
        return new Point(app.screen.width / 2, app.screen.height - (sprite.height / 2));
      case Directions.LEFT:
        return new Point(sprite.width / 2, app.screen.height / 2);
      default:
        return new Point(0,0);
    }
  }

  displayHand(app) {
    this.round.displayHand(app);
  }

  displayPass(app) {
    let sprite = SPRITE_POOL.getSprite("pass");
    if (this.round.isPassPending()) {
      if (sprite === undefined) {
        sprite = new Text({
          text: `pass ${this.round.passDirection.toLowerCase()}`,
          style: {
            fontFamily: 'Arial',
            fontSize: 128,
            fill: 'white',
          }
        });
        sprite.anchor.set(0.5);
        sprite.position.set(app.screen.width / 2, app.screen.height / 3);
        SPRITE_POOL.addSprite("pass", sprite);
        app.stage.addChild(sprite);
      }
    } else {
      if (sprite !== null) {
        app.stage.removeChild(sprite);
      }
    }
    const pass = STATE_CACHE.getPass();
    if (!pass.isEmpty()) {
      this.round.displayPass(app);
    }
  }

  async displayTrick(app) {
    await this.round.displayTrick(app);
  }

  async displayTakeTrick(app) {
    await this.round.displayTakeTrick(app);
  }

  async updateStage(app, eventHandler) {
    this.displayPass(app);
    this.displayHand(app);
    await this.displayTrick(app);
    this.round.hookMove(app, eventHandler);
    await this.displayTakeTrick(app);
    this.displayPlayers(app);
    this.updateScoreBoard(app);
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

const Moves = Object.freeze({
  PLAY: "play",
  PASS: "pass",
  NONE: "none",
});

export class Card {
  constructor(rank, suit) {
    this.rank = rank;
    this.suit = suit;
  }

  handleMove(app, eventHandler, roundState) {
    switch (this.getSprite().getMove()) {
      case Moves.PLAY:
        eventHandler.sendMessage(new ClientRequest("play", [this]));
        break;
      case Moves.PASS:
        const pass = STATE_CACHE.getPass();
        if (pass.containsCard(this)) {
          console.log(`Remove from pass ${this.suit} ${this.rank}`);
          pass.removeCard(this);
          eventHandler.getEvent().displayHand(app);
        } else {
          console.log(`Add to pass ${this.suit} ${this.rank}`);
          pass.addCard(this);
          eventHandler.getEvent().displayPass(app);
          eventHandler.getEvent().displayHand(app);
          if (pass.isComplete()) {
            eventHandler.sendMessage(new ClientRequest("pass", pass.getCards()));
            for (const card of pass.getCards()) {
              app.stage.removeChild(card.getSprite());
            }
            STATE_CACHE.setPass(new Pass());
            // TODO: remove pass from the stage
          }
        }
        break;
      default:
        console.log(`Unsupported move: ${this.getSprite().getMove()}`);
        break;
    }
  }

  isTheSameAs(card) {
    return this.suit === card.suit && this.rank === card.rank;
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

export class CardSprite extends Sprite {
  constructor(texture, card) {
    super(texture);
    this.card = card;
    this.move = Moves.NONE;
  }

  getCard() {
    return this.card;
  }

  setMove(move) {
    this.move = move;
  }

  getMove() {
    return this.move;
  }
}

export class SpritePool {
  constructor() {
    this.pool = new Map();
  }

  async initialize(app, eventHandler) {
    for (const suit of Object.values(Suits)) {
      for (const rank of Object.values(Ranks)) {
        const card = new Card(rank, suit);
        Assets.load(card.getSvgPath())
          .then((texture) => new CardSprite(texture, card))
          .then((sprite) => {
            this.addSprite(card.getSvgPath(), sprite);
            sprite.on("pointerdown", (event) => {
              console.log(`Click ${sprite.card.suit} ${sprite.card.rank}`);
              card.handleMove(app, eventHandler);
            });
          });
      }
    }
  }

  addSprite(key, sprite) {
    if (sprite.card !== null) {
      sprite.scale.set(0.5);
      sprite.anchor.set(0.5);
    }
    this.pool.set(key, sprite);
  }

  getSprite(key) {
    return this.pool.get(key);
  }
}

export const SPRITE_POOL = new SpritePool();

class ClientRequest {
  constructor(type, cards) {
    this.type = type;
    this.cards = cards;
  }

}

export class GameEventHandler {
  constructor(app) {
    this.app = app;
    this.eventQueue = [];
    this.isProcessing = false;
    this.websocket = null;
    this.event = null;
  }

  setWebsocket(socket) {
    this.websocket = socket;
  }

  sendMessage(msgObject) {
    this.websocket.send(JSON.stringify(msgObject));
  }

  async processEvent(event) {
    this.eventQueue.push(event);
    if (this.isProcessing || this.eventQueue.length === 0) return;
    this.isProcessing = true;

    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      this.event = event;
      await event.updateStage(this.app, this); // Process one by one
    }

    this.isProcessing = false;
  }

  getEvent() {
    return this.event;
  }

}

class Pass {
  constructor() {
    this.cards = [];
  }

  getCards() {
    return this.cards;
  }

  containsCard(card) {
    for (const c of this.cards) {
      if (c.isTheSameAs(card)) {
        return true;
      }
    }
    return false;
  }

  isEmpty() {
    return this.cards.length === 0;
  }

  isComplete() {
    return this.cards.length === 3;
  }

  addCard(card) {
    if (!this.isComplete()) {
      this.cards.push(card);
    }
  }

  removeCard(card) {
    this.cards = this.cards.filter(item => !item.isTheSameAs(card));
  }

}

class StateCache {
  constructor() {
    this.pass = new Pass();
  }

  setPass(pass) {
    this.pass = pass;
  }

  getPass() {
    return this.pass;
  }

}

const STATE_CACHE = new StateCache();
