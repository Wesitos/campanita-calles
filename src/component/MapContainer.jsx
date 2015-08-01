'use strict';

var React = require('react');
var Fluxxor = require('fluxxor');

var FluxMixin = Fluxxor.FluxMixin(React);
var StoreWatchMixin = Fluxxor.StoreWatchMixin;
var flux = require("../component/flux");
var _ = require("lodash");

var Map = require('./Map.jsx');

var MapContainer = React.createClass({
    mixins: [FluxMixin,
             StoreWatchMixin('NodeStore', 'CuadraStore')],
    getDefaultProps: function(){
        return {
            height: 500,
            width: 700
        };
    },
    getStateFromFlux: function(){
        var flux = this.getFlux();
        var DataNodes = flux.store("NodeStore").getState();
        var DataCuadras = flux.store("CuadraStore").getState();
        return _.merge(DataNodes, DataCuadras);
    },
    nodeClickHandler: function(node){
        this.getFlux().actions.selectNode(node);
    },
    cuadraClickHandler: function(cuadra){
        this.getFlux().actions.selectCuadra(cuadra);
    },
    render: function(){
        return(
            <Map height={this.props.height}
                 width={this.props.width}
                 nodes={this.state.nodes}
                 cuadras={this.state.cuadras}
                 onNodeClick={this.nodeClickHandler}
                 onCuadraClick={this.cuadraClickHandler}/>
        );
    }
});

module.exports = MapContainer;
