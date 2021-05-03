import Phaser from 'phaser';
import Button from '../controls/Button';
import AlignGrid from '../geom/AlignGrid';
import Sounds from '../sounds/Sounds';
import Keyboard from '../controls/Keyboard';
import GameParams from '../settings/GameParams';
import UserRepository from '../user/UserRepository';
import User from '../user/User';
import TestApplicationService from '../test-application/TestApplicationService';
import { isAndroidAmbient } from '../utils/Utils';
import { Logger } from '../main';
import PhasesGrid from '../controls/PhasesGrid';
import { Loading } from '../controls/Loading';
import { TestApplication } from '../test-application/TestApplication';

let globalSounds: Sounds

export default class PreGame extends Phaser.Scene {

  sounds: Sounds
  playBtn: Button
  inputObject: Phaser.GameObjects.Text
  testNumberValue: string = ''
  keyboard: Keyboard
  userRepository: UserRepository
  testApplicationService: TestApplicationService;
  grid: AlignGrid;
  phasesGrid: PhasesGrid
  loading: Loading;

  constructor() {
    super('pre-game');
  }

  init() {
    this.sounds = new Sounds();
    this.keyboard = new Keyboard();
    this.userRepository = new UserRepository()

    let queryParams = window.location.search
    if (isAndroidAmbient()) {
      //@ts-ignore
      queryParams = window.search
    }
    this.initializeGameParams(queryParams);
  }

  private initializeGameParams(queryParams: string) {
    Logger.info('Loaded params = ' + queryParams);
    const params = new URLSearchParams(queryParams);
    let gameParams = new GameParams(params);
    this.testApplicationService = new TestApplicationService(gameParams);
  }

  preload() {
    this.load.image('test-box', 'assets/ct/pregame/test-game-box.png');
    this.load.image('test-box-clear', 'assets/ct/pregame/test-game-box-clear.png');
    this.load.image('background', 'assets/ct/radial_gradient.png');
    this.load.image('big-rope', 'assets/ct/big_rope.png');
    this.load.spritesheet('play-btn', 'assets/ct/pregame/play-button.png', { frameWidth: 400, frameHeight: 152 });
    this.load.spritesheet('yellow-btn', 'assets/ct/pregame/yellow_btn.png', { frameWidth: 678, frameHeight: 99 });
    this.sounds.preload(this);
    this.keyboard.preload(this);
  }

  async create() {
    this.sounds.create();
    globalSounds = this.sounds;

    this.grid = new AlignGrid(
      this, 26, 22,
      this.game.config.width as number,
      this.game.config.height as number
    );
    this.grid.addImage(0, 0, 'background', this.grid.cols, this.grid.rows);
    this.grid.addImage(18, 10, 'big-rope', 6);
    this.createLoader();

    const isPlaygroundTest = this.testApplicationService.isPlayground();
    const isAutoTesting = this.testApplicationService.isAutoTesting();
    const isTestApplication = this.testApplicationService.isTestApplication()
    const isDirectOpen = !isPlaygroundTest && !isAutoTesting && !isTestApplication

    if (isDirectOpen) {
      let applications = await this.loadPublicApplications();
      this.createTestApplicationsGrid(applications);
      return;
    }

    if (isTestApplication) {
      await this.loadTestApplication();
    }
    this.startGame()

  }

  private createLoader() {
    this.loading = new Loading(this, this.grid);
    this.loading.show()
  }

  private createTestApplicationsGrid(testApplications: TestApplication[]) {
    this.phasesGrid = new PhasesGrid(this, this.grid, this.userRepository);
    this.phasesGrid.onRequestPlay = async (gameUrl: string) => {
      this.loading.show();
      this.initializeGameParams(gameUrl.split('?')[1]);
      await this.loadTestApplication();
      this.startGame();
    };
    this.phasesGrid.setApplications(testApplications);
  }

  private async loadPublicApplications(): Promise<TestApplication[]> {
    let testApplications = [];
    testApplications = await this.testApplicationService.loadPublicApplications();
    if (testApplications.length > 1) {
      this.loading.hide();
    }
    return testApplications;
  }

  async loadTestApplication() {
    let user: User = this.userRepository.getOrCreateGuestUser();
    await this.testApplicationService.loadApplicationFromDataUrl(user);
  }

  createPlayButtonArea() {
    const cell = this.grid.getCell(10, 5);
    this.inputObject = this.add.text(cell.x, cell.y, '', {
      fontFamily: 'Dyuthi, arial',
    })
      .setScale(this.grid.scale)
      .setFontStyle('bold')
      .setFontSize(100)
      .setAlign('center')
      .setDepth(1001)
      .setTint(0xffffff);

    let testBox = this.grid.addImage(9, 3, 'test-box', 8).setInteractive();
    let testBoxClear = this.grid.addImage(15.5, 5, 'test-box-clear', 1).setInteractive();
    testBoxClear.setVisible(false);

    this.keyboard.create();
    this.keyboard.hide();
    this.keyboard.onClick = (value: string) => {
      if (this.testNumberValue.length <= 5) {
        testBoxClear.setVisible(true);
        this.testNumberValue += value;
        this.inputObject.setText(this.testNumberValue);
      }
    }

    testBoxClear.on('pointerup', () => {
      this.testNumberValue = '';
      this.inputObject.setText('');
      testBoxClear.setVisible(false);
    })

    testBox.on('pointerup', () => {
      this.keyboard.show()
    })

    this.playBtn = new Button(this, this.sounds, 0, 0, 'play-btn', () => {
      this.sounds.click();
      this.startGame();
    })
    this.grid.placeAt(10, 9.7, this.playBtn.sprite, 6);


  }

  startGame() {
    this.scene.start('game', this.testApplicationService.getGameParams())
  }
}


export { globalSounds }
