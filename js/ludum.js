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
        width:600,
        height:400,
        maxRight:250,
        maxLeft:10
    }

    Crafty.init(config.width, config.height);

    //turn the sprite map into usable components
    Crafty.sprite(128, "images/robot.png", {
        robot:[0, 0]
    });

    Crafty.sprite(16, "images/ground.png", {
        grass1:[0, 0],
        grass2:[1, 0],
        dirt1:[2, 0],
        dirt2:[3, 0]
    });

    Crafty.sprite(32, "images/building.png", {
        building1L:[0, 0],
        building1R:[1, 0],
        building1TL:[2, 0],
        building1TR:[3, 0],
        building1T:[4, 0],
        building1C:[5, 0]
    });

    Crafty.sprite(32, "images/laser.png", {
        laserBeam:[0, 0]
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
                this.ground(config.width);
                this.building1();
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
        building1Height:32,
        building1:function () {

            if (this.buildingProgress < config.width) {
                var width = Crafty.math.randomInt(2, 6);
                if (Crafty.math.randomInt(1, 4) % 4 == 0) {
                    var height = Crafty.math.randomInt(2, 6);
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

                            Crafty.e("2D, DOM, explodable, Attached, " + type)
                                .attr({ 'x':config.width + (x * this.building1Height), y:placement + (this.building1Height * y), 'z':z});
                        }
                    }
                }
                this.buildingProgress = config.width + (width * this.building1Height) + 16;
            }
        }
    });

    Crafty.c('Ape', {
        Ape:function () {
            //setup animations
            this.requires("SpriteAnimation, Collision")
                .animate("walk", 0, 0, 1).stop().animate("walk", 20, -1);


            //setup animations
            this.requires("SpriteAnimation, Collision")
                .animate("walk_left", 2, 0, 3)
                .animate("walk_right", 0, 0, 1)
                .stop().animate("walk_right", 20, -1)

                //change direction when a direction change event is received
                .bind("NewDirection",
                function (direction) {
                    if (direction.x < 0) {
                        if (!this.isPlaying("walk_left"))
                            this.stop().animate("walk_left", 20, -1);
                    }
                    if (direction.x > 0) {
                        if (!this.isPlaying("walk_right"))
                            this.stop().animate("walk_right", 20, -1);
                    }
                });

            // A rudimentary way to prevent the user from passing solid areas
            this.bind('Moved',
                function (from) {
                    if (this.hit('solid')) {
                        this.attr({x:from.x, y:from.y});
                    } else if (this.x > config.maxRight) {
                        Crafty.trigger("WorldMoved", {'x':this.x - from.x, 'y':this.y - from.y});
                        this.attr({x:config.maxRight});
                    } else if (this.x < config.maxLeft) {
                        this.attr({x:config.maxLeft});
                    }

                }).onHit("fire", function () {
                    this.destroy();
                });
            return this;
        }
    });

    Crafty.c('Laser', {
        _speedX:8,
        _speedY:7,
        _life:5,
        init:function () {
            this.requires("2D, DOM, SpriteAnimation, laserBeam, Collision");
            this.crop(0, 0, 32, 6);
        },
        start:function (direction) {
            this.bind('EnterFrame', function () {
                var change = direction === "right" ? this._speedX : -1 * this._speedX;
                this.attr({x:this.x + change, y:this.y + this._speedY});
                var laser = this;
                $.each(this.hit("explodable"), function (index, value) {
                    value.obj.destroy();
                    laser._life -= 1;
                    if (laser._life <= 0) {
                        return false;
                    }
                });

                if (this.hit("ground") || this._life <= 0 || this.x > config.width || (this.x + this.w) < 0) {
                    this.destroy();
                }
            });
        }
    });


    Crafty.c('LaserShooter', {
        _key:Crafty.keys.SPACE,
        _direction:"right",

        init:function () {
            var shooter = this;
            //Create the bomb
            this.bind('KeyDown', function (e) {
                if (e.key !== this._key) {
                    return;
                }
                var laser = Crafty.e('Laser');
                var x = ((shooter.w - laser.w) / 2) + shooter.x;
                laser.attr({z:shooter.z, 'x':x, y:shooter.y + 21});
                laser.start(this._direction);
            });

            //change direction when a direction change event is received
            this.bind("NewDirection",
                function (direction) {
                    if (direction.x < 0) {
                        this._direction = "left";
                    } else if (direction.x > 0) {
                        this._direction = "right";
                    }
                });
        }
    });

    Crafty.c("RightControls", {
        init:function () {
            this.requires('Multiway');
        },

        rightControls:function (speed) {
            this.multiway(speed, {UP_ARROW:-90, DOWN_ARROW:90, RIGHT_ARROW:0, LEFT_ARROW:180})
            return this;
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
        Crafty.load(["images/robot.png", "images/ground.png", "images/building.png", "images/laser.png"], function () {
            Crafty.scene("main"); //when everything is loaded, run the main scene
        });
    });

    Crafty.scene("main", function () {

        var Generator = Crafty.e("Generator");
        Generator.ground(config.width);
        Crafty.background("#FFF");

        var player = Crafty.e("2D, DOM, Ape, robot, RightControls, SpriteAnimation, Collision, LaserShooter, Grid")
            .attr({ x:150, y:150, z:2 })
            .rightControls(4)
            .Ape();

    });

    //automatically play the loading scene
    Crafty.scene("loading");

});