'use strict';

var React = require('react');
var Fluxxor = require('fluxxor');
var _ = require('lodash');

var FluxMixin = Fluxxor.FluxMixin(React);

var MapObject =require('./view-d3');

var Map = React.createClass({
    componentDidMount: function(){
        var node = React.findDOMNode(this.refs.container);
        this.map = MapObject();
        this.map.create(node, this.props);
        // Agrega la data inicial
        this.componentDidUpdate();
    },
    // Construye los geoJson
    computeData: function(){
        var dictNodos = this.props.nodes;
        var cuadras = _.map(this.props.cuadras, function(osm, key){
            return {
                type: "Feature",
                id: osm.id,
                geometry:{
                    nodes: osm.nodes, // tambien pasamos los ids
                    type: "LineString",
                    coordinates: _.map(osm.nodes, function(id){
                        var osm = dictNodos[id];
                        return [osm.lon,osm.lat];
                    })
                },
                properties: osm.tags
            };
        });
        var nodos = _.map(dictNodos, function(osm, key){
            return {
                type: "Feature",
                id:osm.id,
                geometry: {
                    type: "Point",
                    coordinates: [osm.lon,osm.lat]
                },
                properties: osm.tags
            };
        });
        return nodos.concat(cuadras);
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
