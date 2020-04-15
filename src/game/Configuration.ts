import { deepReadonly } from "../utils";

export const configuration = deepReadonly({
  camera: {
    zoom: {
      speed: 1,
      start: 0.33,
      max: 1.5,
    },
    pan: {
      speed: 0.8,
      start: { x: 0.5, y: 0.5 },
    },
  },
});
