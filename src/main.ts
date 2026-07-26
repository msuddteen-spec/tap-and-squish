import { Engine } from "./engine";

const canvas = document.getElementById("app");

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("Expected a canvas element with id \"app\".");
}

const engine = new Engine(canvas);
(window as Window & { __tapEngine?: Engine }).__tapEngine = engine;
engine.start();
