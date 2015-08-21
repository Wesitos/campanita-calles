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
    SELECT_SEGMENT: "SELECTED_SEGMENT",
    UNSELECT_SEGMENT: "UNSELECTED_SEGMENT",
    SELECT_CALLE: "SELECTED_CALLE",

    MOUSE_MOVED: "MOUSE_MOVED",

    // Message types
    MESSAGE_GET_ALL: "G_ALL"
};

/** Algunas definiciones

 osm: Estructura de datos de OpenStreetMaps.
 // Nodo
 {
 id: Identificador del nodo,
 lat: latitud,
 lon: longitud,
 tags: Diccionario de informacion extra
 }

 // Calle
 {
 id: Identificador de la calle,
 nodes: Lista de identificadores de nodos que lo conforman (poli-linea);
 tags: Diccionario de informacion extra
 }

**/

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
    selectCalle: function(geojson){
        this.dispatch(constants.SELECT_CALLE, geojson);
    },
    selectSegment: function(segment){
        this.dispatch(constants.SELECT_SEGMENT, segment);
    },
    unselectSegment: function(immutable){
        this.dispatch(constants.UNSELECT_SEGMENT, immutable);
    }
};

var NodeStore = Fluxxor.createStore({
    initialize: function(){
        this.nodes = Immutable.Map();
        this.bindActions(
            constants.WEBSOCKET_LOAD, this.onLoad
        );
    },
    getState: function(){
        return Immutable.Map({nodes: this.nodes});
    },
    onLoad: function(osmData){
        _.map(osmData.nodes, function(osm){
            this.nodes = this.nodes.set(osm.id, Immutable.fromJS(osm));
        }, this);
        this.emit("change");
    }
});

var CalleStore = Fluxxor.createStore({
    initialize: function(){
        this.calles = Immutable.Map();
        this.selected = Immutable.Map();

        this.bindActions(
            constants.WEBSOCKET_LOAD, this.onLoad,
            constants.SELECT_CALLE, this.onSelectCalle
        );
    },
    getState: function(){
        return Immutable.Map({
            calles: this.calles,
            selectedCalle: this.selected});
    },
    onLoad: function(osmData){
        _.map(osmData.calles, function(osm){
            this.calles = this.calles.set(osm.id, Immutable.fromJS(osm));
        }, this);
        this.emit("change");
    },
    onSelectCalle: function(osm){
        this.selected = this.calles.get(osm.id);
        this.emit("change");
    }
});


var DireccionStore = Fluxxor.createStore({
    initialize: function(){
        this.direcciones = Immutable.Map();
        this.selected = null;

        this.bindActions(
            constants.WEBSOCKET_LOAD, this.onLoad,
            constants.SELECT_SEGMENT, this.onSelectSegment,
            constants.UNSELECT_SEGMENT, this.onUnselectSegment);
    },
    getState: function(){
        return Immutable.Map({selectedDir: this.selected});
    },
    onLoad: function(direcciones){
        _.map(direcciones, function(addr){
            this.direcciones = this.direcciones.set(addr.id,
                                                    Immutable.fromJS(addr));
        }, this);
        this.emit("change");
    },
    _seg2Immutable: function(geoSegment){
        // No importa el orden de los puntos
        return Immutable.Set.of(
            Immutable.List(geoSegment[0]),
            Immutable.List(geoSegment[1]));
    },
    onSelectDireccion: function(immutable){
        this.selected = immutable;
    },
    onSelectSegment: function(geoSegment){
        if (this.selected){
            var segment = this._seg2Immutable(geoSegment);
            var dirId = this.selected.get("id");
            var newDir = this.direcciones.get(dirId)
                    .get("coordinates")
                    .add(segment);
            if (this.selected !== newDir){
                this.direcciones = this.direcciones.set(dirId, newDir);
                this.selected = newDir;
                this.emit("change");
            }
        }
    },
    onUnselectSegment: function(immutable){
        if(this.selected){
            var dirId = this.selected.get("id");
            var newDir = this.direcciones.get(dirId)
                    .get("coordinates")
                    .remove(immutable);
            if (this.selected !== newDir){
                this.direcciones = this.direcciones.set(dirId, newDir);
                this.selected = newDir;
                this.emit("change");
            }
        }
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
    }
});

var stores = {
    NodeStore: new NodeStore(),
    CalleStore: new CalleStore(),
    DireccionStore: new DireccionStore(),
    CommunicationStore: new CommunicationStore()
};

var flux = new Fluxxor.Flux(stores, actions);

//Debug
flux.on("dispatch", function(type, payload) {
    console.log("[Dispatch]", type, payload);
});

module.exports = flux;
