import React, {Component} from 'react';
import Login from "./Login";
import PickRoom from "./PickRoom";
import ChangeNickname from "./ChangeNickname";
import Room from "./Room";
import WriteAnswers from "./WriteAnswers";
import Voting from "./Voting";
import VotingResult from "./VotingResult";
import RoundResult from "./RoundResult";
import GameOver from "./GameOver";

class Main extends Component {

  render() {

    let mainComp = null;
    //decide based on props
    let tnq = this.props.tnq;
    if (!this.props.tnq.loggedIn) {
      mainComp = 'login';
    } else if (!(tnq && tnq.user && tnq.user.nickname)) {
      mainComp = 'handleChangeNickname';
    } else if (!tnq.user.roomCode) {
      mainComp = 'pickRoom';
    } else if (tnq.user.roomCode && tnq.room) {
      if (tnq.room.status === 'waitingForPlayers') {
        mainComp = 'room';
      } else if (tnq.room.status.startsWith('round')) {
        //check room status
        if (tnq.room.round) {
          if (tnq.room.round.status === 'writeAnswers') {
            mainComp = 'writeAnswers';
          } else if (tnq.room.round.status === 'vote'){
            mainComp = 'vote';
          } else if (tnq.room.round.status === 'voteResult'){
            mainComp = 'voteResult';
          } else if (tnq.room.round.status === 'results') {
            mainComp = 'results';
          }
        }
      } else if (tnq.room.status === 'gameOver'){
        mainComp = 'gameOver';
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
            <PickRoom tnq={tnq}/>
          </div>
        );
      case 'room':
        return (
          <div className="main">
            <Room tnq={tnq}/>
          </div>
        );
      case 'writeAnswers':
        return (
          <div className="main">
            <WriteAnswers tnq={tnq}/>
          </div>
        );
      case 'vote':
        return (
          <div className="main">
            <Voting tnq={tnq}/>
          </div>
        );
        case 'voteResult':
        return (
          <div className="main">
            <VotingResult tnq={tnq}/>
          </div>
        );
      case 'results':
        return (
          <div className="main">
            <RoundResult tnq={tnq}/>
          </div>
        );
      case 'gameOver':
        return (
          <div className="main">
            <GameOver tnq={tnq}/>
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
