import React, {Component} from 'react';
import Login from "./Login";
import PickRoom from "./PickRoom";
import ChangeNickname from "./ChangeNickname";

class Main extends Component {

  render() {

    let mainComp = null;
    //decide based on props
    if (!this.props.tnq.loggedIn){
      mainComp = 'login';
    } else if (!(this.props.tnq && this.props.tnq.user && this.props.tnq.user.nickname)){
      mainComp = 'handleChangeNickname';
    } else if (!this.props.tnq.user.currentRoom){
      mainComp = 'pickRoom';
    }

    switch (mainComp) {
      case 'login':
        return (
          <div className="main">
            <Login tnq={this.props.tnq} firebase={this.props.firebase}/>
          </div>
        );
      case 'handleChangeNickname':
        return (
          <div className="main">
          <ChangeNickname tnq={this.props.tnq} firebase={this.props.firebase}/>
          </div>
        );
      case 'pickRoom':
        return (
          <div className="main">
            <PickRoom tnq={this.props.tnq} firebase={this.props.firebase}/>
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
