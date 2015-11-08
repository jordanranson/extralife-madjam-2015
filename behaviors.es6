'use strict';

Physics.behavior('body-event-response', function( parent ){

    var defaults = {
        // channel to listen to for collisions
        check: 'collisions:detected'
        // apply partial extraction of bodies if the minimum transit vector is less than this value
        // this will depend on your simulation characteristic length scale
        ,mtvThreshold: 1
        // every body overlap correction (underneith mtvThreshold) will only extract by this fraction (0..1)
        // helps with stablizing contacts.
        ,bodyExtractDropoff: 0.5
        // force bodies to wake up if the overlap is above mtvThreshold
        ,forceWakeupAboveOverlapThreshold: true
    };

    return {

        // extended
        init: function(options) {
            parent.init.call(this);
            this.options.defaults(defaults);
            this.options(options);

            this._once = false;
        },

        // no applyTo method
        applyTo: false,

        // extended
        connect: function(world) {
            world.on(this.options.check, this.respond, this);
        },

        // extended
        disconnect: function(world) {
            world.off(this.options.check, this.respond, this);
        },

        respond: function(data) {
            let collisions = data.collisions;

            if(!this._once) {
                console.log(collisions);
                this._once = true;
            }
        }
    };
});