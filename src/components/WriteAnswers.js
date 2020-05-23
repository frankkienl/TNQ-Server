import React, {Component} from 'react';
import {withStyles} from "@material-ui/core/styles";
import Countdown from "./Countdown";
import WriteAnswer from "./WriteAnswer";
import RoomPlayers from "./RoomPlayers";
import PlayersDone from "./PlayersDone";

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


class WriteAnswers extends Component {

  constructor(props) {
    super(props);
    this.state = {showLoading: false};
  }

  render() {
    const {classes} = this.props;
    let tnq = this.props.tnq;
    let countDownStart = tnq.room.round.writeAnswersStartedAt.seconds;
    let countDownEnd = countDownStart + (tnq.room.round.writeAnswersTimeLimit / 1000);
    let questionsForMe = tnq.room.round.questionsPerUser[tnq.user.uid];
    return (
      <div className='writeAnswers'>
        <main className={classes.layout}>
          <Countdown start={countDownStart} end={countDownEnd}/>
          <br/>
          <WriteAnswer tnq={tnq} questionId={questionsForMe[0]}/>
          <br/>
          <WriteAnswer tnq={tnq} questionId={questionsForMe[1]}/>
          <RoomPlayers tnq={tnq}/>
          <PlayersDone tnq={tnq}/>
        </main>
      </div>
    );
  }
}

export default withStyles(styles)(WriteAnswers);
