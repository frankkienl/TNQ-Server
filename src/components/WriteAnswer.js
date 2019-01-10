import React, {Component} from 'react';

import Button from "@material-ui/core/Button";
import CircularProgress from "@material-ui/core/CircularProgress";
import withStyles from "@material-ui/core/styles/withStyles";
import TextField from "@material-ui/core/TextField";
import Typography from "@material-ui/core/es/Typography/Typography";
import Card from "@material-ui/core/Card";
import * as firebase from "firebase";
import AssignmentTurnedIn from "@material-ui/icons/AssignmentTurnedIn";

const styles = theme => ({
  layout: {
    width: 'auto',
    margin: theme.spacing.unit * 3
  },
});


class WriteAnswer extends Component {

  constructor(props) {
    super(props);
    this.state = {showLoading: false, done: false};
  }

  handleSubmitAnswer = (e) => {
    e.preventDefault();
    this.setState({showLoading: true});
    let answer = document.getElementById(this.props.questionId).value;
    let questionId = this.props.questionId;
    let answerQuestion = firebase.functions().httpsCallable('answerQuestion');
    answerQuestion({answeredQuestionId: questionId, answer: answer})
      .then((result) => {
        console.log("answered question " + questionId, result);
        this.setState({showLoading: false, done: true});
      })
      .catch((error) => {
        console.log("answer question error: ", error);
        this.setState({showLoading: false, done: false});
      });
  };

  render() {
    const {classes} = this.props;
    let tnq = this.props.tnq;
    let questionId = this.props.questionId;
    let questions = tnq.room.round.questions;
    let question = null;
    if (questions) {
      question = questions[questionId].question;
    }
    return (
      <div className='writeAnswer'>
        <Card>
          <form onSubmit={this.handleSubmitAnswer.bind(this)} className={classes.form}>
            <div className={classes.layout}>
              <Typography variant="h6">
                {(question) ? question.question : ''}
              </Typography>
              <br/>
              <TextField
                required
                id={questionId}
                label="Your answer"
                disabled={this.state.done}
                className={classes.textField}
              />
              &nbsp;
              <Button
                type="submit"
                color="primary"
                variant="contained"
                className={classes.submit}
                onClick="this.form.submit();"
                disabled={this.state.showLoading || this.state.done}
              >
                OK
              </Button>
              &nbsp;
              {(this.state.showLoading) ? <CircularProgress/> : ''}
              {(this.state.done) ? <AssignmentTurnedIn/> : ''}
            </div>
          </form>
        </Card>
      </div>
    );
  }
}


export default withStyles(styles)(WriteAnswer);
