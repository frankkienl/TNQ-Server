import React, {Component, Fragment} from 'react';
import {withStyles} from "@material-ui/core/styles";
import {Badge, Button, CardContent, Typography} from "@material-ui/core";
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
  },
  margin: {
    margin: theme.spacing.unit * 2,
  },
  card: {
    minWidth: 100,
    minHeight: 60,
  },

});


class RoundResult extends Component {

  constructor(props) {
    super(props);
    this.state = {showLoading: false};
  }

  render() {
    const {classes} = this.props;
    let tnq = this.props.tnq;
    let isVip = this.isVip();
    let players = this.props.tnq.room.players;
    //
    return (
      <div className='vote'>
        <main className={classes.layout}>
          <Typography variant='h4'>Scores</Typography>
          {this.scoreBoard(players)}
          <br />
          {isVip &&
          <Fragment><br/><Button variant='contained' color='primary' onClick={this.goToNext}>Next</Button></Fragment>}
        </main>
      </div>
    );
  }

  scoreBoard = (players) => {
    players.sort((a, b) => {
      if (!a.score) {
        a.score = 0;
      }
      if (!b.score) {
        b.score = 0;
      }
      if (a.score !== b.score) {
        return b.score - a.score;
      }
      //tie-breaker is nickname
      if (a.nickname < b.nickname) {
        return -1;
      }
      if (a.nickname > b.nickname) {
        return 1;
      }
      //or not.
      return 0;
    });

    let nr = 1;
    let cards = players.map((player) => {
      return this.scoreCard(nr++, player)
    });
    return (<Fragment>{cards}</Fragment>);
  };

  scoreCard = (nr, player) => {
    let {classes} = this.props;
    return (
      <Badge badgeContent={nr}
             color='secondary'
             className={classes.margin}>
        <Card className={classes.card}>
          <CardContent>
            <Typography>{player.nickname}</Typography>
            <br/>
            <Typography>{player.score ? player.score : '0'}</Typography>
          </CardContent>
        </Card>
      </Badge>
    );
  };

  isVip = () => {
    let tnq = this.props.tnq;
    let isVip = ((tnq && tnq.room && tnq.user) && tnq.room.vip === tnq.user.uid);
    return isVip;
  };

  goToNext = () => {
    if (!this.isVip) {
      return;
    }
    console.log('go to next round');
    let nextRound = firebase.functions().httpsCallable('vipGoToNextRound');
    nextRound({}).then(() => {
      console.log('Going to next round.');
    }).catch((error) => {
      console.log(error);
      //alert(error); //What error? I don't see anything.
    });
  }

}

export default withStyles(styles)(RoundResult);
