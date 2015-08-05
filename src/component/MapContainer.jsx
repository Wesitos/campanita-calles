'use strict';
import React from "react";
import {FluxMixin, StoreWatchMixin} from "fluxxor";
import _ from "lodash";
import Immutable from "immutable";
import Map from "./Map.jsx";

var MapContainer = React.createClass({
    mixins: [FluxMixin(React),
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
