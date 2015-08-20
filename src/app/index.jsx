'use strict';
import React from "react";
import flux from "../component/flux";
import MapContainer from "../component/MapContainer.jsx";

// Carga la data inicial
flux.actions.websocketConnect();

//Render
React.render(<MapContainer flux={flux} />,
             document.getElementById("app-container"));
//For debug
window.flux = flux;
