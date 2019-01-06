import React, {Component} from 'react';
import {withStyles} from "@material-ui/core/styles";
import Countdown from "./Countdown";
import PlayersDone from "./PlayersDone";
import WriteAnswer from "./WriteAnswer";

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
    let countDownStart = this.props.tnq.room.round.started_at_wa.seconds;
    let countDownEnd = countDownStart + (this.props.tnq.room.round.timeLimitWriteAnswers/1000);
    let questionsForMe = tnq.room.round.questionsPerUser[tnq.user.uid];
    return (
      <div className='writeAnswers'>
        <Countdown start={countDownStart} end={countDownEnd}/>
        <WriteAnswer tnq={tnq} question={questionsForMe[0]} />
        <WriteAnswer tnq={tnq} question={questionsForMe[1]} />
        <PlayersDone tnq={tnq}/>
      </div>
    );
  }
}

export default withStyles(styles)(WriteAnswers);
