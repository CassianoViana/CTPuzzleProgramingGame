import { Physics, Scene } from 'phaser';
import Matrix from '../geom/Matrix'
import IsometricPoint from '../geom/IsometricPoint'
import Command from '../program/Command';
import Sounds from '../sounds/Sounds';
import Program from '../program/Program';

export class DudeMove {

  name: string;
  dude: Dude;
  action: string;
  point: IsometricPoint;
  x: number;
  y: number;
  next?: DudeMove;
  executing: boolean = false;
  couldExecute: boolean;
  command: Command;

  constructor(dude: Dude, command: Command) {
    this.dude = dude;
    this.command = command;
    this.action = command.getAction();
  }

  update() {
    if (this.executing) {
      if (this.point) {
        if (this.dude.achieved(this.point)) {
          console.log("MOVE_ACHIEVED [x,y]", this.x, this.y)
          this.onCompleteMove();
        }
      }
    }
  }

  animate() {
    console.log('animate');
    this.command.animateSprite();
  }

  disanimate() {
    this.command.disanimateSprite();
  }

  onCompleteMove() {
    this.disanimate();
    this.dude.onCompleteMove(this);
  }

  onBranchMove() {
    let onCompleteBranch = () => {
      this.disanimate();
    }
    const moveToContinueWhenBackToThisBranch = this.next;
    const progToCall = this.action;
    let branch = new Branch(moveToContinueWhenBackToThisBranch, onCompleteBranch);
    this.dude.onBranch(progToCall, branch);
  }

  execute(previousMove: DudeMove = null) {
    console.log("DUDE_MOVE", this.action)
    this.executing = true;

    this.animate();

    this.command.sprite.setTint(0xffff00);
    setTimeout(() => {
      this.command.sprite.clearTint();
      //this.disanimate();
    }, 80)

    let x: number, y: number;
    if (previousMove == null) {
      x = this.dude.x
      y = this.dude.y
    } else {
      x = previousMove.x
      y = previousMove.y
    }

    let branched = false;
    let turnMove = false;

    switch (this.action) {
      case 'moveDown': y++; break;
      case 'moveUp': y--; break;
      case 'moveRight':
      case 'moveLeft':
        turnMove = true;
        break;
      default:
        if (this.isProgMove()) {
          this.onBranchMove();
          branched = true;
        }
        break;
    }

    if (turnMove) {
      setTimeout(() => { this.onCompleteMove() }, 600);
      this.dude.playTurnAnimation(this.action)
    }

    if (!branched && !turnMove) {
      console.log('MOVE [x,y]', x, y)
      this.couldExecute = this.dude.canMoveTo(x, y)
      if (this.couldExecute) {
        this.x = x;
        this.y = y;
        this.point = this.dude.matrix.getPoint(y, x);
        this.dude.moveTo(this)
      } else {
        this.dude.warmBlocked(this)
        setTimeout(() => {
          this.onCompleteMove();
        }, 500);
      }
    }
  }

  isProgMove() {
    return this.action.indexOf('prog') > -1
  }
}
export default class Dude {


  character: Physics.Arcade.Sprite;
  matrix: Matrix;
  scene: Phaser.Scene;
  currentStep: DudeMove;
  x: number;
  y: number;
  walking: boolean;
  onStepChange: (step: integer, movingTo: DudeMove) => void
  sounds: Sounds;
  canMoveTo: (x: number, y: number) => boolean;
  programs: Program[];
  branchMoves: Array<Branch> = new Array();
  executeTimeout: number;
  currentAction: string;

  constructor(scene: Scene, matrix: Matrix, sounds: Sounds) {
    this.sounds = sounds;
    this.scene = scene;
    this.matrix = matrix;
    this.character = scene.physics.add.sprite(485, 485, 'sprite-rope');
    this.createAnimations();
  }

  createAnimations() {
    [
      { key: 'moveDown', frames: [2] },
      { key: 'moveLeft', frames: [0] },
      { key: 'moveUp', frames: [1] },
      { key: 'moveRight', frames: [3] },
    ].forEach(anim => {
      this.scene.anims.create({
        key: anim.key,
        frames: this.scene.anims.generateFrameNumbers('sprite-rope', anim),
        frameRate: 7,
        repeat: 1
      });
    })
  }

  moveTo(dudeMove: DudeMove) {
    this.character.clearTint()
    this.sounds.start();
    this.playAnimation(dudeMove.action);
    this.scene.physics.moveToObject(this.character, dudeMove.point, 40);
  }

  warmBlocked(dudeMove: DudeMove) {
    this.playAnimation(dudeMove.action);
    this.sounds.blocked();
    this.character.setTint(0xff0000);
  }

  achieved(point: IsometricPoint) {
    const distance = Phaser.Math.Distance.Between(
      this.character.x,
      this.character.y,
      point.x,
      point.y)
    return distance <= 4
  }

  resetAt(dudeMove: DudeMove) {
    console.log("MOVE_RESET_AT [x,y]", dudeMove.x, dudeMove.y)
    this.setPosition(dudeMove.x, dudeMove.y)
    this.character.body.reset(dudeMove.point.x, dudeMove.point.y);
  }

  playAnimation(action: string) {
    this.currentAction = action;
    this.character.play(action);
  }

  playTurnAnimation(turnAction: string) {
    console.log('ANIMATION', turnAction);
    let animations = ['moveLeft', 'moveUp', 'moveRight', 'moveDown']
    let nextAnimationIndex = animations.indexOf(this.currentAction);
    if (turnAction == 'moveLeft') {
      nextAnimationIndex--;
    }
    if (turnAction == 'moveRight') {
      nextAnimationIndex++;
    }
    if (nextAnimationIndex < 0) {
      nextAnimationIndex = animations.length + nextAnimationIndex;
    }
    if (nextAnimationIndex > animations.length - 1) {
      nextAnimationIndex = 0;
    }
    let nextAnimation = animations[nextAnimationIndex];
    console.log('NEXT_ANIMATION', nextAnimation)
    this.playAnimation(nextAnimation);
  }

  setPosition(x: number, y: number) {
    this.x = x;
    this.y = y;
    const point: IsometricPoint = this.matrix.points[y][x]
    this.character.x = point.x
    this.character.y = point.y
  }

  stop() {
    this.character.body.stop();
    this.currentStep = null;
    clearTimeout(this.executeTimeout);
  }

  onBranch(progName: string, branch: Branch) {
    this.branchMoves.push(branch);
    let progs = this.programs.filter(p => p.name == progName)
    if (progs.length) {
      this.executeProgram(progs[0])
    }
  }

  getBranchToBackTo(): Branch {
    let branchToBack: Branch = null
    if (this.branchMoves.length) {
      let branchMove = this.branchMoves.pop();
      if (branchMove) {
        branchMove.onComplete();
        if (branchMove.dudeMove) {
          branchToBack = branchMove;
        } else {
          branchToBack = this.getBranchToBackTo()
        }
      }
    }
    return branchToBack
  }

  onCompleteMove(previousMove: DudeMove) {
    this.character.clearTint();
    this.currentStep = previousMove.next
    if (!previousMove.next) {
      this.continuePreviousBranchIfExists();
    }
    if (previousMove.couldExecute)
      this.resetAt(previousMove);
    this.currentStep?.execute(previousMove);
  }

  continuePreviousBranchIfExists() {
    let branchToBackTo = this.getBranchToBackTo()
    if (branchToBackTo) {
      this.currentStep = branchToBackTo.dudeMove
    }
  }

  update() {
    if (this.currentStep) {
      this.currentStep?.update();
    }
  }

  execute(programs: Program[]) {
    this.stop();
    this.programs = programs;
    this.programs.forEach(p => p.disanimateCommands());
    this.executeProgram(programs[0])
  }

  executeProgram(program: Program) {
    program.disanimateCommands();
    this.executeTimeout = setTimeout(() => {
      this.buildPath(program.commands);
      if (!this.currentStep) {
        this.continuePreviousBranchIfExists();
      }
      this.currentStep?.execute()
    }, 200);
  }

  buildPath(commands: Command[]) {
    let moves: Array<DudeMove> = commands
      .map(command => new DudeMove(this, command))
    moves.forEach((move, index) => {
      if (index > 0) {
        moves[index - 1].next = move
      }
    })
    this.currentStep = moves[0]
  }
}

class Branch {
  dudeMove: DudeMove
  onComplete: Function

  constructor(dudeMove: DudeMove, onComplete: Function) {
    this.dudeMove = dudeMove;
    this.onComplete = onComplete;
  }
}