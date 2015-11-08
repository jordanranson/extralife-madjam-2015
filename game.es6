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

        let $el = $(document.createElement('div'));
        $el.addClass('level container');
        $el.attr('data-level', levelData.level);
        this.$el = $el;
    }

    load() {
        let halfNode = Constants.nodeSize / 2;
        let node = new NodeActive(this.game, Game.vw/2 - halfNode, Game.vh/2 - halfNode);
        let node2 = new NodeTarget(this.game, 100 - halfNode, Game.vh/2 - halfNode);
        let node3 = new NodeTarget(this.game, Game.vw - 100 - halfNode, Game.vh/2 - halfNode);

        this.$el.appendTo(this.game.$el);
    }
}

class GameObject {
    constructor(game, x, y) {
        this.game = game;

        let body = this.physicsBody(x, y);
        body._gameObject = this; // <3 js

        this.body = body;
        this.game.world.add(this.body);
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

    update() {
        let x = this.body.pos
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
}

class Node extends ElemObject {

    // Extensible methods

    physicsBody(x, y,) {
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

class NodeActive extends Node {
    constructor(game, x, y) {
        super(game, x, y);

        this.touch = null;

        this.$el[0].addEventListener('touchstart', (e) => { this.onTouchStart(e); }, false);
        this.$el[0].addEventListener('touchmove', (e) => { this.onTouchMove(e); }, false);
        this.$el[0].addEventListener('touchend', (e) => { this.onTouchEnd(e); }, false);
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
        this.touch = e.touches[0];

        clearTimeout(this._checkForceTimeout);
        this._checkForceTimeout = setTimeout(() => { this.refreshForceValue(); }, 10);
    }

    refreshForceValue() {
        if(this.touch) console.log(this.touch.force.toFixed(2));
        if(this.touch) setTimeout(() => { this.refreshForceValue(); }, 10);
    }
}

class NodeTarget extends Node {
    className() {
        return 'node target-node';
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
        //this.bounds = Physics.aabb(0, 0, Game.vw, Game.vh);

        let world = Physics({});
        world.add([
            Physics.behavior('sweep-prune'),
            Physics.behavior('body-collision-detection'),
            Physics.behavior('body-event-response')
        ]);
        this.world = world;

        this.level = new Level(this, Levels.level0);
    }

    initialize() {
        this.$document = $(document);
        this.$window = $(window);
        this.$body = $('body');
        this.$el = $('.x-game');

        this.$el[0].addEventListener('touchstart', (e) => { this.onTouchStart(e); }, false);
        this.$el[0].addEventListener('touchmove', (e) => { this.onTouchMove(e); }, false);
        this.$el[0].addEventListener('touchend', (e) => { this.onTouchEnd(e); }, false);

        // event handlers
        // todo

        // resize window handler
        this.initResize();

        // init update loop
        this.run();

        // load first level
        this.level.load();
    }

    orientation() {
        return Game.vh > Game.vw ? 'portrait' : 'landscape';
    }

    mobile() {
        if (_forceMobile) return !(window.matchMedia('(min-width: 1024px)').matches); // debug
        else return !(window.matchMedia('(min-device-width: 1024px)').matches);
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

    checkForce(e) {
        this.touch = e.touches[0];

        clearTimeout(this._checkForceTimeout);
        this._checkForceTimeout = setTimeout(() => { this.refreshForceValue(); }, 10);
    }

    refreshForceValue() {
        if(this.touch) console.log(this.touch.force.toFixed(2));
        if(this.touch) setTimeout(() => { this.refreshForceValue(); }, 10);
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