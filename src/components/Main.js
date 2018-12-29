import React, {Component} from 'react';
import Login from "./Login";

class Main extends Component {

  constructor(props) {
    super(props);
    let mainComp = null;

    if (!props.tnq.loggedIn){
      mainComp = 'login';
    }

    this.state = {tnq: props.tnq, mainComp: mainComp};
  }

  render() {
    switch (this.state.mainComp) {
      case 'login':
        return (
          <div className="main">
            <Login state={this.state}/>
          </div>
        );
      default:
        return (
          <div className="main">
            State not found
          </div>
        );
    }
  }
}

export default Main;
