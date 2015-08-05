'use strict';

var React = require('react');
var Fluxxor = require('fluxxor');

var FluxMixin = Fluxxor.FluxMixin(React);
var StoreWatchMixin = Fluxxor.StoreWatchMixin;
var flux = require("../component/flux");
var _ = require("lodash");
var Immutable = require('immutable');

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
        return DataNodes.merge(DataCuadras).toObject();
    },
    nodeClickHandler: function(geojson){
        this.getFlux().actions.selectNode(geojson);
    },
    cuadraClickHandler: function(geojson){
        this.getFlux().actions.selectCuadra(geojson);
    },
    render: function(){
        return(
            <Map height={this.props.height}
                 width={this.props.width}
                 onNodeClick={this.nodeClickHandler}
                 onCuadraClick={this.cuadraClickHandler}
                 {...this.state}/>
        );
    }
});

module.exports = MapContainer;
