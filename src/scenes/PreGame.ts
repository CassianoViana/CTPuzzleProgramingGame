import Phaser from 'phaser';
import Button from '../controls/Button';
import AlignGrid from '../geom/AlignGrid';
import Sounds from '../sounds/Sounds';

export default class PreGame extends Phaser.Scene {

  sounds: Sounds
  playBtn: Button

  constructor() {
    super('pre-game');
    this.sounds = new Sounds();
  }

  preload() {
    this.load.image('test-box', 'assets/ct/pregame/test-game-box.png');
    this.load.image('background', 'assets/ct/radial_gradient.png');
    this.load.spritesheet('play-btn', 'assets/ct/pregame/play-button.png', { frameWidth: 400, frameHeight: 152 });
    this.sounds.preloadAudios(this);
  }

  create() {
    this.sounds.initializeAudios();
    let grid = new AlignGrid(
      this, 26, 22,
      this.game.config.width as number,
      this.game.config.height as number
    );
    grid.addImage(0, 0, 'background', grid.cols, grid.rows);

    this.playBtn = new Button(this, this.sounds, 13, 0, 'play-btn', () => {
      this.sounds.click();
      this.scene.start('game')
    })
    grid.placeAt(10, 10, this.playBtn.sprite, 6);
  }
}
