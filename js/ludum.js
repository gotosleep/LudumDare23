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

    Crafty.sprite(40, 100, "images/beam.png", {
        beam:[0, 0]
    });

    Crafty.sprite(1400, 400, "images/stage1.png", {
        stage1:[0, 0]
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

    Crafty.sprite(32, 27, "images/plane.png", {
        plane:[0, 0]
    });

    Crafty.sprite(32, "images/laser.png", {
        laserBeam:[0, 0],
        explosion:[1, 0]
    });

    // audio

    Crafty.audio.add({
        laser:["sounds/laser.wav"]
    });

    Crafty.c('Attached', {
        _toggle:true,
        init:function () {
            this.bind('WorldMoved', function (movement) {
                if (this._toggle) {
                    this.attr({x:this.x - movement.x});
                    if (this.x + this.w <= 0) {
                        this.destroy();
                    }
                }
            });
        },
        toggleAttach:function (toggle) {
            this._toggle = toggle;
            return this;
        }
    });

    Crafty.c('Generator', {
        _enemyCount:0,
        _maxEnemies:1,
        groundProgress:0,
        buildingProgress:0,
        init:function () {
            this.bind('WorldMoved', function (movement) {
                this.groundProgress -= movement.x;
                this.buildingProgress -= movement.x;
                this.ground(config.width + 100);
                this.building1();
                this.dude();
                if (this._enemyCount < this._maxEnemies) {
                    this.tank();
                    this.plane();
                }
            })
                .bind("ScoreUpdate", function () {
                    var max = parseInt((config.points / (this._maxEnemies * 500))) + 1;
                    if (max > this._maxEnemies) {
                        this._maxEnemies = max;
                    }
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
                    var z = 1;

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
                Crafty.e("Dude, Attached, enemy, food, ScaredAI, Gravity")
                    .attr({ 'x':config.width, y:config.height - 32, 'z':4})
                    .gravity("ground");
            }
        },
        tank:function () {
            if (Crafty.math.randomInt(1, 40) % 40 == 0) {
                var tank = Crafty.e("Tank, Attached, enemy, TankAI");
                tank.points(100)
                    .attr({ 'x':config.width, y:config.height - tank.h - 16, 'z':3});
                if (tank.hit('Tank')) {
                    tank.destroy();
                } else {
                    this.addEnemy(tank);
                }
            }
        },
        plane:function () {
            if (Crafty.math.randomInt(1, 100) % 100 == 0) {
                var plane = Crafty.e("Plane, enemy, PlaneAI")
                    .points(250);
                if (Crafty.math.randomInt(1, 2) % 2 === 0) {
                    plane.attr({x:config.width, y:10, z:4});
                } else {
                    plane.attr({x:0, y:10, z:4});
                }
                if (plane.hit('Plane')) {
                    plane.destroy();
                } else {
                    this.addEnemy(plane);
                }
            }
        },
        addEnemy:function (enemy) {
            this._enemyCount += 1;
            var generator = this;
            enemy.bind("Remove", function () {
                generator._enemyCount -= 1;
            });
        }
    });

    Crafty.c("Abduct", {
        _owner:undefined,
        _people:[],
        _on:false,
        init:function () {
            this.requires("2D, DOM, Collision, SpriteAnimation, beam");
            this.attr({visible:false});
            this.bind("EnterFrame", function () {
                if (this._on === false) {
                    return;
                }
                var beam = this;

                $.each(this.hit("food"), function (index, value) {
                    var target = value.obj;
                    if (beam._people.indexOf(target) === -1) {
                        target.addComponent("beaming");
                        target.removeComponent("food");
                        target.toggleAttach(false);
                        target.stopAI();
                        target.antigravity();
                        target.bind("Remove", function () {
                            beam._removeFood(target);
                        });
                        beam.attach(target);
                        beam._people.push(target);
                    }
                });
                var center = this.x + (this.w / 2) - 10;

                var iter = [].concat(this._people);
                $.each(iter, function (index, food) {
                    var diff = food.x - center;
                    if (diff > 2) {
                        food.attr({x:food.x - 1});
                    } else if (diff < 2) {
                        food.attr({x:food.x + 1});
                    }
                    if (food.y > beam.y) {
                        food.attr({y:food.y - 1});
                    } else {
                        beam.eat(food);
                    }
                });
            });
        },
        toggle:function (toggle) {
            if (toggle !== this._on) {
                this.attr({visible:toggle});
                this._on = toggle;
                if (!this._on) {
                    this.release();
                }
            }
        },
        owner:function (owner) {
            this._owner = owner;
            return this;
        },
        _removeFood:function (food) {
            var index = this._people.indexOf(food);
            if (index >= 0) {
                this._people.splice(index, 1);
            }
        },
        eat:function (food) {
            if (this._owner) {
                this._owner.heal();
            }

            this._removeFood(food);

            Crafty.trigger("ScoreUpdate", {points:food.points()});
            food.destroy();
        },
        release:function () {
            var iter = [].concat(this._people);
            this._people = [];
            this.detach();
            $.each(iter, function (index, food) {
                if (food.has("beaming")) {
                    food.removeComponent("beaming");
                    food.addComponent("food");
                    food.startAI();
                    food.gravity();
                    food.toggleAttach(true);
                }
            });
        }
    });

    Crafty.c('Robo', {
        _hoverOffset:0,
        _hoverDirection:"up",
        _hoverMax:15,
        _resting:undefined,
        _hovering:true,
        _abduct:undefined,
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

            this.life(15);

            this._abduct = Crafty.e("Abduct");
            this._abduct.owner(this);
            this._abduct.attr({z:this.z, x:this.x + 12, y:this.y + this.h - 20});
            this.attach(this._abduct);

            this.bind("KeyDown",
                function (e) {
                    if (e.key === Crafty.keys.UP_ARROW || Crafty.keys === Crafty.keys.DOWN_ARROW) {
                        this._hovering = false;
                    } else if (e.key == Crafty.keys.SPACE) {
                        this.abduct(true);
                    }
                }).bind("KeyUp", function (e) {
                    if (e.key === Crafty.keys.UP_ARROW || Crafty.keys === Crafty.keys.DOWN_ARROW) {
                        this._hovering = !Crafty.keydown[Crafty.keys.UP_ARROW] && !Crafty.keydown[Crafty.keys.DOWN_ARROW];
                    } else if (e.key == Crafty.keys.SPACE) {
                        this.abduct(false);
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
                    if (this.y < 0) {
                        this.attr({y:from.y});
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

            this.bind("Died", function () {
                var baseX = this.x - 50;
                var baseY = this.y - 50;
                var size = 32;
                var last = undefined;
                var max = 0;
                var width = 5;
                for (var x = 0; x <= width; ++x) {
                    for (var y = 0; y <= width; ++y) {
                        if (!((x === 0 || x === width) && (y === 0 || y === width))) {
                            var count = Crafty.math.randomInt(1, 15);
                            var explosion = Crafty.e("Explosion")
                                .repeatCount(count)
                                .attr({x:baseX + (x * size), y:baseY + (y * size)})
                                .explode();
                            if (count > max) {
                                last = explosion;
                                max = count;
                            }
                        }
                    }
                }

                last.bind("AnimationEnd", function () {
                    Crafty.scene("gameOver");
                    console.log("Game Over");
                });

            });

            return this;
        },
        abduct:function (show) {
            this._abduct.toggle(show);
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
            if (direction !== "" && !Crafty.keydown[Crafty.keys.SPACE]) {
                this._direction = direction;
                this.fire();
            }
        },
        fire:function () {
            if (!this._firing) {
                this._firing = true;
                var laser = Crafty.e('Laser');
                var x = ((this.w - laser.w) / 2) + this.x;
                laser.attr({z:this.z, 'x':x, y:this.y + 13});
                laser.shoot(this, this._direction);
                this.delay(function () {
                    this._firing = false;
                    this.aim();
                }, this._fireDelay);
            }
        }
    });

    Crafty.c('Life', {
        _points:10,
        _maxLife:1,
        _life:1,
        _cost:1,
        _power:1,
        init:function () {
        },
        attack:function (other) {
            other.hurt(this._power);
            this.hurt(other.cost());
        },
        hurt:function (power) {
            if (power === undefined) {
                power = 1;
            }
            this._life -= power;
            this._notify();
            if (this._life <= 0) {
                this.die();
            }
        },
        _notify:function () {
            this.trigger("Health", {current:this._life, max:this._maxLife, percent:((this._life / this._maxLife) * 100) });
        },
        heal:function (amount) {
            if (!amount) {
                amount = 1;
            }
            if (this._life < this._maxLife) {
                this._life += amount;
            }
            if (this._life > this._maxLife) {
                this._life = this._maxLife;
            }
            this._notify();
        },
        life:function (life) {
            if (life) {
                this._maxLife = life;
                this._life = life;
                return this;
            }
            return this._life;
        },
        cost:function (cost) {
            if (cost !== undefined) {
                this._cost = cost;
                return this;
            }
            return this._cost;
        },
        power:function (power) {
            if (power !== undefined) {
                this._power = power;
                return this;
            }
            return this._power;
        },
        points:function (value) {
            if (value !== undefined) {
                this._points = value;
                return this;
            }
            return this._points;
        },
        die:function () {
            Crafty.trigger("ScoreUpdate", {points:this._points});
            this.trigger("Died");
            Crafty.e("Explosion")
                .explode(this);
            this.destroy();
        }
    });

    Crafty.c("Explosion", {
        _repeatCount:1,
        init:function () {
            this.requires("2D, DOM, explosion, SpriteAnimation, Attached");
            this.animate("explode", 1, 0, 2);
        },
        explode:function (target) {
            if (target) {
                this.attr({x:target.x, y:target.y});
            }
            this.attr({z:10000});
            this.stop().animate("explode", 10, this._repeatCount).bind("AnimationEnd", function () {
                this.destroy();
            });
            return this;
        },
        repeatCount:function (count) {
            if (count) {
                this._repeatCount = count;
            }
            return this;
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

    Crafty.c("NPC", {
        init:function () {
            this.requires("2D, DOM, SpriteAnimation, Collision, Life, Expires");
        }
    });

    Crafty.c('Tank', {
        init:function () {
            this.requires("NPC, tank");
            this.life(2);
            this.cost(5);
        }
    });

    Crafty.c("Plane", {
        init:function () {
            this.requires("NPC, plane");
        }
    });

    Crafty.c('Dude', {
        init:function () {
            this.requires("NPC, dude");
        }
    });

    Crafty.c('Bullet', {
        init:function () {
            this.requires("tankBullet, Projectile");
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
            this.requires("laserBeam, Projectile");
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

            var speedY, speedX, time;
            if (Crafty.math.abs(y) > Crafty.math.abs(x)) {
                speedY = speed;
                time = y / speedY;
                speedX = x / time;
            } else {
                speedX = speed;
                time = x / speedX;
                speedY = y / time;
            }

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

    Crafty.c("BaseAI", {
        _firing:false,
        _ready:false,
        _direction:"right",
        _minimumMovement:100,
        _directionMovement:0,
        changeDirection:function (newDirection) {
            if (newDirection != this._direction && this._directionMovement >= this._minimumMovement) {
                this._directionMovement = 0;
                this._direction = newDirection;
            }
        }
    });

    Crafty.c("PlaneAI", {
        init:function () {
            this.requires("BaseAI, Delay")
                .animate("fire", 1, 0, 2)
                .animate("normal", 0, 0, 0)
                .bind('EnterFrame', function () {
                    var movement = {x:0, y:0};
                    if (this.x > config.width - 100) {
                        this._direction = "left";
                    } else if (this.x < 100) {
                        this._direction = "right";
                    } else if (this.y > config.height - 100) {
                        this._direction = "up";
                    } else if (this.y < 100) {
                        this._direction = "down";
                    }

                    if (this._direction === "left") {
                        movement.x = -2;
                    } else if (this._direction === "right") {
                        movement.x = 2;
                    } else if (this._direction === "up") {
                        movement.y = -2;
                    } else if (this._direction === "down") {
                        movement.y = 2;
                    }

                    this.attr({x:this.x + movement.x, y:this.y + movement.y});
                    if (this.hit('Plane')) {
                        this.attr({x:this.x - movement.x, y:this.y - movement.y});
                    }

                    if (this._firing === false) {
                        if (Crafty.math.randomInt(1, 50) % 50 == 0) {
                            this.fire();
                        }
                    } else if (this._ready && this.y >= config.player.y && (this.y + this.h) <= (config.player.y + config.player.h)) {
                        this.animate("normal", 100000, -1);
                        this._firing = false;
                        var b = Crafty.e('Bullet');
                        var x = ((this.w - this.w) / 2) + this.x;
                        b.attr({z:this.z, 'x':x, y:this.y});
                        b.targetType("Robo");
                        var direction = config.player.x < this.x ? "left" : "right";
                        if (direction == "left") {
                            b.addComponent("Attached");
                        }
                        b.shootDirection(this, direction, 5, 5);
                    }
                });
        },
        fire:function () {
            this._firing = true;
            this._ready = false;
            this.stop().animate("fire", 75, 0).bind("AnimationEnd", function () {
                this._ready = true;
            });
        }
    });

    Crafty.c("TankAI", {
        init:function () {
            this.requires("BaseAI, Delay")
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
        fire:function () {
            if (this._firing === false) {
                this._firing = true;
                //setup animations

                this.stop().animate("fire", 75, 0).bind("AnimationEnd", function () {
                    this.delay(function () {
                        this.animate("normal", 100000, -1);
                        this._firing = false;
                        var b = Crafty.e('Bullet, Attached');
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
        _aiEnabled:true,
        init:function () {
            this.requires("BaseAI");
            this._minimumMovement = 200;
            this.bind('EnterFrame', function () {
                if (this._aiEnabled) {
                    if ((this.x >= 0 && (this.x + (this.w / 2)) < (config.player.x + (config.player.w / 2)))
                        || this.x >= config.width) {
                        this.changeDirection("left");
                    } else {
                        this.changeDirection("right");
                    }
                    var movement = this._direction === "right" ? 1 : -1;
                    this._directionMovement += Crafty.math.abs(movement);

                    this.attr({x:this.x + movement});
                }
            });
        },
        startAI:function () {
            this._aiEnabled = true;
        },
        stopAI:function () {
            this._aiEnabled = false;
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

    Crafty.c("Background", {
        _movement:0,
        _threshold:(config.width / 10),
        init:function () {
            this.requires("2D, Canvas")
            this.bind("WorldMoved", function (movement) {
                this._movement += movement.x;
                if (this._movement > this._threshold) {
                    this._movement = 0;
                    this.attr({x:this.x - 1});
                }
            });
        }
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
            "images/people.png", "images/tank.png", "images/title.png", "images/plane.png",
            "images/stage1.png", "images/beam.png"], function () {
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
        Crafty.e("2D, DOM, Text").attr({ w:config.width - 300, h:40, x:300, y:40 })
            .text("Fire Weapon: a, d, w, s")
            .css(css);
        Crafty.e("2D, DOM, Text").attr({ w:config.width - 300, h:40, x:300, y:80 })
            .text("Abduct: space")
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

    Crafty.scene("gameOver", function () {

        if (config.high === undefined || config.high < config.points) {
            config.high = config.points;
        }

        var css = { "text-align":"center", "color":"white", "font-weight":"bold", "font-size":"xx-large"};

        Crafty.background("#000");
        Crafty.e("2D, DOM, Text").attr({ w:config.width, h:35, x:0, y:75 })
            .text("GAME OVER")
            .css(css);

        var proceed = Crafty.e("2D, DOM, Text, BlinkingText").attr({ w:config.width, h:20, x:0, y:config.height - 100 })
            .text("Press Enter to try again")
            .css({ "text-align":"center", "color":"white", "font-weight":"bold", "font-size":"xx-large" });
        proceed.startBlink();

        proceed.bind("KeyDown", function (e) {
            if (e.key == Crafty.keys.ENTER) {
                Crafty.scene("main");
            }
        });

        css = { "text-align":"center", "color":"white", "font-weight":"bold", "font-size":"large"};

        Crafty.e("2D, DOM, Text").attr({ w:config.width, h:35, x:0, y:150 })
            .text("Score: " + config.points)
            .css(css);
        Crafty.e("2D, DOM, Text").attr({ w:config.width, h:35, x:0, y:185 })
            .text("High: " + config.high)
            .css(css);

    });

    Crafty.scene("main", function () {
        config.points = 0;

        var Generator = Crafty.e("Generator, 2D");
        Generator.ground(config.width);
        Crafty.background("#FFF");

        var background = Crafty.e("Background, stage1");


        var css = { "text-align":"left", "color":"black", "font-weight":"bold", "font-size":"large"};
        var health = Crafty.e("2D, DOM, Text").attr({ w:150, h:35, x:config.width - 150, y:10 })
            .text("Health: " + "100 %")
            .css(css);

        var score = Crafty.e("2D, DOM, Text").attr({ w:config.width, h:35, x:20, y:10 })
            .text("Score: " + "0")
            .css(css)
            .bind("ScoreUpdate", function (data) {
                config.points += data.points;
                score.text("Score: " + config.points);
            });

        config.player = Crafty.e("2D, DOM, Robo, robot, RightControls, SpriteAnimation, Collision, LaserShooter, Grid")
            .attr({ x:150, y:125, z:2 })
            .rightControls({x:6, y:5})
            .Robo().bind("Health", function (data) {
                health.text("Health: " + parseInt(data.percent) + "%");
            });


    });

    //automatically play the loading scene
    Crafty.scene("loading");

});