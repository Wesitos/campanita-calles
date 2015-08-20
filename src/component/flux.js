"use strict";
import websocket from "./websocket";
import Fluxxor from "fluxxor";
import _ from "lodash";
import Immutable from "immutable";

var constants = {
    WEBSOCKET_CONNECT: "WEBSOCKET_CONNECT",
    WEBSOCKET_LOAD: "WEBSOCKET_LOAD",
    WEBSOCKET_SUCCESS: "WEBSOCKET_SUCCESS",
    WEBSOCKET_FAIL: "WEBSOCKET_FAIL",

    WEBSOCKET_URL: ["ws://",window.location.host,"/websocket"].join(""),

    SELECT_NODE: "SELECTED_NODE",

    SELECT_CUADRA: "SELECTED_CUADRA",

    MOUSE_MOVED: "MOUSE_MOVED",

    // Message types
    MESSAGE_GET_ALL: "G_ALL"
};

var actions = {
    websocketConnect: function(){
        this.dispatch(constants.WEBSOCKET_CONNECT);
        var self = this;
        var onOpen = function(event){
            self.dispatch(constants.WEBSOCKET_SUCCESS, {socket: this});
            var msg = {
                head: constants.MESSAGE_GET_ALL,
                body: ""
            };
            this.send(JSON.stringify(msg));
        };
        var onMessage = function(event){
            var msg = JSON.parse(event.data);
            msg.body.origin = "server";
            var type;
            switch(msg.head){
            case constants.MESSAGE_GET_ALL:
                type = constants.WEBSOCKET_LOAD;
                break;
            };
            self.dispatch(type, msg.body);
        };

        var onError = function(event){
            self.dispatch(constants.WEBSOCKET_FAIL);
            console.log("ERROR DE WEBSOCKET, reintentando en 1s");
            setTimeout(function(){self.flux.actions.websocketConnect();}, 1000);
        };

        // Creamos el websocket
        var socket = websocket.create(constants.WEBSOCKET_URL, onOpen, onMessage, onError);
    },
    selectCuadra: function(geojson){
        this.dispatch(constants.SELECT_CUADRA, geojson);
    }
};

var NodeStore = Fluxxor.createStore({
    initialize: function(){
        this.nodes = Immutable.Map();
        this.selected = Immutable.Map();
        this.lastSelected = Immutable.Map();

        this.bindActions(
            constants.WEBSOCKET_LOAD, this.onLoad,
            constants.SELECT_NODE, this.onSelectNode
        );
    },
    getState: function(){
        return Immutable.Map({nodes: this.nodes,
                              selectedNode: this.selected,
                              lastSelectedNode: this.lastSelected});
    },
    onLoad: function(osmData){
        _.map(osmData.nodes, function(osm){
            this.nodes = this.nodes.set(osm.id, Immutable.fromJS(osm));
        }, this);
        this.emit("change");
    },
    onSelectNode: function(data){
        this.lastSelected = this.selected;
        this.selected = this.nodes.get(data.id);
        this.emit("change");
    }
});

var CuadraStore = Fluxxor.createStore({
    initialize: function(){
        this.cuadras = Immutable.Map();
        this.selected = Immutable.Map();

        this.bindActions(
            constants.WEBSOCKET_LOAD, this.onLoad,
            constants.SELECT_CUADRA, this.onSelectCuadra
        );
    },
    getState: function(){
        return Immutable.Map({
            cuadras: this.cuadras,
            selectedCuadra: this.selected});
    },
    onLoad: function(osmData){
        _.map(osmData.cuadras, function(osm){
            this.cuadras = this.cuadras.set(osm.id, Immutable.fromJS(osm));
        }, this);
        this.emit("change");
    },
    onSelectCuadra: function(osm){
        this.selected = this.cuadras.get(osm.id);
        this.emit("change");
    }
});

var CommunicationStore = Fluxxor.createStore({
    initialize: function(){
        var socket = null;
        this.bindActions(
            constants.WEBSOCKET_SUCCESS, this.onWebSocketSuccess);
    },
    onWebSocketSuccess: function(data){
        this.socket = data.socket;
    },
    _send: function(type, data){
        var msg = {
            head: type,
            body: data
        };
        this.socket.send(JSON.stringify(msg));
    },
});

var stores = {
    NodeStore: new NodeStore(),
    CuadraStore: new CuadraStore(),
    CommunicationStore: new CommunicationStore()
};

var flux = new Fluxxor.Flux(stores, actions);

//Debug
flux.on("dispatch", function(type, payload) {
    console.log("[Dispatch]", type, payload);
});

module.exports = flux;
