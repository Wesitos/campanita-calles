"use strict";

var socket = {
    create: function(url, openHandler, messageHandler, errorHandler){
        var websocket = new WebSocket(url);

        websocket.onopen = openHandler;
        websocket.onmessage = messageHandler;
        websocket.onerror = errorHandler;
        return websocket;
    }
};

module.exports = socket;
