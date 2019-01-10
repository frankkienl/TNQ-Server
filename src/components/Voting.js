import React, {Component} from 'react';
import {withStyles} from "@material-ui/core/styles";
import Countdown from "./Countdown";

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
  }
});


class Voting extends Component {

  constructor(props) {
    super(props);
    this.state = {showLoading: false};
  }

  render() {
    const {classes} = this.props;
    let voteQuestionIndex = 0;
    let tnq = this.props.tnq;
    let countDownStart = 0;//this.props.tnq.room.round.writeAnswersStartedAt.seconds;
    let countDownEnd = 0;//countDownStart + (this.props.tnq.room.round.writeAnswersTimeLimit / 1000);
    //
    let allowedToVote = true;
    let myQuestions = tnq.room.round.questionsPerUser[tnq.user.uid];
    for (let i = 0; i < myQuestions.length; i++) {
      if (myQuestions[i] === 'question' /*+ currentQuestion.id*/) {
        allowedToVote = false;
      }
    }
    //
    return (
      <div className='vote'>
        <main className={classes.layout}>
          <Countdown start={countDownStart} end={countDownEnd}/>

        </main>
      </div>
    );
  }
}

export default withStyles(styles)(Voting);
