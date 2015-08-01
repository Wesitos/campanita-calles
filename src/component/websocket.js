"use strict";

var socket = {
    create: function(url, openHandler, messageHandler, errorHandler){
        var websocket = new WebSocket(url, ['soap', 'xmpp']);

        websocket.onopen = openHandler;
        websocket.onMessage = messageHandler;
        websocket.onerror = errorHandler;
        return websocket
    }
}

module.exports = socket;
