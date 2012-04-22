/**
 * Created with JetBrains RubyMine.
 * User: gotosleep
 * Date: 4/21/12
 * Time: 11:10 AM
 * To change this template use File | Settings | File Templates.
 */

$(document).ready(function () {
    //start crafty

    var config = {
        width:700,
        height:400,
        maxRight:300,
        maxLeft:0
    }

    Crafty.init(config.width, config.height);

    //turn the sprite map into usable components
    Crafty.sprite(68, 121, "images/robot.png", {
        robot:[0, 0]
    });

    Crafty.sprite(16, "images/ground.png", {
        grass1:[0, 0],
        grass2:[1, 0],
        dirt1:[2, 0],
        dirt2:[3, 0]
    });

    Crafty.sprite(16, "images/people.png", {
        dude:[0, 0]
    });

    Crafty.sprite(64, "images/building.png", {
        building1L:[0, 0],
        building1R:[1, 0],
        building1TL:[2, 0],
        building1TR:[3, 0],
        building1T:[4, 0],
        building1C:[5, 0]
    });

    Crafty.sprite(31, 29, "images/tank.png", {
        tank:[0, 0],
        tankBullet:[0, 1]
    });

    Crafty.sprite(32, "images/laser.png", {
        laserBeam:[0, 0]
    });

    // audio

    Crafty.audio.add({
        laser:["sounds/laser.wav"]
    });

    Crafty.c('Attached', {
        init:function () {
            this.bind('WorldMoved', function (movement) {
                this.attr({x:this.x - movement.x});
                if (this.x + this.w <= 0) {
                    this.destroy();
                }
            });
        }
    });

    Crafty.c('Generator', {
        groundProgress:0,
        buildingProgress:0,
        init:function () {
            this.bind('WorldMoved', function (movement) {
                this.groundProgress -= movement.x;
                this.buildingProgress -= movement.x;
                this.ground(config.width + 100);
                this.building1();
                this.dude();
                this.tank();
            });
        },
        ground:function (x) {
            while (this.groundProgress < x) {
                var type = Crafty.math.randomInt(1, 2) % 2 == 0 ? "grass" : "dirt";
                type += Crafty.math.randomInt(1, 2);
                Crafty.e("2D, DOM, solid, ground, Attached, " + type)
                    .attr({ 'x':this.groundProgress, y:config.height - 16, z:1 });
                this.groundProgress += 16;
            }
        },
        building1Height:64,
        building1:function () {

            if (this.buildingProgress < config.width) {
                var width = Crafty.math.randomInt(2, 4);
                if (Crafty.math.randomInt(1, 2) % 2 == 0) {
                    var height = Crafty.math.randomInt(2, 5);
                    var placement = config.height - 16 - (this.building1Height * height);
                    var z = Crafty.math.randomInt(1, 2);

                    for (var x = 0; x < width; ++x) {
                        for (var y = 0; y < height; ++y) {
                            var type;
                            if (x === 0) {
                                type = y === 0 ? "building1TL" : "building1L";
                            } else if (x === width - 1) {
                                type = y === 0 ? "building1TR" : "building1R";
                            } else {
                                type = y === 0 ? "building1T" : "building1C";
                            }

                            var piece = Crafty.e("2D, DOM, solid, Building, Life, Gravity, Attached, " + type)
                                .attr({ 'x':config.width + (x * this.building1Height), y:placement + (this.building1Height * y), 'z':z});
                            piece.life(2);
                            piece.gravity("solid");
                        }
                    }
                }
                this.buildingProgress = config.width + (width * this.building1Height) + 16;
            }
        },
        dude:function () {
            if (Crafty.math.randomInt(1, 20) % 20 == 0) {
                Crafty.e("Dude, Attached, enemy, ScaredAI")
                    .attr({ 'x':config.width, y:config.height - 32, 'z':4});
            }
        },
        tank:function () {
            if (Crafty.math.randomInt(1, 40) % 40 == 0) {
                var tank = Crafty.e("Tank, Attached, enemy, TankAI");
                tank.attr({ 'x':config.width, y:config.height - tank.h - 16, 'z':3});
                if (tank.hit('Tank')) {
                    tank.destroy();
                }
            }
        }
    });

    Crafty.c('Robo', {
        _hoverOffset:0,
        _hoverDirection:"up",
        _hoverMax:15,
        _resting:undefined,
        _hovering:true,
        Robo:function () {
            this.requires("SpriteAnimation, Collision, Life");
            this._resting = this.y;
            //setup animations
            this.animate("walk_left", 2, 0, 3)
                .animate("walk_right", 0, 0, 1)
                .stop().animate("walk_right", 20, -1)

                //change direction when a direction change event is received
                .bind("NewDirection",
                function (direction) {
                    if (direction.x < 0) {
                        if (!this.isPlaying("walk_left"))
                            this.stop().animate("walk_left", 20, -1);
                    } else if (direction.x > 0) {
                        if (!this.isPlaying("walk_right"))
                            this.stop().animate("walk_right", 20, -1);
                    }
                });

            this.life(100);

            this.bind("KeyDown",
                function (e) {
                    if (e.key === Crafty.keys.UP_ARROW || Crafty.keys === Crafty.keys.DOWN_ARROW) {
                        this._hovering = false;
                    }
                }).bind("KeyUp", function (e) {
                    if (e.key === Crafty.keys.UP_ARROW || Crafty.keys === Crafty.keys.DOWN_ARROW) {
                        this._hovering = !Crafty.keydown[Crafty.keys.UP_ARROW] && !Crafty.keydown[Crafty.keys.DOWN_ARROW];
                    }
                });

            // A rudimentary way to prevent the user from passing solid areas
            this.bind('Moved',
                function (from) {
                    if (this.hit('ground')) {
                        this.attr({x:from.x, y:from.y});
                        return;
                    }
                    if (this.x > config.maxRight) {
                        Crafty.trigger("WorldMoved", {'x':((this.x - from.x) / 2)});
                        this.attr({x:config.maxRight});
                    } else if (this.x < config.maxLeft) {
                        this.attr({x:config.maxLeft});
                    }
                    if (this.y - from.y !== 0) {
                        this._resting = this.y;
                    }
                }).onHit("fire", function () {
                    this.destroy();
                });

            this.bind('EnterFrame', function () {
                if (!this._hovering || this._resting === undefined) {
                    return;
                }
                if (this._hoverDirection === "up") {
                    this._hoverOffset -= 1;
                    if (this._hoverOffset < (-1 * this._hoverMax)) {
                        this._hoverDirection = "down";
                    }
                } else {
                    this._hoverOffset += 1;
                    if (this._hoverOffset > (this._hoverMax)) {
                        this._hoverDirection = "up";
                    }
                }
                if (this._hoverOffset % 3) {
                    this.attr({y:this._resting + (this._hoverOffset / 3)});
                }
            });

            return this;
        }
    });


    Crafty.c('LaserShooter', {
        _direction:"right",
        _firing:false,
        _fireDelay:300,
        init:function () {
            this.requires('Delay');
            var shooter = this;
            //Create the bomb
            this.bind('KeyDown', function (e) {
                this.aim();
            })
                .bind('KeyUp', function (e) {
                    this.aim();
                });
        },
        aim:function () {
            var direction = "";
            if (Crafty.keydown[Crafty.keys.D]) {
                direction += "right";
            } else if (Crafty.keydown[Crafty.keys.A]) {
                direction += "left";
            }
            if (Crafty.keydown[Crafty.keys.W]) {
                direction += "up";
            } else if (Crafty.keydown[Crafty.keys.S]) {
                direction += "down";
            }
            if (direction !== "") {
                this._direction = direction;
                this.fire();
            }
        },
        fire:function () {
            if (!this._firing) {
                this._firing = true;
                var laser = Crafty.e('Laser');
                var x = ((this.w - laser.w) / 2) + this.x;
                laser.attr({z:this.z, 'x':x, y:this.y + 21});
                laser.shoot(this, this._direction);
                this.delay(function () {
                    this._firing = false;
                    this.aim();
                }, this._fireDelay);
            }
        }
    });

    Crafty.c('Life', {
        _life:1,
        _cost:1,
        _power:1,
        attack:function (other) {
            other.hurt(this._power);
            this.hurt(other.cost());
        },
        hurt:function (power) {
            if (power === undefined) {
                power = 1;
            }
            this._life -= power;
            if (this._life <= 0) {
                this.destroy();
            }
        },
        life:function (life) {
            if (life !== undefined) {
                this._life = life;
            }
            return this._life;
        },
        cost:function (cost) {
            if (cost !== undefined) {
                this._cost = cost;
            }
            return this._cost;
        },
        power:function (power) {
            if (power !== undefined) {
                this._power = power;
            }
            return this._power;
        }
    });

    Crafty.c('Expires', {
        init:function () {
            this.requires("2D");
            this.bind('EnterFrame', function () {
                if (this.x + this.w < 0 || this.x > (config.width + this.w)) {
                    this.destroy();
                }
            });
        }
    });

    Crafty.c('Tank', {
        init:function () {
            this.requires("2D, DOM, SpriteAnimation, tank, Collision, Life, Expires");
            this.life(2);
            this.cost(5);
        }
    });

    Crafty.c('Dude', {
        init:function () {
            this.requires("2D, DOM, SpriteAnimation, dude, Collision, Life, Expires");
        }
    });

    Crafty.c('Bullet', {
        init:function () {
            this.requires("tankBullet, Projectile, Attached");
            this.crop(0, 9, 20, 20);
            this.life(5);
        },
        shoot:function (shooter, target) {
            this.shootTarget(shooter, target, 3.5);
        }
    });

    Crafty.c('Laser', {
        _speedX:9,
        _speedY:-7,
        init:function () {
            this.requires("laserBeam, Projectile, Attached");
            this.life(5);
            this.crop(0, 0, 32, 6);
        },
        shoot:function (shooter, direction) {
//            Crafty.audio.play("laser");
            this.shootDirection(shooter, direction, this._speedX, this._speedY);
        }
    });

    Crafty.c('Projectile', {
        _targetType:undefined,
        init:function () {
            this.requires("2D, DOM, SpriteAnimation, Collision, Life");
        },
        shootDirection:function (shooter, direction, speedX, speedY) {
            if (direction === "rightdown") {
                speedX *= -1;
            } else if (direction === "leftdown") {
            } else if (direction === "leftup") {
                speedY *= -1;
            } else if (direction === "rightup") {
                speedY *= -1;
                speedX *= -1;
            } else if (direction === "right") {
                speedX *= -1;
                speedY = 0;
            } else if (direction == "left") {
                speedY = 0;
            } else if (direction === "down") {
                speedX = 0;
            } else if (direction == "up") {
                speedX = 0;
                speedY *= -1;
            }
            this.start(speedX, speedY, shooter);
        },
        shootTarget:function (shooter, target, speed) {
            var x = target.x - shooter.x;
            var y = target.y - shooter.y;
            var speedY = speed;

            var time = y / speedY;
            var speedX = x / time;

            this.start(speedX, speedY, shooter);
        },
        start:function (speedX, speedY, shooter) {
            var projectile = this;
            this.bind('EnterFrame', function () {
                this.attr({'x':this.x - speedX, 'y':this.y - speedY});

                var targetType = this._targetType !== undefined ? this._targetType : "Life";

                $.each(this.hit(targetType), function (index, value) {
                    var target = value.obj;
                    if (target !== shooter) {
                        projectile.attack(target);
                        if (projectile.life() <= 0) {
                            return false;
                        }
                    }
                });

                if (this.hit("ground") || this._life <= 0 || this.x > config.width || (this.x + this.w) < 0) {
                    this.destroy();
                }

            });
        },
        targetType:function (type) {
            if (type !== undefined) {
                this._targetType = type;
            }
            return this._targetType;
        }

    });

    Crafty.c("TankAI", {
        _direction:"right",
        _minimumMovement:100,
        _directionMovement:0,
        _firing:false,
        init:function () {
            this.requires("Delay")
                .animate("fire", 1, 0, 3)
                .animate("normal", 0, 0, 0);

            this.bind('EnterFrame', function () {
                if ((this.x + (this.w / 2)) < (config.player.x + (config.player.w / 2))) {
                    this.changeDirection("right");
                } else {
                    this.changeDirection("left");
                }
                var movement = this._direction === "right" ? 2 : -2;
                this.attr({x:this.x + movement});
                if (this.hit('Tank')) {
                    this.attr({x:this.x - movement});
                }
                this._directionMovement += Crafty.math.abs(movement);

                if (Crafty.math.randomInt(1, 50) % 50 == 0) {
                    this.fire();
                }
            });

        },
        changeDirection:function (newDirection) {
            if (newDirection != this._direction && this._directionMovement >= this._minimumMovement) {
                this._directionMovement = 0;
                this._direction = newDirection;
            }
        },
        fire:function () {
            if (this._firing === false) {
                this._firing = true;
                //setup animations

                this.stop().animate("fire", 75, 0).bind("AnimationEnd", function () {
                    this.delay(function () {
                        this.animate("normal", 100000, -1);
                        this._firing = false;
                        var b = Crafty.e('Bullet');
                        var x = ((this.w - this.w) / 2) + this.x;
                        b.attr({z:this.z, 'x':x, y:this.y});
                        b.targetType("Robo");
                        b.shoot(this, config.player);
                    }, 750);
                });
            }
        }
    });

    Crafty.c("ScaredAI", {
        _direction:"right",
        init:function () {
            this.bind('EnterFrame', function () {
                if ((this.x + (this.w / 2)) < (config.player.x + (config.player.w / 2))) {
                    this._direction = "left";
                } else {
                    this._direction = "right";
                }
                var movement = this._direction === "right" ? 1 : -1;
                this.attr({x:this.x + movement});
            });
        }
    });

    Crafty.c("RightControls", {
        init:function () {
            this.requires('Multiway');
        },

        rightControls:function (speed) {
            this.multiway(speed, {UP_ARROW:-90, DOWN_ARROW:90, RIGHT_ARROW:0, LEFT_ARROW:180});
            return this;
        }

    });

    Crafty.c("BlinkingText", {
        _blinking:false,
        init:function () {
            this.requires("Tween");
            this.bind("TweenEnd", function () {
                if (this._blinking) {
                    this._blink();
                }
            });
        },
        startBlink:function () {
            this._blinking = true;
            this._blink();
        },
        _blink:(function () {
            if (this.alpha < 1.0) {
                this.tween({alpha:1.0}, 50);
            } else {
                this.tween({alpha:0.2}, 50);
            }

        })
    });

    //SCENES

    //the loading screen that will display while our assets load
    Crafty.scene("loading", function () {
        //black background with some loading text
        Crafty.background("#000");
        Crafty.e("2D, DOM, Text").attr({ w:100, h:20, x:150, y:120 })
            .text("Loading")
            .css({ "text-align":"center", "color":"white" });

        //load takes an array of assets and a callback when complete
        Crafty.load(["images/robot.png", "images/ground.png", "images/building.png", "images/laser.png",
            "images/people.png", "images/tank.png", "images/title.png"], function () {
            Crafty.scene("instructions"); //when everything is loaded, run the main scene
        });
    });

    //the loading screen that will display while our assets load
    Crafty.scene("instructions", function () {
        //black background with some loading text

        var css = { "text-align":"left", "color":"white", "font-weight":"bold", "font-size":"x-large",
            "background":"rgba(0, 0, 0, 0.6)", "padding-left":"10px"};

        Crafty.background("url(images/title.png)");
        Crafty.e("2D, DOM, Text").attr({ w:config.width - 300, h:40, x:300, y:0 })
            .text("Movement: left, right, up, down")
            .css(css);
        Crafty.e("2D, DOM, Text").attr({ w:config.width - 300, h:35, x:300, y:40 })
            .text("Fire Weapon: a, d, w, s")
            .css(css);

        var proceed = Crafty.e("2D, DOM, Text, BlinkingText").attr({ w:config.width - 180, h:20, x:180, y:config.height - 50 })
            .text("Press Enter to continue")
            .css({ "text-align":"left", "color":"white", "font-weight":"bold", "font-size":"xx-large" });
        proceed.startBlink();

        proceed.bind("KeyDown", function (e) {
            if (e.key == Crafty.keys.ENTER) {
                Crafty.scene("main"); //when everything is loaded, run the main scene
            }
        });
    });

    Crafty.scene("main", function () {

        var Generator = Crafty.e("Generator");
        Generator.ground(config.width);
        Crafty.background("#FFF");

        config.player = Crafty.e("2D, DOM, Robo, robot, RightControls, SpriteAnimation, Collision, LaserShooter, Grid")
            .attr({ x:150, y:125, z:2 })
            .rightControls({x:6, y:5})
            .Robo();

    });

    //automatically play the loading scene
    Crafty.scene("loading");

});