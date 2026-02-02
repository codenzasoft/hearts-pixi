import { Assets, Sprite } from "pixi.js";

export class Card {
  constructor(rank, suit) {
    this.rank = rank;
    this.suit = suit;
  }

  async getSprite() {
    return Assets.load(this.getSvgPath()).then(
      (texture) => new Sprite(texture),
    );
  }

  getSvgPath() {
    return `/assets/cards/${this.getSvgSuit()}-${this.getSvgSuffix()}.svg`;
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
