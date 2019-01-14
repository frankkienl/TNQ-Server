import React, {Component} from 'react';
import * as firebase from "firebase";
import CircularProgress from "@material-ui/core/es/CircularProgress/CircularProgress";
import TextField from "@material-ui/core/TextField";
import {withStyles} from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/es/Typography/Typography";

const styles = theme => ({
  textField: {
    marginLeft: theme.spacing.unit,
    marginRight: theme.spacing.unit,
    width: 200,
  },
  submit: {
    margin: theme.spacing.unit,
    width: 200,
  }
});

class ChangeNickname extends Component {

  constructor(props) {
    super(props);
    this.state = {showLoading: false}
  }

  render() {
    const {classes} = this.props;

    return (
      <div className='nickname'>
        <Typography component="h1" variant="h5">
          Pick a nickname
        </Typography>
        <form onSubmit={this.handleChangeNickname.bind(this)} className={classes.form}>
          <br />
          <TextField
            required
            id="nickname"
            label="Nickname"
            className={classes.textField}
          />
          <br/><br/>
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
          <br/><br/>
          {(this.state.showLoading) ? <CircularProgress/> : ''}
        </form>
      </div>
    );
  }

  handleChangeNickname(e) {
    e.preventDefault();
    this.setState({showLoading: true});
    let changeNick = firebase.functions().httpsCallable('changeNickname');
    changeNick({nickname: document.getElementById('nickname').value})
      .then(function (result) {
        console.log("changed nickname");
        this.setState({showLoading: false});
      }).catch((error) => {
      console.log("changed nickname; error!");
      console.log(error);
      this.setState({showLoading: false});
    });
  }
}

export default withStyles(styles)(ChangeNickname);
