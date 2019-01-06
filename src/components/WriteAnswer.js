import React, {Component} from 'react';

import Button from "@material-ui/core/Button";
import CircularProgress from "@material-ui/core/CircularProgress";
import withStyles from "@material-ui/core/styles/withStyles";
import TextField from "@material-ui/core/TextField";
import Typography from "@material-ui/core/es/Typography/Typography";

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


class WriteAnswer extends Component {

  constructor(props) {
    super(props);
    this.state = {showLoading: false};
  }

  handleSubmitAnswer = () => {
  };

  render() {
    const {classes} = this.props;
    let tnq = this.props.tnq;
    let questionId = this.props.question;
    let question = tnq.room.round.question;
    return (
      <div className='writeAnswer'>
        <form onSubmit={this.handleSubmitAnswer.bind(this)} className={classes.form}>
          <Typography variant="h6">

          </Typography>
          <br/>
          <TextField
            required
            id={questionId}
            label="Your answer"
            className={classes.textField}
          />
          &nbsp;
          <Button
            type="submit"
            color="primary"
            variant="contained"
            className={classes.submit}
            onClick="this.form.submit();"
            disabled={this.state.showLoading}
          >
            OK
          </Button>
          &nbsp;
          {(this.state.showLoading) ? <CircularProgress/> : ''}
        </form>
      </div>
    );
  }
}


export default withStyles(styles)(WriteAnswer);
