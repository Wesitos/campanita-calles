'use strict';

var React = require('react');
var Fluxxor = require('fluxxor');
var _ = require('lodash');
var Immutable = require('immutable');

var FluxMixin = Fluxxor.FluxMixin(React);

var MapObject = require('./view-d3');

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
            return {
                type: "Feature",
                id: osm.get("id"),
                geometry:{
                    nodes: osm.get("nodes").toArray(), // tambien pasamos los ids
                    type: "LineString",
                    coordinates: _.map(osm.get("nodes").toArray(), function(id){
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
            cuadras: cuadras,
            selectedNode: this.props.selectedNode.toObject(),
            prevSelectedNode: this.props.lastSelectedNode.toObject(),
            selectedCuadra: this.props.selectedCuadra.toObject()
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
