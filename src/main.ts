import { Game } from "./game";

const canvas = document.getElementById("app");

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("Expected a canvas element with id \"app\".");
}

document.title = "Tap & Squish";

const game = new Game(canvas);
(window as Window & { __tapGame?: Game }).__tapGame = game;
game.start();
