import React from "react";
import { render } from "react-dom";
import Graph from "./components/Graph";

import "./index.css";

const App = () => (
  <div className="app">
    <header>
      <h1>State Machine Visualizer</h1>
    </header>
    <Graph />
  </div>
);

render(<App />, document.getElementById("root"));
