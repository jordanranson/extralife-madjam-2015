'use strict';


var _forceMobile = false;

var Constants = {
    nodeSize: 46,
    obstacleSize: 110,
    obstacleMargin: 13 + 46 + 13
};

class MathUtil {
    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    static wrap(value, min, max) {
        let range = max - min + 1;
        value = ((value - min) % range);

        if (value < 0) return max + 1 + value;
        else return min + value;
    }

    static toRad(deg) {
        return deg * (Math.PI / 180);
    }

    static toDeg(rad) {
        return rad * (180 / Math.PI);
    }

    static pointOnLine(t, p1, p2) {
        let x3 = p2.x - p1.x;
        let y3 = p2.y - p1.y;

        let length = Math.sqrt( x3 * x3 + y3 * y3 );

        x3 *= t;
        y3 *= t;

        return { x: p1.x + x3, y: p1.y + y3 };
    }

    static distance(p1, p2) {
        let x3 = p2.x - p1.x;
        let y3 = p2.y - p1.y;

        return Math.sqrt(x3*x3 + y3*y3);
    }
}

class Queue {
    constructor(delay = 0) {
        this.delay = delay;
        this.queue = [];
        this.onDone = null;
    }

    next(fn) {
        this.queue.push({ fn, delay: this.delay });
        return this;
    }

    wait(delay, fn = (() => null)) {
        this.queue.push({ fn, delay });
        return this;
    }

    done(fn) {
        this.onDone = fn;
        return this;
    }

    run() {
        this.runNext();
        return this;
    }

    runNext() {
        // done
        if(this.queue.length === 0) {
            setTimeout(() => {
                if(typeof this.onDone === 'function') this.onDone();
            }, this.delay);

            return;
        }

        // run item
        let item = this.queue.splice(0, 1)[0];

        setTimeout(() => {
            item.fn();
            this.runNext();
        }, item.delay)
    }
}

class Level {
    constructor(game) {
        this.game = game;

        let $el = $(document.createElement('div'));
        $el.addClass('level');
        this.$el = $el;

        this.gameObjects = [];
        this.nextLevel = false;
        this.lost = false;
        this.won = false;

        this.score = 0;

        this.time = Date.now();
        this.lastTime = Date.now();
    }

    levelNumber() {
        return 0;
    }

    load() {
        this.game.$el.attr('data-level', this.levelNumber());
        this.makeLevel();
    }

    makeLevel() {
        new Queue(0)
            .wait(100, () => {
                let node = new NodeActive(this.game, Game.vw/2, Game.vh/2, {
                    childNodes: [
                        { facing: MathUtil.toRad(90), next: true },
                        { facing: MathUtil.toRad(-90) }
                    ]
                });
                this.gameObjects.push(node);

                let node2 = new NodeTarget(this.game, 100, Game.vh/2);
                this.gameObjects.push(node2);

                let node3 = new NodeTarget(this.game, Game.vw - 100, Game.vh/2);
                this.gameObjects.push(node3);
            })
            .next(() => { this.$el.appendTo(this.game.$el); })
            .run();
    }

    unload() {
        this.gameObjects.forEach((gameObject) => {
            gameObject.unload();
        });
    }

    update() {
        this.time = Date.now();
        let allLocked = false;

        if(this.gameObjects.length) {
            allLocked = true;

            this.gameObjects.forEach((gameObject) => {
                if(gameObject.hasTag('node-active')) {
                    if(!gameObject.locked) allLocked = false;
                }
            });
        }

        if(!this.nextLevel && allLocked) {
            this.nextLevel = true;
            this.win();
        }

        let deltaTime = this.time - this.lastTime;
        if(!this.nextLevel) this.score += deltaTime;

        this.lastTime = this.time;
    }

    win() {
        if(this.lost) return;
        this.won = true;

        this.game.$results.data('transitioning', true);

        new Queue(0)
            .wait(500, () => {})
            .next(() => {
                this.game.$results.css('display', 'block');
                if(this.game.currentLevel >= 2) {
                    let styles = `
                        display: inline-block;
                        font-size: 35px;
                        letter-spacing: 0px;
                        margin-top: 37px;
                    `;
                    this.game.$results.find('.x-time').html((this.score / 1000).toFixed(1) + `s. <small style="${styles}">Thanks for playing!</small>`);
                }
                else {
                    this.game.$results.find('.x-time').html((this.score / 1000).toFixed(1) + 's');
                }   
            })
            .next(() => { this.game.$results.removeClass('closed'); })
            .next(() => { this.game.$results.removeClass('lose'); })
            .next(() => { this.game.$results.removeClass('win'); })
            .next(() => { this.game.$results.addClass('reset'); })
            .next(() => { this.game.$results.addClass('win'); })
            .next(() => { this.game.$results.removeClass('reset'); })
            .next(() => { this.game.$results.addClass('open'); })
            .wait(1700, () => {
                this.unload();
                this.game.$el.empty();
                this.game.$results.data('transitioning', false);
            })
            .run();
    }

    lose() {
        if(this.won) return;
        this.lost = true;

        this.game.$results.data('transitioning', true);

        new Queue(0)
            .wait(500, () => {})
            .next(() => { this.game.$results.css('display', 'block'); })
            .next(() => { this.game.$results.removeClass('closed'); })
            .next(() => { this.game.$results.removeClass('lose'); })
            .next(() => { this.game.$results.removeClass('win'); })
            .next(() => { this.game.$results.addClass('reset'); })
            .next(() => { this.game.$results.addClass('lose'); })
            .next(() => { this.game.$results.removeClass('reset'); })
            .next(() => { this.game.$results.addClass('open'); })
            .wait(1700, () => {
                this.unload();
                this.game.$el.empty();
                this.game.$results.data('transitioning', false);
            })
            .run();
    }
}

class Level0 extends Level {
    levelNumber() {
        return 0;
    }

    makeLevel() {
        new Queue(0)
            .wait(100, () => {
                let node = new NodeActive(this.game, Game.vw * .25, Game.vh/2, {
                    childNodes: [
                        { facing: MathUtil.toRad(90), next: true }
                    ]
                });
                this.gameObjects.push(node);

                let node2 = new NodeTarget(this.game, Game.vw * .75, Game.vh/2);
                this.gameObjects.push(node2);
            })
            .next(() => { this.$el.appendTo(this.game.$el); })
            .run();
    }
}

class Level1 extends Level {
    levelNumber() {
        return 1;
    }

    makeLevel() {
        new Queue(0)
            .wait(100, () => {
                let node = new NodeActive(this.game, Game.vw * .8, Game.vh/2, {
                    childNodes: [
                        { facing: MathUtil.toRad(-90), next: true }
                    ]
                });
                this.gameObjects.push(node);

                let node2 = new NodeTarget(this.game, Game.vw * .2, Game.vh/2);
                this.gameObjects.push(node2);

                let obstacle = new ObstacleSlide(this.game, Game.vw * .5, Game.vh * .18);
                this.gameObjects.push(obstacle);

                let obstacle2 = new ObstacleSlide(this.game, Game.vw * .5, Game.vh * .82);
                this.gameObjects.push(obstacle2);
            })
            .next(() => { this.$el.appendTo(this.game.$el); })
            .run();
    }
}

class Level2 extends Level {
    levelNumber() {
        return 2;
    }

    makeLevel() {
        new Queue(0)
            .wait(100, () => {
                let node = new NodeActive(this.game, Game.vw/2, Game.vh/2, {
                    childNodes: [
                        { facing: MathUtil.toRad(90), next: true },
                        { facing: MathUtil.toRad(-90) }
                    ]
                });
                this.gameObjects.push(node);

                let node2 = new NodeTarget(this.game, Game.vw * .1, Game.vh/2);
                this.gameObjects.push(node2);

                let node3 = new NodeTarget(this.game, Game.vw - (Game.vw * .1), Game.vh/2);
                this.gameObjects.push(node3);

                let obstacle = new ObstacleSlide2(this.game, Game.vw * .7, Game.vh * .5);
                this.gameObjects.push(obstacle);

                let obstacle2 = new ObstacleSlide3(this.game, Game.vw * .3, Game.vh * .5);
                this.gameObjects.push(obstacle2);
            })
            .next(() => { this.$el.appendTo(this.game.$el); })
            .run();
    }
}

class GameObject {
    constructor(game, x, y) {
        this.game = game;

        let body = this.physicsBody(x, y);
        body._gameObject = this; // <3 js

        this.body = body;
        this.game.world.add(this.body);

        this.tags = [];
    }

    get x() {
        return this.body.state.pos.x;
    }

    set x(val) {
        this.body.state.pos.x = val;
    }

    get y() {
        return this.body.state.pos.y;
    }

    set y(val) {
        this.body.state.pos.y = val;
    }

    get position() {
        return { x: this.x, y: this.y };
    }

    get angle() {
        return this.body.state.angular.pos;
    }

    set angle(val) {
        this.body.state.angular.pos = val;
    }


    // extensible methods

    physicsBody(x, y) {
        return null;
    }


    // core methods

    unload() {
        console.log('unloading');
        this.game.world.removeBody(this.body);
    }

    update() {

    }

    collide(other, collision) {

    }

    addTag(tagName) {
        this.tags.push(tagName);
    }

    hasTag(tagName) {
        return !!~this.tags.indexOf(tagName);
    }

    removeTag(tagName) {
        if(!this.hasTag(tagName)) return;

        let index = this.tags.indexOf(tagName);
        this.tags.splice(index, 1);
    }
}

class ElemObject extends GameObject {
    constructor(game, x, y) {
        super(game, x, y);

        this.scale = 1;
        this.state = '';

        let $el = $(document.createElement('div'));
        $el.addClass(this.className());

        this.$el = $el;
        this.updateEl();
        if(this.parentNode()) this.$el.appendTo(this.parentNode());
    }

    // extensible methods

    className() {
        return '';
    }

    parentNode() {
        return this.game.level.$el;
    }


    // core methods

    updateEl() {
        let transform = '';

        transform += `translate(${Math.round(this.x)}px, ${Math.round(this.y)}px) `;
        transform += `rotate(${MathUtil.toDeg(this.angle)}deg) `;
        transform += `scale(${this.scale}, ${this.scale}) `;

        this.$el.css('transform', transform);
    }

    update() {
        super.update();
        this.updateEl();
    }
}

class Node extends ElemObject {
    constructor(game, x, y) {
        super(game, x, y);
        this.$el.append(document.createElement('i'));

        this.locked = false;

        this.addTag('node');
    }


    // Extensible methods

    physicsBody(x, y) {
        let body = Physics.body('rectangle', {
            x: x,
            y: y,
            width: Constants.nodeSize,
            height: Constants.nodeSize,
            angle: MathUtil.toRad(45)
        });

        return body;
    }
}

class NodeChild extends Node {
    constructor(game, x, y, options) {
        super(game, x, y);

        let endx = x + (NodeChild.radius * Math.sin(options.facing));
        let endy = y + (NodeChild.radius * Math.cos(options.facing));
        this.end = { x: endx, y: endy };
        this.start = { x, y };

        this.locked = false;
        this.lockedTo = null;
        this.facing = options.facing;
        this.next = options.next || false;
        this.overlap = 0;
        this.force = 0;

        console.log('making self');

        this.addTag('node-child');
    }

    className() {
        return 'node active-node child-node';
    }

    push(force) {
        if(this.locked) return;

        this.force = force;

        let pos = MathUtil.pointOnLine(force, this.start, this.end);
        this.x = pos.x;
        this.y = pos.y;
    }

    updateEl() {
        super.updateEl();
        this.$el.attr('data-state', this.locked ? 'locked' : '');
    }

    update() {
        super.update();

        let mobile = this.game.mobile();

        if(this.locked) {
            this.x = this.lockedTo.x;
            this.y = this.lockedTo.y;
        }

        this.overlap = MathUtil.clamp(this.overlap-1, 0, 1000);
    }

    collide(other, collision) {
        super.collide(other, collision);

        let mobile = this.game.mobile();

        if(other.hasTag('node-target')) {
            let dist = MathUtil.distance(this.position, other.position);
            let minDist = mobile ? 17 : 17;

            if(dist <= minDist) {
                other.highlight();

                let minOverlap = 70;

                this.overlap++;
                if(this.overlap >= minOverlap) {
                    this.locked = true;
                    this.lockedTo = other;

                    other.locked = true;
                }
            }
        }
    }

    static get radius() {
        return Game.vw * .62;
    }
}

class NodeActive extends Node {
    constructor(game, x, y, options) {
        super(game, x, y);

        this.touch = null;
        this.force = 0;

        this.$i = this.$el.find('i');

        this.$lines = [];

        this.childNodes = [];
        options.childNodes.forEach((nodeData) => {
            let node = new NodeChild(game, x, y, nodeData);
            this.childNodes.push(node);

            let $line = $(document.createElement('span'));
            this.$i.append($line);

            this.$lines.push($line);
        });

        this.$el[0].addEventListener('touchstart', (e) => { this.onTouchStart(e); }, false);
        this.$el[0].addEventListener('mousedown', (e) => { this.onTouchStart(e); }, false);
        this.$el[0].addEventListener('touchmove', (e) => { this.onTouchMove(e); }, false);
        this.$el[0].addEventListener('touchend', (e) => { this.onTouchEnd(e); }, false);
        this.$el[0].addEventListener('mouseup', (e) => { this.onTouchEnd(e); }, false);

        this.addTag('node-active');
    }

    className() {
        return 'node active-node';
    }


    // Event handlers

    onTouchStart(e) {
        e.preventDefault();
        this.checkForce(e);
    }

    onTouchMove(e) {
        e.preventDefault();
        this.checkForce(e);
    }

    onTouchEnd(e) {
        e.preventDefault();
        this.touch = null;
    }

    checkForce(e) {
        this.touch = e.touches ? e.touches[0] : e;

        if(this.game.mobile()) {
            clearTimeout(this._checkForceTimeout);
            this._checkForceTimeout = setTimeout(() => { this.refreshForceValue(); }, 10);
        }
    }

    refreshForceValue() {
        if(this.touch) setTimeout(() => { this.refreshForceValue(); }, 10);
    }


    // Core methods

    unload() {
        super.unload();

        this.childNodes.forEach((node) => {
            node.unload();
        });

        this.$el[0].removeEventListener('touchstart');
        this.$el[0].removeEventListener('mousedown');
        this.$el[0].removeEventListener('touchmove');
        this.$el[0].removeEventListener('touchend');
        this.$el[0].removeEventListener('mouseup');
    }

    updateEl() {
        super.updateEl();
        this.$el.attr('data-state', this.locked ? 'locked' : '');

        if(this.$lines && this.$lines.length) {
            for(let i = 0; i < this.childNodes.length; i++) {
                let child = this.childNodes[i];
                let $line = this.$lines[i];
                let transform = '';

                //transform += `translate(-${NodeChild.radius * this.force}px, 0px) `;
                transform += `rotate(${MathUtil.toDeg(this.angle) - MathUtil.toDeg(child.facing)}deg) `;
                transform += `scale(${this.force}, ${1}) `;

                $line.css('transform', transform);
            }
        }
    }

    update() {
        super.update();

        if(!this.game.level.won) {
            if (this.touch) {
                if (this.game.mobile()) {
                    this.force = this.touch.force;
                }
                else {
                    this.force = MathUtil.clamp(this.force + 0.01, 0, 1);
                }
            }
            else {
                if (this.game.mobile()) {
                    this.force = 0;
                }
                else {
                    this.force = MathUtil.clamp(this.force - 0.01, 0, 1);
                }
            }
        }

        this.$i.css('opacity', 1-(this.force*.62));

        let allLocked = true;
        this.childNodes.forEach((childNode) => {
            childNode.push(this.force);
            if(childNode.locked === false) allLocked = false;
        });

        if(allLocked) {
            this.locked = true;
        }
    }
}

class NodeTarget extends Node {
    constructor(game, x, y) {
        super(game, x, y);

        this.locked = false;
        this.highlighted = false;

        this.addTag('node-target');
    }

    className() {
        return 'node target-node';
    }

    highlight() {
        this.highlighted = true;
    }

    updateEl() {
        super.updateEl();
        this.$el.attr('data-state', this.locked ? 'locked' : this.highlighted ? 'highlighted' : '');
    }

    update() {
        super.update();
        this.highlighted = false;
    }
}

class Obstacle extends ElemObject {
    constructor(game, x, y) {
        super(game, x, y);

        this.addTag('obstacle');
    }

    className() {
        return 'obstacle';
    }

    //parentNode() {
    //    return false;
    //}

    physicsBody(x, y) {
        let body = Physics.body('rectangle', {
            x: x,
            y: y,
            width: Constants.obstacleSize,
            height: Constants.obstacleSize,
            angle: 0
        });

        return body;
    }

    collide(other) {
        super.collide(other);

        if(this.game.level.lost) return;

        if(other.hasTag('node-child')) {
            this.game.level.lose();
        }
    }
}

class ObstacleSlide extends Obstacle {
    constructor(game, x, y) {
        super(game, x, y);

        this.body.treatment = 'static';

        this.origY = this.y;
        this.time = 0;
    }

    update() {
        super.update();

        this.time++;

        let d = Math.sin(this.time / 75) * (Constants.obstacleSize * .38);
        this.y = this.origY + d;

        //this.body.state.pos.set(this.x, this.origY + d);

        //this.y = this.origY + d;
    }
}

class ObstacleSlide2 extends Obstacle {
    constructor(game, x, y) {
        super(game, x, y);

        this.body.treatment = 'static';

        this.origY = this.y;
        this.time = 0;
    }

    update() {
        super.update();

        this.time++;

        let d = Math.sin(this.time / 75) * (Constants.obstacleSize);
        this.y = this.origY + d;

        //this.body.state.pos.set(this.x, this.origY + d);

        //this.y = this.origY + d;
    }
}

class ObstacleSlide3 extends Obstacle {
    constructor(game, x, y) {
        super(game, x, y);

        this.body.treatment = 'static';

        this.origY = this.y;
        this.time = 0;
    }

    update() {
        super.update();

        this.time++;

        let d = Math.sin(this.time / 75) * (-Constants.obstacleSize);
        this.y = this.origY + d;

        //this.body.state.pos.set(this.x, this.origY + d);

        //this.y = this.origY + d;
    }
}

class ObstacleGroup extends ElemObject {
    constructor(game, x, y) {
        super(game, x, y);

        this.addTag('obstacle-group');

        this.ready();
    }

    className() {
        return 'obstacle-group';
    }

    physicsBody(x, y) {
        let obstacles = this.obstacles();
        this.gameObjects = obstacles;

        let body = Physics.body('compound', {
            x: x,
            y: y,
            children: obstacles
        });

        return body;
    }

    obstacles() {
        return [];
    }

    ready() {
        this.gameObjects.forEach((body) => {
            body._gameObject.$el.appendTo(this.$el);
        });
    }
}

class OGFourSquares extends ObstacleGroup {
    constructor(game, x, y) {
        super(game, x, y);

        this.angle = MathUtil.toRad(45);
    }

    obstacles() {
        let objects = [];

        for(let i = 0; i < 4; i++) {
            let col = i % 2;
            let row = i / 2 << 0;
            let offset = Constants.obstacleMargin + Constants.obstacleSize;

            let x = offset * col;
            let y = offset * row;

            let obstacle = new Obstacle(this.game, x, y);
            objects.push(obstacle.body);
        }

        return objects;
    }

    update() {
        super.update();


    }
}

class Game {
    constructor() {
        let world = Physics({});
        world.add([
            Physics.behavior('sweep-prune'),
            Physics.behavior('body-collision-detection'),
            Physics.behavior('body-event-response')
        ]);
        this.world = world;

        var renderer = Physics.renderer('canvas', {
            el: 'canvas',
            width: 667,
            height: 375,
            meta: false, // don't display meta data
            styles: {
                // set colors for the circle bodies
                'circle' : {
                    strokeStyle: 'hsla(60, 37%, 17%, 1)',
                    lineWidth: 1,
                    fillStyle: 'hsla(60, 37%, 57%, 0.8)',
                    angleIndicator: 'hsla(60, 37%, 17%, 0.4)'
                }
            }
        });
        this.world.add( renderer );

        this.currentLevel = -1;
        this.levels = [
            Level0,
            Level1,
            Level2
        ];
        this.level = null;
    }

    initialize() {
        this.$document = $(document);
        this.$window = $(window);
        this.$body = $('body');
        this.$el = $('.x-game');
        this.$results = $('.x-results');

        this.$el[0].addEventListener('touchstart', (e) => { this.onTouchStart(e); }, false);
        this.$el[0].addEventListener('touchmove', (e) => { this.onTouchMove(e); }, false);
        this.$el[0].addEventListener('touchend', (e) => { this.onTouchEnd(e); }, false);

        if (_forceMobile) this.isMobile = !(window.matchMedia('(min-width: 1024px)').matches); // debug
        else this.isMobile = !(window.matchMedia('(min-device-width: 1024px)').matches);

        // event handlers
        this.$results.data('transitioning', false);
        this.$results.on('tap', (e) => { this.nextLevel(); });
        this.$results.on('click', (e) => { this.nextLevel(); });

        // resize window handler
        this.initResize();

        // init update loop
        this.run();
    }

    orientation() {
        return Game.vh > Game.vw ? 'portrait' : 'landscape';
    }

    mobile() {
        return this.isMobile;
    }

    nextLevel() {
        if(this.$results.data('transitioning')) return;
        this.$results.data('transitioning', true);

        if(this.$results.hasClass('win') || this.$results.hasClass('first-load')) this.currentLevel++;
        if(this.currentLevel >= 3) return;

        new Queue(0)
            .next(() => { this.$results.removeClass('first-load'); })
            .next(() => {
                this.level = new this.levels[this.currentLevel](this);
                this.level.load();
            })
            .next(() => { this.$results.removeClass('open'); })
            .next(() => { this.$results.addClass('closed'); })
            .wait(1300, () => {
                this.$results.css('display', 'none');
                this.$results.find('.x-welcome-msg').hide();
                this.$results.find('.x-msg').show();
                this.$results.attr('data-level', this.level.levelNumber());

                this.level.score = 0;
            })
            .run();
    }

    inputPosition(e) {
        let touching = e.originalEvent.touches && e.originalEvent.touches.length > 0;
        let x, y;

        if (touching) {
            let touchPos = e.originalEvent.touches[0];
            x = touchPos.pageX;
            y = touchPos.pageY;
        }
        else {
            x = e.pageX;
            y = e.pageY;
        }

        return {x, y};
    }

    inputForce(e) {
        return 0;
    }


    // Resize window

    initResize() {
        this._resizeTimeout = null;

        this.$window.resize((e) => {
            this.onStartResize(e);
        });
        this.onResize();
    }

    onResize() {
        this.$el
            .removeClass('orientation-portrait')
            .removeClass('orientation-landscape')
            .addClass('orientation-' + this.orientation());
    }

    onStartResize() {
        clearTimeout(this._resizeTimeout);
        this._resizeTimeout = setTimeout(() => {
            this.onResize();
        }, 100);
    }


    // Event handlers

    onTouchStart(e) {
        e.preventDefault();
    }

    onTouchMove(e) {
        e.preventDefault();
    }

    onTouchEnd(e) {
        e.preventDefault();
    }


    // Update loop

    run() {
        this.update();
        window.requestAnimationFrame(() => {
            this.run();
        });
    }

    update() {
        this.time = Date.now();

        if(this.level && !this.level.lost) {
            this.world._bodies.forEach((body) => {
                let gameObject = body._gameObject;
                gameObject.update();
            });
        }

        if(this.level && this.level.update) this.level.update();

        this.world.step(this.time);
        this.world.render();

        // logic

    }


    // Static methods

    static get vw() {
        return window.innerWidth;
    }

    static get vh() {
        return window.innerHeight;
    }
}
window.Game = Game;