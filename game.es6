'use strict';


var _forceMobile = false;

var Constants = {
    nodeSize: 46
};

var Levels = {
    level0: {
        level: 0
    }
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
    constructor(game, levelData) {
        this.game = game;
        this.data = levelData;

        this.game.$body.attr('data-level', levelData.level);

        let $el = $(document.createElement('div'));
        $el.addClass('level');
        this.$el = $el;

        this.gameObjects = [];
        this.nextLevel = false;
    }

    load() {
        let halfNode = Constants.nodeSize / 2;

        new Queue(0)
        .wait(100, () => {
            let node = new NodeActive(this.game, Game.vw/2 - halfNode, Game.vh/2 - halfNode, {
                childNodes: [
                    { facing: MathUtil.toRad(90), next: true },
                    { facing: MathUtil.toRad(-90) }
                ]
            });
            this.gameObjects.push(node);

            let node2 = new NodeTarget(this.game, 100 - halfNode, Game.vh/2 - halfNode);
            this.gameObjects.push(node2);

            let node3 = new NodeTarget(this.game, Game.vw - 100 - halfNode, Game.vh/2 - halfNode);
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
    }

    win() {
        this.game.$results.data('transitioning', true);

        new Queue(0)
            .next(() => {
                this.game.$results.css('display', 'block');
                this.game.$results.find('.x-time').html('0s');
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
        console.log('get fucked');
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
        this.$el.appendTo(this.game.level.$el);
    }

    // extensible methods

    className() {
        return '';
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

        console.log('making self');

        this.addTag('node-child');
    }

    className() {
        return 'node active-node child-node';
    }

    push(force) {
        if(this.locked) return;

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
        return Game.vw * .45;
    }
}

class NodeActive extends Node {
    constructor(game, x, y, options) {
        super(game, x, y);

        this.touch = null;
        this.force = 0;

        this.$i = this.$el.find('i');

        this.childNodes = [];
        options.childNodes.forEach((nodeData) => {
            let node = new NodeChild(game, x, y, nodeData);
            this.childNodes.push(node);
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

        this.$el[0].removeEventListener('touchstart');
        this.$el[0].removeEventListener('mousedown');
        this.$el[0].removeEventListener('touchmove');
        this.$el[0].removeEventListener('touchend');
        this.$el[0].removeEventListener('mouseup');
    }

    updateEl() {
        super.updateEl();
        this.$el.attr('data-state', this.locked ? 'locked' : '');
    }

    update() {
        super.update();

        if(this.touch) {
            if(this.game.mobile()) {
                this.force = this.touch.force;
            }
            else {
                this.force = MathUtil.clamp(this.force+0.01, 0, 1);
            }
        }
        else {
            if(this.game.mobile()) {
                this.force = 0;
            }
            else {
                this.force = MathUtil.clamp(this.force-0.01, 0, 1);
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
    className() {
        return 'obstacle';
    }
}

class ObstacleGroup extends GameObject {
    className() {
        return 'obstacle-group';
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

        this.currentLevel = -1;
        this.levels = [
            Levels.level0,
            Levels.level0,
            Levels.level0
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
        //this.$results.on('tap', (e) => { this.nextLevel(); });
        this.$results.data('transitioning', false);
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

        this.currentLevel++;
        console.log(this.currentLevel);

        new Queue(0)
            .next(() => { this.$results.removeClass('first-load'); })
            .next(() => {
                this.level = new Level(this, this.levels[this.currentLevel]);
                this.level.load();
            })
            .next(() => { this.$results.removeClass('open'); })
            .next(() => { this.$results.addClass('closed'); })
            .wait(1300, () => {
                this.$results.css('display', 'none');
                this.$results.find('.x-welcome-msg').hide();
                this.$results.find('.x-msg').show();
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
        this.world.step(this.time);

        // logic

        this.world._bodies.forEach((body) => {
           let gameObject = body._gameObject;
            gameObject.update();
        });

        if(this.level && this.level.update) this.level.update();
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