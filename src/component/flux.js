"use strict";

var websocket = require("./websocket");
var Fluxxor = require("fluxxor");
var _ = require("lodash");

var constants = {
    WEBSOCKET_CONNECT: "WEBSOCKET_CONNECT",
    WEBSOCKET_LOAD: "WEBSOCKET_LOAD",
    WEBSOCKET_SUCCESS: "WEBSOCKET_SUCCESS",
    WEBSOCKET_FAIL: "WEBSOCKET_FAIL",

    WEBSOCKET_URL: ["ws://","localhost:8888","/websocket"].join(""),

    CREATE_NODE: "CREATE_NODE",
    DELETE_NODE: "DELETE_NODE",
    UPDATE_NODE: "UPDATE_NODE",
    SELECT_NODE: "SELECTED_NODE",

    CREATE_CUADRA: "CREATE_CUADRA",
    DELETE_CUADRA: "DELETE_CUADRA",
    UPDATE_CUADRA: "UPDATE_CUADRA",
    SELECT_CUADRA: "SELECTED_CUADRA",

    MOUSE_MOVED: "MOUSE_MOVED",

    // Message types
    MESSAGE_GET_ALL: "G_ALL",
    MESSAGE_CREATE_NODE: "C_NODE",
    MESSAGE_DELETE_NODE: "D_NODE",
    MESSAGE_UPDATE_NODE: "u_NODE",
    MESSAGE_CREATE_CUAD: "C_CUAD",
    MESSAGE_DELETE_CUAD: "D_CUAD",
    MESSAGE_UPDATE_CUAD: "u_CUAD"
};

var actions = {
    websocketConnect: function(){
        this.dispatch(constants.WEBSOCKET_CONNECT);
        var flux = this;
        var onOpen = function(event){
            flux.dispatch(constants.WEBSOCKET_SUCCESS, {socket: this});
            var msg = {
                head: constants.MESSAGE_GET_ALL,
                body: ""
            };
            this.send(JSON.stringify(msg));
        };
        var onMessage = function(event){
            var msg = JSON.parse(event.data);
            var type;
            switch(msg.head){
            case constants.MESSAGE_GET_ALL:
                type = constants.WEBSOCKET_LOAD;
                break;
            case constants.MESSAGE_CREATE_NODE:
                type = constants.CREATE_NODE;
                break;
            case constants.MESSAGE_DELETE_NODE:
                type = constants.DELETE_NODE;
                break;
            case constants.MESSAGE_UPDATE_NODE:
                type = constants.UPDATE_NODE;
                break;
            case constants.MESSAGE_CREATE_CUADRA:
                type = constants.CREATE_CUADRA;
                break;
            case constants.MESSAGE_DELETE_CUAD:
                type = constants.DELETE_CUADRA;
                break;
            case constants.MESSAGE_UPDATE_CUAD:
                type = constants.UPDATE_CUADRA;
                break;
            };
            flux.dispatch(type, msg.body);
        };

        var onError = function(event){
            flux.dispatch(constants.WEBSOCKET_FAIL);
            console.log("ERROR DE WEBSOCKET, reintentando en 1s");
            setTimeout(function(){flux.dispatch(constants.WEBSOCKET_CONNECT);}, 1000);
        };

        // Creamos el websocket
        var socket = websocket.create(constants.WEBSOCKET_URL, onOpen, onMessage, onError);
    },
    createNode: function(geojson){
        this.dispatch(constants.CREATE_NODE,{
            id: geojson.id,
            lon: geojson.geometry.coordinates[0],
            lat: geojson.geometry.coordinates[1],
            tags: geojson.properties
        });
    },
    deleteNode: function(geojson){
        this.dispatch(constants.DELETE_NODE, geojson);
    },
    updateNode: function(geojson){
        this.dispatch(constants.UPDATE_NODE, {
            id: geojson.id,            
            lon: geojson.geometry.coordinates[0],
            lat: geojson.geometry.coordinates[1],
            tags: geojson.properties
        });
    },
    selectNode: function(geojson){
        this.dispatch(constants.SELECT_NODE, geojson);
    },
    
    createCuadra: function(geojson){
        this.dispatch(constants.CREATE_CUADRA, {
            id: geojson.id,
            nodes: geojson.geometry.nodes,
            tags: geojson.properties
        });
    },
    deleteCuadra: function(geojson){
        this.dispatch(constants.DELETE_CUADRA, geojson);
    },
    updateCuadra: function(geojson){
        this.dispatch(constants.UPDATE_CUADRA, {
            id: geojson.id,
            nodes: geojson.geometry.nodes,
            tags: geojson.properties
        });
    },
    selectCuadra: function(geojson){
        this.dispatch(constants.SELECT_CUADRA, geojson);
    }
};

var NodeStore = Fluxxor.createStore({
    initialize: function(){
        this.nodes = {};
        this.selected = null;
        this.lastSelected = null;

        this.bindActions(
            constants.WEBSOCKET_LOAD, this.onLoad,
            constants.CREATE_NODE, this.onCreateNode,   // {id: <Identificador unico>, coords: <array de coordenadas>}
            constants.DELETE_NODE, this.onDeleteNode,   // {id: <Identificador unico>}
            constants.UPDATE_NODE, this.onUpdateNode,   // {id: <Identificador unico>, coords: <array de coordenadas>}
            constants.SELECT_NODE, this.onSelectNode  // {id: <Identificador unico>}
        );
    },
    getState: function(){
        return {
            nodes: this.nodes,
            selectedNode: this.selected,
            lastSelectedNode: this.lastSelected
        };
    },
    onLoad: function(osmData){
        _.forEach(osmData.nodes, function(osm){
            this.nodes[osm.id] = osm;
        }, this);
        this.emit("change");
    },
    onCreateNode: function(osm){
        this.nodes[osm.id] = osm;
        this.emit("change");
    },
    onDeleteNode: function(osm){
        this.selected = this.lastSelected = undefined;
        this.emit("change");
    },
    onUpdateNode: function(data){
        this.nodes[data.id] = {coords: data.coords, props: data.props};
        this.emit("change");
    },
    onSelectNode: function(data){
        this.lastSelected = this.selected;
        this.selected = this.nodes[data.id];
        this.emit("change");
    }
});

var CuadraStore = Fluxxor.createStore({
    initialize: function(){
        this.cuadras = {};
        this.selected = null;

        this.bindActions(
            constants.WEBSOCKET_LOAD, this.onLoad,
            constants.CREATE_CUADRA, this.onCreateCuadra,   // {id: <Identificador unico>, nodes: <array de ids de nodos>}
            constants.DELETE_CUADRA, this.onDeleteCuadra,  // {id: <Identificador unico>}
            constants.UPDATE_CUADRA, this.onUpdateCuadra,  // {id: <Identificador unico>, nodes: <array de ids de nodos>}
            constants.SELECT_CUADRA, this.onSelectCuadra, // {id: <Identificador unico>}

            constants.DELETE_NODE, this.onDeleteNode
        );
    },
    getState: function(){
        return {
            cuadras: this.cuadras,
            selectedCuadra: this.selected
        };
    },
    onLoad: function(osmData){
        _.forEach(osmData.cuadras, function(osm){
            this.cuadras[osm.id] = osm;
        }, this);
        this.emit("change");
    },
    onCreateCuadra: function(osm){
        this.cuadras[osm.id] = osm;
        this.emit("change");
    },
    onDeleteCuadra: function(osm){
        if (this.selected.id == osm.id)
            this.selected = null;
        this.cuadras[osm.id] = undefined;
        this.emit("change");
    },
    onUpdateCuadra: function(osm){
        this.cuadras[data.id].nodes = osm;
        this.emit("change");
    },
    onSelectCuadra: function(osm){
        this.selected = this.cuadras[osm.id];
        this.emit("change");
    },
    onDeleteNode: function(osm){
        var cuadras = this.cuadras;
        var id = osm.id;
        var changed = false;
        this.select = undefined;
        _.forEach(cuadras, function(cuadra,id){
            if(id in cuadra.nodes){
                changed = true;
                cuadras[id] = undefined;
            }
        });
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
        this.bindActions(
            constants.CREATE_NODE, this.onCreateNode,
            constants.DELETE_NODE, this.onDeleteNode,
            constants.UPDATE_NODE, this.onUpdateNode,
            constants.CREATE_CUADRA, this.onCreateCuadra,
            constants.DELETE_CUADRA, this.onDeleteCuadra,
            constants.UPDATE_CUADRA, this.onUpdateCuadra);
    },
    _send: function(type, data){
        var msg = {
            head: type,
            body: data
        };
        this.socket.send(JSON.stringify(msg));
    },
    onCreateNode: function(data){
        this.send(constants.MESSAGE_CREATE_NODE, data);
    },
    onDeleteNode: function(data){
        this.send(constants.MESSAGE_DELETE_NODE, data);
    },
    onUpdateNode: function(data){
        this.send(constants.MESSAGE_UPDATE_NODE, data);
    },
    onCreateCuadra: function(data){
        this.send(constants.MESSAGE_CREATE_CUAD, data);
    },
    onDeleteCuadra: function(data){
        this.send(constants.MESSAGE_DELETE_CUAD, data);
    },
    onUpdateCuadra: function(data){
        this.send(constants.MESSAGE_UPDATE_CUAD, data);
    }
});


var stores = {
    NodeStore: new NodeStore(),
    CuadraStore: new CuadraStore(),
    CommunicationStore: new CommunicationStore()
};

var flux = new Fluxxor.Flux(stores, actions);

//Debug
flux.on("dispatch", function(type, payload) {
    if (console && console.log) {
        console.log("[Dispatch]", type, payload);
    }
});

module.exports = flux;
