import React, {Component} from 'react';
import Login from "./Login";
import PickRoom from "./PickRoom";
import ChangeNickname from "./ChangeNickname";
import Room from "./Room";
import WriteAnswers from "./WriteAnswers";
import Vote from "./Vote";

class Main extends Component {

  render() {

    let mainComp = null;
    //decide based on props
    let tnq = this.props.tnq;
    if (!this.props.tnq.loggedIn) {
      mainComp = 'login';
    } else if (!(tnq && tnq.user && tnq.user.nickname)) {
      mainComp = 'handleChangeNickname';
    } else if (!tnq.user.currentRoom) {
      mainComp = 'pickRoom';
    } else if (tnq.user.currentRoom && tnq.room) {
      if (tnq.room.status === 'waiting_for_players') {
        mainComp = 'room';
      } else if (tnq.room.status.startsWith('round')) {
        //check room status
        if (tnq.room.round) {
          if (tnq.room.round.status === 'write_answers') {
            mainComp = 'write_answers';
          } else if (tnq.room.round.status === 'vote'){
            mainComp = 'vote';
          }
        }

      }
    }

    switch (mainComp) {
      case 'login':
        return (
          <div className="main">
            <Login tnq={tnq} firebase={this.props.firebase}/>
          </div>
        );
      case 'handleChangeNickname':
        return (
          <div className="main">
            <ChangeNickname tnq={tnq} firebase={this.props.firebase}/>
          </div>
        );
      case 'pickRoom':
        return (
          <div className="main">
            <PickRoom tnq={tnq} firebase={this.props.firebase}/>
          </div>
        );
      case 'room':
        return (
          <div className="main">
            <Room tnq={tnq} firebase={this.props.firebase}/>
          </div>
        );
      case 'write_answers':
        return (
          <div className="main">
            <WriteAnswers tnq={tnq} firebase={this.props.firebase}/>
          </div>
        );
      case 'vote':
        return (
          <div className="main">
            <Vote tnq={tnq} firebase={this.props.firebase} />
          </div>
        );
      default:
        return (
          <div className="main">
            Loading...
          </div>
        );
    }
  }
}

export default Main;
