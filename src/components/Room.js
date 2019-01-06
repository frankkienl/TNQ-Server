import React, {Component, Fragment} from 'react';
import {withStyles} from "@material-ui/core/styles";
import RoomPlayers from "./RoomPlayers";
import Typography from "@material-ui/core/es/Typography/Typography";
import PickQuestionPacks from "./PickQuestionPacks";
import Button from "@material-ui/core/es/Button/Button";
import * as firebase from "firebase";
import CircularProgress from "@material-ui/core/es/CircularProgress/CircularProgress";

const styles = theme => ({
  layout: {
    width: 'auto',
    marginLeft: theme.spacing.unit * 3,
    marginRight: theme.spacing.unit * 3,
    [theme.breakpoints.up(900 + theme.spacing.unit * 3 * 2)]: {
      width: 900,
      marginLeft: 'auto',
      marginRight: 'auto',
    },
  },
  cardHeader: {
    backgroundColor: theme.palette.grey[200],
  },
  cardActions: {
    [theme.breakpoints.up('sm')]: {
      paddingBottom: theme.spacing.unit * 2,
    },
  },
});


class Room extends Component {

  constructor(props) {
    super(props);
    this.state = {showLoading: false};
  }

  handleStartButton = () => {
    let canStart = this.canStart();
    if (!canStart) {
      return;
    }
    console.log('Starting game...');
    this.setState({showLoading: true});
    let startGame = firebase.functions().httpsCallable('startGame');
    startGame().then(function (result) {
      console.log("started game", result);
      this.setState({showLoading: false});
    }).catch((error) => {
      console.log('Starting game error', error);
      this.setState({showLoading: false});
    });
  };

  //<editor-fold desc="Checks">
  isVip = () => {
    let tnq = this.props.tnq;
    let isVip = ((tnq && tnq.room && tnq.user) && tnq.room.vip === tnq.user.uid);
    return isVip;
  };

  hasEnoughPlayers = () => {
    let tnq = this.props.tnq;
    let hasEnoughPlayers = (tnq && tnq.room && tnq.room.players && (tnq.room.players.length >= 3));
    return hasEnoughPlayers;
  };

  hasCorrectRoomState = () => {
    let tnq = this.props.tnq;
    let isCorrectRoomState = (tnq && tnq.room && tnq.room.status === 'waiting_for_players');
    return isCorrectRoomState;
  };

  canStart = () => {
    let isVip = this.isVip();
    let hasEnoughPlayers = this.hasEnoughPlayers();
    let hasCorrectRoomState = this.hasCorrectRoomState();
    let canStart = (isVip && hasEnoughPlayers && hasCorrectRoomState);
    return canStart;
  };

  //</editor-fold>

  render() {
    const {classes} = this.props;
    let tnq = this.props.tnq;
    let isVip = this.isVip();
    let canStart = this.canStart();
    return (
      <div className='room'>
        <Typography variant="h6">Roomcode: {tnq.user.currentRoom}</Typography>
        <br/>
        {(isVip) ?
          <Fragment>
            <Button
              onClick={this.handleStartButton}
              color="primary"
              variant="contained"
              disabled={!canStart || this.state.showLoading}
            >Start game</Button>
            {this.state.showLoading ? <Fragment><br /><CircularProgress/><br/></Fragment> : ''}
            {!this.hasEnoughPlayers() && <Fragment><i>You need at least 3 players.</i><br/></Fragment>}
            {!this.hasCorrectRoomState() && <Fragment><i>Room is not ready or already started.</i><br/></Fragment>}
          </Fragment> : ''
        }
        <br/>
        <PickQuestionPacks tnq={this.props.tnq}/>
        <br/>
        <RoomPlayers tnq={this.props.tnq}/>
      </div>
    );
  }
}

export default withStyles(styles)(Room);
