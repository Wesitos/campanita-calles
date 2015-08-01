'use strict';

var d3 = require("d3");
var _ = require("lodash");
d3.geo.tile = require("./d3-geo-tile");

// Para prefixes de navegadores
function prefixMatch(p) {
    var i = -1, n = p.length, s = document.body.style;
    while (++i < n){
        if (p[i] + "Transform" in s)
            return "-" + p[i].toLowerCase() + "-";
    }
    return "";
}

module.exports = function(){
    var MapObject = {
        // Al inicio no hay data
        data: [],
        create: function(htmlNode, state){
            var width = Math.max(960, state.width || 0),
                height = Math.max(500, state.height || 0),
                prefix = prefixMatch(["webkit", "ms", "Moz", "O"]);

            this.width = width;
            this.height = height;
            // Interfaz de eventos con react:
            this.mouseMovedCallback = state.mouseMovedCallback;
            this.clickCallback = state.clickCallback;

            var tile = d3.geo.tile()
                .size([width, height]);

            // La proyeccion que vamos a usar, suele ser mercator para tiles
            var projection = d3.geo.mercator()
                .scale((1 << 23) / 2 / Math.PI)
                .translate([-width / 2, -height / 2]);

            var center = projection([-77.0281, -12.0508]).map(function(x){return -x;});

            // Define el comportamiento del zoom del mapa
            var zoom = d3.behavior.zoom()
                .scale(projection.scale() * 2 * Math.PI)
                .scaleExtent([1 << 23, 1 << 25])
                .translate(center)
                .on("zoom", zoomed);

            // With the center computed, now adjust the projection such that
            // it uses the zoom behavior’s translate and scale.
            // projection
            //     .scale(1 / 2 / Math.PI)
            //     .translate([0, 0]);
            
            // Crea el nodo del mapa
            var map = d3.select(htmlNode).append("svg")
                .attr("class", "map")
                .style("width", width + "px")
                .style("height", height + "px")
                .call(zoom)
                .on("mousemove", mouseMoved);
            this.map = map;

            // Agrega el layer de los tiles al mapa
            var layer = map.append("g")
                .attr("class", "layer");

            // Agrega el infobox al mapa
            var info = d3.select(htmlNode)
                .append("div")
                .attr("class", "info");

            // Crea el layer de la data
            var dataLayer = map.append("g")
                    .attr("class", "dataLayer");

            // Para las cuadras
            var cuadraContainer = map.append("g")
                    .attr("id", "cuadraContainer");
            
            // Para los nodos
            var nodeContainer = map.append("g")
                    .attr("id", "nodeContainer");
            
            // Carga la data inicial
            //this.update(state.data);

            var self = this;
            // Funcion que implementa el dibujo de todo el mapa y se encarga del redibujado
            function zoomed() {
                var scale = zoom.scale(),
                    translate = zoom.translate();
                var tiles = tile
                    .scale(scale)
                    .translate(translate)();
                // Actualiza la proyeccion
                projection
                    .scale(scale / 2 / Math.PI)
                    .translate(translate);

                var geoPath = d3.geo.path()
                    .projection(projection)
                    .pointRadius(5);
                
                var image = layer
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

                // Actualiza la data de cuadras
                var cuadras = cuadraContainer
                        .selectAll("path")
                        .data(_.filter(self.data, function(d){
                            return d.geometry.type.toLowerCase() == "linestring";
                        }), function (d) {
                            return d.id;
                        });

                // Actualiza las cuadras ya dibujadas
                cuadras
                    .attr("class", "cuadra")
                    .attr("d",geoPath);

                // Monta las cuadras nuevas
                cuadras.enter()
                    .append("path")
                    .attr("class", "cuadra")
                    .attr("d",geoPath)
                    .on("click", state.onCuadraClick);

                // Desmonta las cuadras eliminadas
                cuadras.exit()
                    .remove();

                // Actualiza la data de nodos
                var nodes = nodeContainer
                        .selectAll("path")
                        .data(_.filter(self.data, function(d){
                            return d.geometry.type.toLowerCase() == "point";
                        }), function (d) {
                            return d.id;
                        });

                // Actualiza los nodos ya dibujados
                nodes
                    .attr("class", "node")
                    .attr("d", geoPath);

                // Monta los nodos nuevos
                nodes.enter()
                    .append("path")
                    .attr("class", "node")
                    .attr("d", geoPath)
                    .on("click", state.onNodeClick);

                // Desmonta los nodos  eliminados
                nodes.exit()
                    .remove();
            };

            // Dibuja el mapa
            zoomed();

            this.update = function(data){
                // Actualiza la data
                self.data = data;
                console.log("Update:", data);
                // Actualiza el mapa
                zoomed();
            };

            // funcion que define el handler del movimiento del mouse
            function mouseMoved(data) {
                var coords = projection.invert(d3.mouse(this));
                //info.text(formatLocation(coords, zoom.scale()));
                info.text(coords.join());
                if (this.mouseMovedCallback)
                    this.mouseMovedCallback(data, coords);
            };

            //funcion que cambia el texto de posicion del mouse
            function formatLocation(p, k) {
                var format = d3.format("." + Math.floor(Math.log(k) / 2 - 2) + "f");
                return (p[1] < 0 ? format(-p[1]) + "°S" : format(p[1]) + "°N") + " "
                    + (p[0] < 0 ? format(-p[0]) + "°W" : format(p[0]) + "°E");
            };
        }
    };
    return MapObject;
};






