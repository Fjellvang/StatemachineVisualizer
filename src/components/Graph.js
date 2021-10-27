import React from "react";
import ReactDOM from "react-dom";
import cytoscape from "cytoscape";
import regCose from "cytoscape-cose-bilkent";

import Icon from "./Icon";

regCose(cytoscape);

const checkoutMachine = {
  id: "checkout",
  initial: "shipping",
  states: {
    shipping: {
      on: {
        SUBMIT: "setShipping"
      },
      initial: "options",
      states: {
        options: {
          on: {
            EDIT: "form",
            PICKUP: "guideshops"
          }
        },
        form: {
          on: {
            SAVE: "options"
          }
        },
        guideshops: {
          on: {
            SELECT: "options"
          }
        }
      }
    },
    setShipping: {
      on: {
        SUCCESS: "payment",
        FAILURE: "shipping"
      }
    },
    payment: {
      on: {
        PREVIOUS: "shipping",
        SUBMIT: "setPayment"
      },
      initial: "credit-card",
      states: {
        "credit-card": {
          on: {
            SWITCH_DEBIT_CARD: "debit-card",
            SWITCH_BOLETO: "boleto"
          }
        },
        "debit-card": {
          on: {
            SWITCH_CREDIT_CARD: "credit-card"
          }
        },
        boleto: {
          on: {
            SWITCH_CREDIT_CARD: "credit-card"
          }
        },
        "store-credits": {}
      }
    },
    setPayment: {
      on: {
        SUCCESS: "summary",
        FAILURE: "payment"
      }
    },
    summary: {
      on: {
        PREVIOUS: "payment",
        SUBMIT: "purchase"
      },
      initial: "gift-message-open",
      states: {
        "gift-message-open": {
          on: {
            CLICK: "gift-message-close"
          }
        },
        "gift-message-close": {
          on: {
            CLICK: "gift-message-open"
          }
        }
      }
    },
    purchase: {
      on: {
        SUCCESS: "confirmation",
        FAILURE: "summary"
      }
    },
    confirmation: {}
  }
};

export default class Graph extends React.Component {
  constructor() {
    super();

    this.state = {
      nodes: [],
      edges: [],
      showEditor: true,
      raw: JSON.stringify(checkoutMachine, null, 2),
      machine: checkoutMachine
    };
  }

  initializeMachine() {
    const { machine } = this.state;
    const nodes = [];
    const edges = [];

    function addNodesAndEdges(node, key, parent) {
      const id = parent ? parent + "." + key : key;

      if (parent) {
        nodes.push({
          data: {
            id,
            label: key,
            parent
          }
        });
      }

      if (node.states) {
        const states = Object.keys(node.states)
          .map(key => ({
            ...node.states[key],
            id: key
          }))
          .concat({
            id: "$initial",
            initial: 1,
            on: { "": node.initial }
          });

        states.forEach(state => {
          addNodesAndEdges(state, state.id, id);
        });
      }

      if (node.on) {
        const visited = {};
        Object.keys(node.on).forEach(event => {
          const target = node.on[event];
          (visited[target] || (visited[target] = [])).push(event);
        });

        Object.keys(visited).forEach(target => {
          edges.push({
            data: {
              id: key + ":" + target,
              source: id,
              target: parent ? parent + "." + target : target,
              label: visited[target].join(",\n")
            }
          });
        });
      }
    }

    addNodesAndEdges(machine, machine.id || "machine");
    console.log(nodes);
    console.log(edges);
    this.cy = cytoscape({
      container: this.cyNode,

      boxSelectionEnabled: true,
      autounselectify: true,

      style: `
        node {
          padding: 30px;
        }
        node[label != '$initial'] {
          background-color: #282829;
          border-color: #fff;
          border-width: 1px;
          color: white;
          content: data(label);
          font-family: Helvetica Neue;
          font-size: 10px;
          height: label;
          padding-bottom: 5px;
          padding-left: 5px;
          padding-right: 5px;
          padding-top: 5px;
          shape: roundrectangle;
          text-background-padding: 15px;
          text-halign: center;
          text-valign: center;
          width: label;
        }
        node[label = '$initial'] {
          visibility: hidden;
        }
        node:active {
          overlay-color: #ccc;
          overlay-padding: 0;
          overlay-opacity: 0.1;
        }
        $node > node {
          background-color: #282829;
          border-color: white;
          border-width: 1px;
          padding-bottom: 10px;
          padding-left: 10px;
          padding-right: 10px;
          padding-top: 10px;
          text-halign: center;
          text-valign: top;
        }
        edge {
          color: #fff;
          curve-style: bezier;
          font-size: 9px;
          font-weight: bold;
          label: data(label);
          line-color: white;
          target-arrow-color: white;
          target-arrow-shape: triangle;
          target-distance-from-node: 2px;
          text-background-color: #282829;
          text-background-opacity: 1;
          text-background-padding: 3px;
          text-wrap: wrap;
          width: 1px;
          z-index: 100;
        }
        edge[label = ''] {
          source-arrow-shape: circle;
          source-arrow-color: #00ea63;
        }
      `,

      elements: {
        nodes,
        edges
      },

      layout: {
        name: "cose-bilkent",
        randomize: true,
        idealEdgeLength: 70,
        animate: false,
        nodeDimensionsIncludeLabels: true
      }
    });
  }

  componentDidMount() {
    this.initializeMachine();
  }

  handleChange = (e) => {
    const { value } = e.target;
    this.setState({ raw: value });
  };

  handleClickToggle = () => {
    this.setState({
      showEditor: !this.state.showEditor
    }, () => {
      this.generateGraph();
    });
  };

  generateGraph = () => {
    try {
      // be a little lax.
      const machine = eval(`var r=${this.state.raw};r`);
      this.setState({ machine, error: false }, this.initializeMachine);
    } catch (e) {
      console.error(e);
      this.setState({ error: true });
    }
  }

  render() {
    const { raw, showEditor } = this.state;

    return (
      <div className="container">
        <button className="floating refresh" onClick={this.generateGraph}>
          <Icon name="refresh" />
        </button>
        <button className="floating toggle" onClick={this.handleClickToggle}>
          <Icon name="keyboard" />
        </button>

        <div
          className="editor"
          style={{ display: showEditor ? "flex" : "none" }}
        >
          <textarea value={raw} onChange={this.handleChange} />
          <button onClick={this.generateGraph}>Generate graph</button>
        </div>
        <div id="cy" ref={n => (this.cyNode = n)} />
      </div>
    );
  }
}
