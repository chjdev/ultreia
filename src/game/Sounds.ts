import * as Phaser from "phaser";
import { deepReadonly } from "../utils";

const asset = (
  path: "Interface" | "Music",
  file: string,
  extension: string = ".ogg",
): string => `assets/Audio/${path}/${file}${extension}`;

const sounds = {
  Theme: asset("Music", "theme", ".mp3"),
  Select: asset("Interface", "click"),
  Delete: asset("Interface", "dustbin"),
  Confirm: asset("Interface", "snap1"),
  Cancel: asset("Interface", "drop"),
  Raster: asset("Interface", "click5"),
};

type SoundKey = keyof typeof sounds;

export const Sounds = deepReadonly({
  load: (scene: Phaser.Scene): Phaser.Scene => {
    (Object.keys(sounds) as SoundKey[]).forEach((sound) =>
      scene.load.audio(sound, sounds[sound]),
    );
    return scene;
  },

  play: (scene: Phaser.Scene, sound: SoundKey, volume: number = 0.5) => {
    scene.sound.play(sound, { volume });
  },

  select: (scene: Phaser.Scene) => Sounds.play(scene, "Select"),
  delete: (scene: Phaser.Scene) => Sounds.play(scene, "Delete"),
  confirm: (scene: Phaser.Scene) => Sounds.play(scene, "Confirm"),
  cancel: (scene: Phaser.Scene) => Sounds.play(scene, "Cancel", 0.15),
  raster: (scene: Phaser.Scene) => Sounds.play(scene, "Raster", 0.025),
});
