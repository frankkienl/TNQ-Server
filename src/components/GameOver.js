import React, {Component} from 'react';
import {withStyles} from "@material-ui/core/styles";
import {Button} from "@material-ui/core";
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
});


class GameOver extends Component {

  constructor(props) {
    super(props);
    this.state = {showLoading: false};
  }

  render() {
    const {classes} = this.props;
    let tnq = this.props.tnq;
    return (
      <div className='writeAnswers'>
        <main className={classes.layout}>
          <h4>That's all folks!</h4>
          Thanks for playing!
          <Button color='primary' variant='contained' onClick={this.logout}>
            Logout
          </Button>
        </main>
      </div>
    );
  }

  logout = () => {
    let promise = firebase.auth().signOut();
    promise.then(() => {
      console.log('Logged out.');
      //this will reset state
      //TODO: Find better way to reset App-level state.
      window.location.reload();
    });
  }
}

export default withStyles(styles)(GameOver);
