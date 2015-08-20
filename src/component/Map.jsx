'use strict';
import React from "react";
import _ from "lodash";
import Immutable from "immutable";
import MapObject from "./view-d3";

var Map = React.createClass({
    mixins: [React.addons.PureRenderMixin],
    componentDidMount: function(){
        var node = React.findDOMNode(this.refs.container);
        this.map = MapObject();
        this.map.create(node, this.props);
        // Agrega la data inicial
        this.componentDidUpdate();
    },
    // Construye los geoJson
    computeData: function(){
        var MapNodos = this.props.nodes;
        var cuadras = _.map(this.props.cuadras.toArray(), function(osm){
            var nodeIds = osm.get("nodes").toArray();
            return {
                type: "Feature",
                id: osm.get("id"),
                nodes: nodeIds, // tambien pasamos los ids
                geometry:{
                    type: "LineString",
                    coordinates: _.map(nodeIds, function(id){
                        var osm = MapNodos.get(id);
                        return [osm.get("lon"),osm.get("lat")];
                    })
                },
                properties: osm.get("tags").toObject()
            };
        });
        var nodos = _.map(MapNodos.toArray(), function(osm){
            return {
                type: "Feature",
                id:osm.get("id"),
                geometry: {
                    type: "Point",
                    coordinates: [osm.get("lon"),osm.get("lat")]
                },
                properties: osm.get("tags").toObject()
            };
        });
        return {
            nodes: nodos,
            calles: cuadras,
            selectedNode: this.props.selectedNode.toJS(),
            prevSelectedNode: this.props.lastSelectedNode.toJS(),
            selectedCuadra: this.props.selectedCuadra.toJS(),
            nodeMap: this.props.nodes
        };
    },
    componentDidUpdate: function(){
        this.map.update(this.computeData());
    },
    render: function(){
        return (
            <div id="map-container" ref="container"></div>
        );
    }
});

module.exports = Map;
