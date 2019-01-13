import React, {Component} from 'react';
import {withStyles} from "@material-ui/core/styles";
import Countdown from "./Countdown";
import {Button, Typography} from "@material-ui/core";
import * as firebase from "firebase";
import CircularProgress from "@material-ui/core/CircularProgress";

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
    let tnq = this.props.tnq;
    let countDownStart = 0;//this.props.tnq.room.round.writeAnswersStartedAt.seconds;
    let countDownEnd = 0;//countDownStart + (this.props.tnq.room.round.writeAnswersTimeLimit / 1000);
    //
    let currentQuestionId = 'question' + (tnq.room.round.votingQuestionIndex + 1);
    if (!tnq.room.round.questions || !tnq.room.round.answers) {
      return (<p>Loading question and answers for voting...</p>);
    }
    let currentQuestion = tnq.room.round.questions[currentQuestionId];
    let currentAnswers = tnq.room.round.answers;
    let allowedToVote = true;
    let myQuestions = tnq.room.round.questionsPerUser[tnq.user.uid];
    for (let i = 0; i < myQuestions.length; i++) {
      if (myQuestions[i] === currentQuestionId) {
        allowedToVote = false;
      }
    }
    //
    return (
      <div className='vote'>
        <main className={classes.layout}>
          <Countdown start={countDownStart} end={countDownEnd}/>
          <Typography variant='h6'>{currentQuestion.question.question}</Typography>
          <Button
            color='primary'
            variant='contained'
            onClick={this.handleVoteLeft}
            disabled={!allowedToVote || this.state.showLoading}
          >
            {currentAnswers[currentQuestion.leftPlayer][currentQuestionId]}
          </Button>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          <Button
            color='primary'
            variant='contained'
            onClick={this.handleVoteRight}
            disabled={!allowedToVote || this.state.showLoading}
          >
            {currentAnswers[currentQuestion.rightPlayer][currentQuestionId]}
          </Button>
          {this.state.showLoading && <CircularProgress />}
          {!allowedToVote &&
          <Typography variant='body1'><i>You are not allowed to vote on your own questions.</i></Typography>}
        </main>
      </div>
    );
  }

  handleVoteLeft = () => {
    this.handleVote(this.props.tnq.room.round.questions['question' + (this.props.tnq.room.round.votingQuestionIndex + 1)].leftPlayer)
  };

  handleVoteRight = () => {
    this.handleVote(this.props.tnq.room.round.questions['question' + (this.props.tnq.room.round.votingQuestionIndex + 1)].rightPlayer)
  };

  handleVote = (playerId) => {
    //answer
    let questionId = 'question' + (this.props.tnq.room.round.votingQuestionIndex + 1);
    this.setState({showLoading : true});
    let vote = firebase.functions().httpsCallable('voteForAnswer');
    vote({votedQuestionId: questionId, vote: playerId}).then(() => {
      this.setState({showLoading : false});
      console.log(`voting done. ${questionId} ${playerId}`);
    }).catch((error) => {
      this.setState({showLoading : false});
      console.log(error);
      //alert(error); //pretend it didn't happen
    });
  };

}

export default withStyles(styles)(Voting);
