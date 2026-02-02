import { Assets, Sprite } from "pixi.js";

const imgUrlRoot = import.meta.env.VITE_IMAGE_URL_ROOT;

export class Player {
  constructor(name, isBot) {
    this.name = name;
    this.isBot = isBot;
  }
}

export class TrickState {
  constructor(trickNumber, leader, cards, winner) {
    this.trickNumner = trickNumber;
    this.leader = leader;
    this.cards = cards;
    this.winner = winner;
  }

  getCards() {
    return this.cards;
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
