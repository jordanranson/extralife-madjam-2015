'use strict';


var _forceMobile = false;


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

class Game {
    constructor() {
        this.touch = null;
    }

    initialize() {
        this.$document = $(document);
        this.$window = $(window);
        this.$game = $('.x-game');

        this.$game[0].addEventListener('touchstart', (e) => { this.onTouchStart(e); }, false);
        this.$game[0].addEventListener('touchmove', (e) => { this.onTouchMove(e); }, false);
        this.$game[0].addEventListener('touchend', (e) => { this.onTouchEnd(e); }, false);
        this.$game[0].addEventListener('webkitmouseforcewillbegin', (e) => { this.onTouchForce(e); }, false);
        this.$game[0].addEventListener('webkitmouseforcechanged', (e) => { this.onTouchForce(e); }, false);

        // event handlers
        // todo

        // resize window handler
        this.initResize();

        // init update loop
        this.run();
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
        this.$game
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


    // Update loop

    run() {
        this.update();
        window.requestAnimationFrame(() => {
            this.run();
        });
    }

    update() {

    }


    // Static methods

    static vw() {
        return window.innerWidth;
    }

    static vh() {
        return window.innerHeight;
    }
}
window.Game = Game;