'use strict';
import React from "react";
import {FluxMixin, StoreWatchMixin} from "fluxxor";
import _ from "lodash";
import Immutable from "immutable";
import Map from "./Map.jsx";

var MapContainer = React.createClass({
    mixins: [FluxMixin(React),
             StoreWatchMixin('NodeStore', 'CalleStore', 'DireccionStore')],
    getDefaultProps: function(){
        return {
            height: 500,
            width: 700
        };
    },
    getStateFromFlux: function(){
        var flux = this.getFlux();
        var dataNodes = flux.store("NodeStore").getState();
        var dataCalles = flux.store("CalleStore").getState();
        var dataDireccion = flux.store("DireccionStore").getState();
        return dataNodes.merge(dataCalles).merge(dataDireccion).toObject();
    },
    nodeClickHandler: function(geojson){
        this.getFlux().actions.selectNode(geojson);
    },
    calleClickHandler: function(geojson, geoSegment){
        this.getFlux().actions.selectSegment(geoSegment);
    },
    segmentClickHandler: function(immutable){
        this.getFlux().actions.unselectSegment(immutable);
    },
    render: function(){
        return(
            <Map height={this.props.height}
                 width={this.props.width}
                 onNodeClick={this.nodeClickHandler}
                 onCalleClick={this.calleClickHandler}
                 onSegmentClick={this.segmentClickHandler}
                 {...this.state}/>
        );
    }
});

module.exports = MapContainer;
