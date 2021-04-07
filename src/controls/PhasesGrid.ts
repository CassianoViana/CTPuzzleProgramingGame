import { GameObjects, Scene } from "phaser";
import AlignGrid from "../geom/AlignGrid";
import { globalSounds } from "../scenes/PreGame";
import { TestApplication } from "../test-application/TestApplication";
import UserRepository from "../user/UserRepository";
import { joinChilds } from "../utils/Utils";
import Button from "./Button";

export default class PhasesGrid {
  scene: Scene;
  grid: AlignGrid;
  userRepository: UserRepository;

  onRequestPlay: (gameUrl: string) => void

  constructor(scene: Scene, grid: AlignGrid, userRepository: UserRepository) {
    this.scene = scene;
    this.grid = grid;
    this.userRepository = userRepository;
  }

  emitGameUrl(testApplication: TestApplication) {
    let userUuid = this.userRepository.getOrCreateGuestUser().hash;
    let gameUrl = testApplication?.url?.replace(
      "<user_uuid>",
      userUuid
    );
    this.onRequestPlay(gameUrl)
  }

  setApplications(testApplications: TestApplication[]) {
    let btnPlays: Button[] = []
    let scale = this.grid.scale;
    testApplications.forEach((testApplication: TestApplication, index: number) => {
      let cell = this.grid.getCell(10, index);
      let btn = new Button(this.scene, globalSounds,
        cell.x,
        this.grid.cellHeight * 4 + cell.y * 3,
        'yellow-btn',
        () => { this.emitGameUrl(testApplication) }
      )
      btn.setScale(scale)
      btnPlays.push(btn)
      let name = testApplication.name;
      btn.setText(name);
      btn.text.setScale(scale);
      btn.text.setFontSize(30);
      btn.ajustTextPosition(20 * scale, 25 * scale)
    })
  }
}