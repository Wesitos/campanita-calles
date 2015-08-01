'use strict';

var React = require('react');
var flux = require("../component/flux");
var MapContainer = require("../component/MapContainer.jsx");

//Render
React.render(<MapContainer flux={flux} />,
             document.getElementById("app-container"));
//For debug
window.flux = flux;
