'use strict';

let instance = null;

class EventBus {
    constructor() {

        // Make this a singleton.
        if (instance) {
            return instance;
        } else {
            instance = this;
        }

        this.listeners = {};
    }

    _getListenerIdx(eventName, callback, scope) {
        let eventListeners = this.listeners[eventName],
            i,
            idx = -1;

        if (!eventListeners || eventListeners.length === 0) {
            return idx;
        }

        for (i = 0; i < eventListeners.length; i++) {
            if (eventListeners[i].callback === callback &&
                (!scope || scope === eventListeners[i].scope)) {
                idx = i;
                break;
            }
        }

        return idx;
    }

    subscribe(eventName, callback, scope) {
        let listener,
            idx;

        if (!eventName) {
            throw new Error("Event name cannot be null or undefined");
        }

        if (!callback || typeof(callback) !== "function") {
            throw new Error("Listener must be of type function.");
        }

        idx = this._getListenerIdx(eventName, callback, scope);

        if (idx >= 0) return;

        listener = {
            callback: callback,
            scope: scope
        };

        this.listeners[eventName] = this.listeners[eventName] || [];
        this.listeners[eventName].push(listener);

    }

    unsubscribe(eventName, callback, scope) {
        let idx;

        if (!eventName || !callback || !this.listeners[eventName]) {
            return;
        }

        idx = this._getListenerIdx(eventName, callback, scope);

        if (idx === -1) return;

        this.listeners[eventName].splice(idx, 1);
    }

    broadcast(eventName, args) {
        let eventListeners = this.listeners[eventName],
            i;

        if (!eventName || !this.listeners[eventName]) {
            return;
        }

        args = args || {};

        eventListeners.forEach(function(listener) {
            listener.callback.call(listener.scope, args);
        });
    }

    reset() {
        this.listeners = {};
    }
}

export default EventBus;