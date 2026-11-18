// utils

const utils = {
      withGrid(i) {
            return i * 16
      },

      asGridCoord(x, y) {
            return `${x*16},${y*16}`
      },

      nextPos(initX, initY, direction) {
            let x = initX;
            let y = initY;
            const size = 16;
            if (direction === "left") {
                  x -= size
            } else if (direction === "right") {
                  x += size
            } else if (direction === "up") {
                  y -= size
            } else if (direction === "down") {
                  y += size
            }

            return {x, y}
      }
}

//direction input controller

class DirectionInput {
      constructor() {
            this.heldDirections = []

            this.map = {
                  "KeyW": "up",
                  "ArrowUp": "up",
                  "KeyS": "down",
                  "ArrowDown": "down",
                  "KeyA": "left",
                  "ArrowLeft": "left",
                  "KeyD": "right",
                  "ArrowRight": "right"
            }

      }

      get direction() {
            return this.heldDirections[0];
      }

      init() {
            document.addEventListener("keydown", e => {
                  const dir = this.map[e.code]
                  if (dir && this.heldDirections.indexOf(dir) === -1) {
                        this.heldDirections.unshift(dir);
                  }
            });
            document.addEventListener("keyup", e => {
                  const dir = this.map[e.code];
                  const index = this.heldDirections.indexOf(dir)
                  if (index > -1) {
                        this.heldDirections.splice(index, 1);
                  }
            })
      }
}

//overworld

class Overworld {
    constructor(config) {
      this.mapname = config.mapname
        this.element = config.element;
        this.canvas = this.element.querySelector(".game-canvas");
        this.ctx = this.canvas.getContext("2d");
        this.map = null;

        this.roomNameElement = document.getElementById("room");
    }

      updateRoomName() {
            this.roomNameElement.textContent = this.map.name;
      }
    
      startGameLoop() {
            const step = () => {

            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

            const cameraPerson = this.map.gameObjects.hero

            Object.values(this.map.gameObjects).forEach(obj => {
                obj.update({
                    arrow: this.directionInput.direction,
                    map: this.map
                })
            })

            const temp_hero = this.map.gameObjects.hero;

            if (temp_hero.movingProgRemaining === 0) {
                  const portal = this.map.getPortalAt(temp_hero.x, temp_hero.y);

                  if (portal) {
                        this.changeMap(portal);

                        requestAnimationFrame(() => {step();});
                        return;
                  }
            }

            this.map.drawLowerImage(this.ctx, cameraPerson);
           

            Object.values(this.map.gameObjects).forEach(obj => {
                obj.sprite.draw(this.ctx, cameraPerson) 
            })

            
            this.map.drawUpperImage(this.ctx,cameraPerson);

            const hero = this.map.gameObjects.hero;
            if (hero.outlineSprite) {
                  hero.outlineSprite.draw(
                        this.ctx,
                        cameraPerson,
                        hero.sprite.lastFrame,
                        false
                  );
            }

            requestAnimationFrame(() => {
                step()
            })
        }
        step();
        
    }

    init() {
        this.map = new OverworldMap(window.OverworldMaps.rm_entrance())
        console.log(this.map.solid)
        this.directionInput = new DirectionInput()
        this.directionInput.init();
        this.directionInput.direction;
        this.startGameLoop();

      this.updateRoomName();
    }

    changeMap(portal) {
      console.log("tes")
            const mapFactory = window.OverworldMaps[portal.map];
      
            if (!mapFactory) {
                console.error("Map not found:", portal.map);
                return;
            }
      
            // Create an entirely new map
            this.map = new OverworldMap(mapFactory());
      
            // Get the newly created player
            const hero = this.map.gameObjects.hero;
      
            if (!hero) {
                console.error("Destination map has no hero!");
                return;
            }
      
            // Set destination spawn position
            hero.x = portal.spawn.x;
            hero.y = portal.spawn.y;
      
            // Reset movement state
            hero.movingProgRemaining = 0;
            hero.stayProgRemaining = 0;
      
            hero.direction = "down";
            hero.sprite.setAnimation("idle-down");

            console.log(this.map.name)
            document.getElementById("room").textContent = this.map.name
      }      
      
      


}

// game object

class GameObject {
    constructor(config) {
        this.x = config.x || 0;
        this.y = config.y || 0;
        this.direction = config.direction || "down"
        this.sprite = new Sprite({
            gameObject: this,
            src: config.src || "/images/characters/people/hero.png",

        });

      this.outlineSprite = config.outlineSrc ? new Sprite({
            gameObject: this,
            src: config.outlineSrc,
            animations: this.sprite.animations,
            animationFrameLimit: this.sprite.animationFrameLimit
      }) : null;
    }

    update() {
        
    }
}



//person

class Person extends GameObject {
      constructor(config) {
            super(config)
            this.movingProgRemaining = 0;
            this.stayProgRemaining = 0
            this.isPlayerControlable = config.isPlayerControlable || false;

            this.directionUpdate = {
                  "up": ["y", -1], 
                  "down": ["y", 1], 
                  "left": ["x", -1], 
                  "right": ["x", 1], 
            }
      }

      update(state) {
            this.updatePos();

            if (
                this.isPlayerControlable &&
                this.movingProgRemaining === 0 &&
                state.map.getPortalAt(this.x, this.y)
            ) {
                this.updateSprite(state);
                return;
            }

            this.updateSprite(state)

            if (this.isPlayerControlable && this.movingProgRemaining === 0 && state.arrow) {
                  this.direction = state.arrow;
                  console.log(state.map.isSpaceIsSolid(this.x, this.y, this.direction))
                  let isNextSolid = state.map.isSpaceIsSolid(this.x, this.y, this.direction)
                  if (isNextSolid === false) {
                        this.movingProgRemaining = 16; 
                  } else {
                        this.stayProgRemaining = 0;
                        this.sprite.setAnimation("idle-"+this.direction)
                  }
                  
            }
      }

      updatePos() {
            if (this.movingProgRemaining > 0) {
                  const [property, change] = this.directionUpdate[this.direction];
                  this[property] += change
                  this.movingProgRemaining -= 1
            }
            
      }

      updateSprite(state) {
            if (this.isPlayerControlable && this.movingProgRemaining === 0 && !state.arrow) {
                  this.sprite.setAnimation("idle-"+this.direction)
                  return
            }
            

            if (this.movingProgRemaining > 0) {
                  this.sprite.setAnimation("walk-"+this.direction)
            }
      }
      
}



//sprite

class Sprite {
      constructor(config) {

            //setup da image
            this.image = new Image()
            this.image.src = config.src;
            this.image.onload = () => {
                  this.isLoaded = true;
            }

            //configure da sprite animation n' setup state
            this.animations = config.animations || {
                  "idle-down": [ [0,0] ],
                  "walk-down": [ [1,0], [0,0], [3,0], [0,0] ],
                  "idle-up": [ [0,2] ],
                  "walk-up": [ [1,2], [0,2], [3,2], [0,2] ],
                  "idle-left": [ [0,3] ],
                  "walk-left": [ [1,3], [0,3], [3,3], [0,3] ],
                  "idle-right": [ [0,1] ],
                  "walk-right": [ [1,1], [0,1], [3,1], [0,1] ]
            }
            this.currentAnimation = "idle-down" //config.currentAnimation || "idle-down";
            this.currentAnimationFrame = 0;

            this.animationFrameLimit = config.animationFrameLimit || 8;
            this.animationFrameProgress = this.animationFrameLimit

            //
            this.gameObject = config.gameObject
      }

      get frame() {
            return this.animations[this.currentAnimation][this.currentAnimationFrame]
      }

      setAnimation(key) {
            if (this.currentAnimation !== key) {
                  this.currentAnimation = key;
                  this.currentAnimationFrame = 0;
                  this.animationFrameProgress = this.animationFrameLimit;
            }
      }

      updateAnimationPRogress() {
            if (this.animationFrameProgress > 0) {
                  this.animationFrameProgress -= 1;
                  return
            }
            

            this.animationFrameProgress = this.animationFrameLimit
            this.currentAnimationFrame += 1

            if (this.frame === undefined) {
                  this.currentAnimationFrame = 0
            }
      }

      draw(ctx, cameraPerson, frameOverride = null, advanceAnimation = true) {
            const x = this.gameObject.x - 8 + utils.withGrid(10.5) - cameraPerson.x;
            const y = this.gameObject.y - 18+ utils.withGrid(6) - cameraPerson.y;

            const currentFrame = frameOverride || this.frame

            this.lastFrame = currentFrame

            const [frameX, frameY] = currentFrame

            this.isLoaded && ctx.drawImage(this.image,
                  frameX * 32, frameY * 32,
                  32,32,
                  x,y,
                  32,32
            )

            if (advanceAnimation) {
                  this.updateAnimationPRogress()
            }
            
      }
}



//overworld map

class OverworldMap {
      constructor(config) {
            this.gameObjects = config.gameObjects
            this.solid = config.solid || {}
            this.portals = config.portals || {}
            this.name = config.name

            // --- GENERATE WALLS OTOMATIS KE SOLID ---
             if (config.walls) {
                  config.walls.forEach(wall => {
                  const minX = Math.min(wall.start.x, wall.end.x);
                  const maxX = Math.max(wall.start.x, wall.end.x);
                  const minY = Math.min(wall.start.y, wall.end.y);
                  const maxY = Math.max(wall.start.y, wall.end.y);

                  for (let x = minX; x <= maxX; x++) {
                        for (let y = minY; y <= maxY; y++) {
                        // Menggunakan utils.asGridCoord agar format key-nya konsisten
                             const coordKey = utils.asGridCoord(x, y);
                             this.solid[coordKey] = true;
                    }
                }
            });
        }

            this.lowerImage = new Image();
            this.lowerImage.src = config.lowerSrc // -> rendered below the character sprite

            this.upperImage = new Image();
            this.upperImage.src = config.upperSrc // -> rendered above the char sprite
      }

      getPortalAt(x, y) {
            return this.portals[`${x},${y}`] || null;
      }

      drawLowerImage(ctx, cameraPerson) {ctx.drawImage(this.lowerImage, utils.withGrid(10.5) - cameraPerson.x, utils.withGrid(6) - cameraPerson.y)}

      drawUpperImage(ctx, cameraPerson) {ctx.drawImage(this.upperImage, utils.withGrid(10.5) - cameraPerson.x, utils.withGrid(6) - cameraPerson.y)}

      isSpaceIsSolid(currentX, currentY, direction) {
            const {x, y} = utils.nextPos(currentX, currentY, direction)
            return this.solid[`${x},${y}`] || false;
      }

      isNextPortal(x, y) {return this.portals[`${x},${y}`] || null}
}

window.OverworldMaps = {
      rm_entrance: () => ({
            name: "Entrance",

            lowerSrc: "/images/maps/EntranceLower.png",
            upperSrc: "/images/maps/EntranceUpper.png",
            gameObjects :{
                  hero: new Person({
                        isPlayerControlable: true,
                        x: utils.withGrid(14),
                        y: utils.withGrid(24),
                        outlineSrc: "/images/characters/people/hero_outline.png"
                  })
            },
            walls: [
                  { start: { x: 6, y: 5 }, end: { x: 19, y: 5 } },
                  { start: { x: 6, y: 6 }, end: { x: 6, y: 24 } },
                  { start: { x: 19, y: 6 }, end: { x: 19, y: 24 } },
                  { start: { x: 6, y: 24 }, end: { x: 11, y: 24 } },
                  { start: { x: 16, y: 24 }, end: { x: 18, y: 24 } },
                  { start: { x: 12, y: 25 }, end: { x: 15, y: 25 } },
            ],
            solid: {
            },
            portals: {
                  [utils.asGridCoord(17, 12)]: {
                        map: "rm_lobby",
                        spawn: {
                              x: utils.withGrid(1),
                              y: utils.withGrid(7)
                        }
                  }
            }
      }),
      rm_lobby: () => ({
            name: "Lobby",

            lowerSrc: "/images/maps/LobbyLower.png",
            upperSrc: "/images/maps/LobbyUpper.png",
            gameObjects :{
                  hero: new Person({
                        isPlayerControlable: true,
                        x: utils.withGrid(1),
                        y: utils.withGrid(7),
                        outlineSrc: "/images/characters/people/hero_outline.png"
                  })
            },
            walls: [
                  { start: { x: 0, y: 5 }, end: { x: 7, y: 5 } },
                  { start: { x: 0, y: 9 }, end: { x: 7, y: 9 } },
                  { start: { x: 11, y: 1 }, end: { x: 11, y: 12 } },
                  { start: { x: 7, y: 10 }, end: { x: 7, y: 12 } },
                  { start: { x: 7, y: 1 }, end: { x: 7, y: 5 } },
            ],
            solid: {
            },
            portals: {
                  [utils.asGridCoord(0, 7)]: {
                        map: "rm_entrance",
                        spawn: {
                              x: utils.withGrid(16),
                              y: utils.withGrid(12)
                        }
                  },
                  [utils.asGridCoord(0, 6)]: {
                        map: "rm_entrance",
                        spawn: {
                              x: utils.withGrid(16),
                              y: utils.withGrid(12)
                        }
                  },
                  [utils.asGridCoord(0, 8)]: {
                        map: "rm_entrance",
                        spawn: {
                              x: utils.withGrid(16),
                              y: utils.withGrid(12)
                        }
                  },

                  [utils.asGridCoord(8, 1)]: {
                        map: "rm_main",
                        spawn: {
                              x: utils.withGrid(1),
                              y: utils.withGrid(15)
                        }
                  },
                  [utils.asGridCoord(9, 1)]: {
                        map: "rm_main",
                        spawn: {
                              x: utils.withGrid(2),
                              y: utils.withGrid(15)
                        }
                  },
                  [utils.asGridCoord(10, 1)]: {
                        map: "rm_main",
                        spawn: {
                              x: utils.withGrid(3),
                              y: utils.withGrid(15)
                        }
                  },

                  [utils.asGridCoord(8, 12)]: {
                        map: "rm_main",
                        spawn: {
                              x: utils.withGrid(1),
                              y: utils.withGrid(24)
                        }
                  },
                  [utils.asGridCoord(9, 12)]: {
                        map: "rm_main",
                        spawn: {
                              x: utils.withGrid(2),
                              y: utils.withGrid(24)
                        }
                  },
                  [utils.asGridCoord(10, 12)]: {
                        map: "rm_main",
                        spawn: {
                              x: utils.withGrid(3),
                              y: utils.withGrid(24)
                        }
                  }
            }
      }),
      rm_main: () => ({
            name: "Central Delayota (work in progress)",

            lowerSrc: "/images/maps/MainDebug.png",
            upperSrc: "/images/maps/MainDebug_low.png",
            gameObjects :{
                  hero: new Person({
                        isPlayerControlable: true,
                        x: utils.withGrid(1),
                        y: utils.withGrid(7),
                        outlineSrc: "/images/characters/people/hero_outline.png"
                  })
            },
            walls: [
            ],
            solid: {
            },
            portals: {
                  [utils.asGridCoord(1, 16)]: {
                        map: "rm_lobby",
                        spawn: {
                              x: utils.withGrid(8),
                              y: utils.withGrid(2)
                        }
                  },
                  [utils.asGridCoord(2, 16)]: {
                        map: "rm_lobby",
                        spawn: {
                              x: utils.withGrid(9),
                              y: utils.withGrid(2)
                        }
                  },
                  [utils.asGridCoord(3, 16)]: {
                        map: "rm_lobby",
                        spawn: {
                              x: utils.withGrid(10),
                              y: utils.withGrid(2)
                        }
                  }
            }
      })
}



//init
