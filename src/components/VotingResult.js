import React, {Component, Fragment} from 'react';
import {withStyles} from "@material-ui/core/styles";
import {Badge, Button, CardContent, Divider, Typography} from "@material-ui/core";
import Card from "@material-ui/core/Card";
import * as firebase from "firebase";

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
    card: {
      minWidth: 375,
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
    let isVip = this.isVip();
    //
    return (
      <div className='vote'>
        <main className={classes.layout}>
          <Typography variant='h5'>{currentQuestion.question.question}</Typography>
          <br/><br/>
          <Badge className={classes.margin} badgeContent={0} color='secondary'>
            <Card className={classes.card}>
              <CardContent>
                <Typography variant='h6'>{currentAnswers[currentQuestion.leftPlayer][currentQuestionId]}</Typography>
                {playersNames[currentQuestion.leftPlayer]}
                <Divider />
              </CardContent>
            </Card>
          </Badge>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          <Badge className={classes.margin} badgeContent={0} color='secondary'>
            <Card className={classes.card}>
              <CardContent>
                <Typography variant='h6'>{currentAnswers[currentQuestion.rightPlayer][currentQuestionId]}</Typography>
                {playersNames[currentQuestion.rightPlayer]}
                <Divider />
              </CardContent>
            </Card>
          </Badge>
          <br/>
          {isVip && <Fragment><br /><Button variant='contained' color='primary' onClick={this.goToNext}>Next</Button></Fragment>}
        </main>
      </div>
    );
  }

  isVip = () => {
    let tnq = this.props.tnq;
    let isVip = ((tnq && tnq.room && tnq.user) && tnq.room.vip === tnq.user.uid);
    return isVip;
  };

  goToNext = () => {
    if (!this.isVip){return;}
    console.log('go to next vote, after viewing results');
    let nextVote = firebase.functions().httpsCallable('vipNextVote');
    nextVote({}).then(() => {
      console.log('Going to next vote.');
    }).catch((error) => {
      console.log(error);
      //alert(error); //What error? I don't see anything.
    });
  }

}

export default withStyles(styles)(VotingResult);
