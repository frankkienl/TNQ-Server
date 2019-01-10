import React, {Component} from 'react';
import {withStyles} from "@material-ui/core/styles";
import {Badge, Typography} from "@material-ui/core";
import Card from "@material-ui/core/Card";

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
    margin: {
      margin: theme.spacing.unit * 2,
    },
  }
});


class VotingResult extends Component {

  constructor(props) {
    super(props);
    this.state = {showLoading: false};
  }

  render() {
    const {classes} = this.props;
    let tnq = this.props.tnq;
    let currentQuestionId = 'question' + (tnq.room.round.votingQuestionIndex + 1);
    if (!tnq.room.round.questions || !tnq.room.round.answers) {
      return (<p>Loading question and answers for voting...</p>);
    }
    let currentQuestion = tnq.room.round.questions[currentQuestionId];
    let currentAnswers = tnq.room.round.answers;
    let playersNames = {};
    tnq.room.players.forEach((player) => {
      playersNames[player.uid] = player.nickname;
    });
    //
    return (
      <div className='vote'>
        <main className={classes.layout}>
          <Typography variant='h5'>{currentQuestion.question.question}</Typography>
          <Badge className={classes.margin} badgeContent={0} color='secondary'>
            <Card>
              <Typography variant='h6'>{currentAnswers[currentQuestion.leftPlayer][currentQuestionId]}</Typography>
              {playersNames[currentQuestion.leftPlayer]}
            </Card>
          </Badge>
          &nbsp;
          <Badge className={classes.margin} badgeContent={0} color='secondary'>
            <Card>
              <Typography variant='h6'>{currentAnswers[currentQuestion.rightPlayer][currentQuestionId]}</Typography>
              {playersNames[currentQuestion.rightPlayer]}
            </Card>
          </Badge>
        </main>
      </div>
    );
  }


}

export default withStyles(styles)(VotingResult);
