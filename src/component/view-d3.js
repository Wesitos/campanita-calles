'use strict';
import d3 from "d3";
import _ from "lodash";
import geotile from "./d3-geo-tile";
d3.geo.tile = geotile;

// Para prefixes de navegadores
function prefixMatch(p) {
    var i = -1, n = p.length, s = document.body.style;
    while (++i < n){
        if (p[i] + "Transform" in s)
            return "-" + p[i].toLowerCase() + "-";
    }
    return "";
}

function sqr(x) { return x * x; };
function dist2(v, w) { return sqr(v[0] - w[0]) + sqr(v[1] - w[1]); };
function distanceToSegment(p, seg) {
    var [v,w] = seg;
    var l2 = dist2(v,w);
    if (l2 == 0) return Math.sqrt(dist2(p, v));
    var t = ((p[0] - v[0]) * (w[0] - v[0]) + (p[1] - v[1]) * (w[1] - v[1])) / l2;
    if (t < 0) return Math.sqrt(dist2(p, v));
    if (t > 1) return Math.sqrt(dist2(p, w));
    return Math.sqrt(dist2(p, [ v[0] + t * (w[0] - v[0]),
                        v[1] + t * (w[1] - v[1]) ]));
}

module.exports = function(){
    var MapObject = {
        // Al inicio no hay data
        nodes: [],
        calles: [],
        selected: {
            node: {},
            prevNode: {},
            calle: {}
        },
        create: function(htmlNode, state){
            var width = Math.max(960, state.width || 0),
                height = Math.max(500, state.height || 0),
                prefix = prefixMatch(["webkit", "ms", "Moz", "O"]);

            this.width = width;
            this.height = height;
            // Interfaz de eventos con react:
            this.mouseMovedCallback = state.mouseMovedCallback;

            var tile = d3.geo.tile()
                    .size([width, height]);

            // La proyeccion que vamos a usar, suele ser mercator para tiles
            var projection = d3.geo.mercator()
                    .scale((1 << 23) / 2 / Math.PI)
            //Con esto la translacion inicial indicara el centro
                    .translate([width / 2, height / 2]);

            var center = projection([-77.0281, -12.0508]);

            // projection.translate(center);
            // Define el comportamiento del zoom del mapa
            var zoom = d3.behavior.zoom()
                    .scale(projection.scale() * 2 * Math.PI)
                    .scaleExtent([1 << 23, 1 << 27])
                    .translate([width - center[0], height - center[1]])
                    .on("zoom", zoomed);

            // With the center computed, now adjust the projection such that
            // it uses the zoom behavior’s translate and scale.
            projection
                .scale(1 / 2 / Math.PI)
                .translate([0, 0]);

            // Crea el nodo del mapa
            var map = d3.select(htmlNode).append("svg")
                    .attr("class", "map")
                    .style("width", width + "px")
                    .style("height", height + "px")
                    .call(zoom)
                    .on("mousemove", mouseMoved);
            this.map = map;

            // Agrega el layer de los tiles al mapa
            var tileContainer = map.append("g")
                    .attr("id", "tileContainer");

            // Agrega el infobox al mapa
            var info = d3.select(htmlNode)
                    .append("div")
                    .attr("class", "info");

            var layers = map.append("g")
                    .attr("id", "layers");
            
            // Para las calles
            var calleContainer = layers.append("g")
                    .attr("id", "calleContainer");

            // Para los segmentos seleccionados
            var segmentContainer = layers.append("g")
                    .attr("id", "segmentContainer");

            // Carga la data inicial
            //this.update(state.data);

            var self = this;
            window.zoom = zoom;

            // Funcion que implementa el dibujo de todo el mapa y se encarga del redibujado
            function zoomed() {
                var scale = zoom.scale(),
                    translate = zoom.translate();
                var tiles = tile
                        .scale(scale)
                        .translate(translate)();

                var geoPath = d3.geo.path()
                        .projection(projection)
                        .pointRadius(function(d){
                            return 5/zoom.scale();
                        });

                var image = tileContainer
                        .attr("transform","scale(" + tiles.scale + ")translate(" + tiles.translate + ")")
                        .selectAll("image")
                        .data(tiles, function(d) { return d; });

                image.exit()
                    .remove();

                var lastHost = 0;
                image.enter().append("image")
                    .attr("class", "tile")
                    .attr("xlink:href", function(d) {
                        return ('http://' + ["a", "b", "c"][lastHost++ % 3] +
                                ".tile.openstreetmap.org/" + d[2] + "/" + d[0] + "/" + d[1] + '.png');
                    })
                    .attr("width", 1)
                    .attr("height", 1)
                    .attr("x", function(d) { return d[0]; })
                    .attr("y", function(d) { return d[1]; });

                layers
                    .attr("transform","translate("+translate+")scale("+ scale +")");

                // Actualiza la data de calles
                var calles = calleContainer
                        .selectAll("path")
                        .data(self.calles);

                // Actualiza las calles ya dibujadas
                calles
                    .attr("d",geoPath)
                    .classed("selected-calle", function(d){
                        return d.id == self.selected.calle.id;
                    });

                // Monta las calles nuevas
                calles.enter()
                    .append("path")
                    .attr("class", "calle")
                    .attr("d", geoPath)
                    .on("click", calleClickHandler);

                // Desmonta las calles eliminadas
                calles.exit()
                    .remove();

                var segments = segmentContainer
                        .selectAll("path")
                        .attr("class","segment")
                        .data(self.selected.segments, function(d){
                            return d.original;
                        });

                segments
                    .enter()
                    .append("path")
                    .attr("class", "segment")
                    .attr("d", geoPath)
                    .on("click", segmentClickHandler);

                segments
                    .exit()
                    .remove();
            }

            this.update = function(data){
                // Actualiza la data
                self.nodes = data.nodes;
                self.nodeMap = data.nodeMap;
                self.calles = data.calles;
                self.selected ={
                    node: data.selectNode,
                    prevNode: data.prevSelectedNode,
                    calle: data.selectedCalle,
                    segments: data.selectedSegments
                };
                console.log("Update:", data);
                // Actualiza el mapa
                zoomed();
            };

            function  calleClickHandler(data){
                var mousePos = d3.mouse(this);
                var vertices = _.map(data.geometry.coordinates, projection);
                var segments = _.dropRight(_.zip(vertices, _.rest(vertices)));
                var closest = _.reduce(segments, function(result, seg, i){
                    var distance = distanceToSegment(mousePos,seg);
                    if (distance < result.distance)
                        return {index: i, distance: distance};
                    else
                        return result;
                }, {index: 0, distance: Infinity});
                
                state.onCalleClick(data, [data.geometry.coordinates[closest.index],
                                          data.geometry.coordinates[closest.index + 1]]);
            };

            function segmentClickHandler(data){
                state.onSegmentClick(data.original);
            };

            // Funcion para proyectar de cartesianas (svg) a geograficas
            function inverseProject(coords){
                var scale = zoom.scale();
                var trans = zoom.translate();
                return projection.invert(_.map(coords, function(v,i){
                    return (v - trans[i])/ scale;
                }));
            };

            // funcion que define el handler del movimiento del mouse
            function mouseMoved(data) {
                var coords = inverseProject(d3.mouse(this));
                info.text(coords.join());
                if (this.mouseMovedCallback)
                    this.mouseMovedCallback(data, coords);
            };
        }
    };
    return MapObject;
};
