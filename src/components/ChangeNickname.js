import React, {Component} from 'react';
import * as firebase from "firebase";
import CircularProgress from "@material-ui/core/es/CircularProgress/CircularProgress";
import TextField from "@material-ui/core/TextField";
import {withStyles} from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/es/Typography/Typography";
import Dialog from "@material-ui/core/Dialog";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import DialogTitle from "@material-ui/core/DialogTitle";
import 'emoji-mart/css/emoji-mart.css'
import {Picker} from "emoji-mart";

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

    let oldNickname = '';
    if (props.tnq && props.tnq.user && props.tnq.user.nickname) {
      oldNickname = props.tnq.user.nickname;
    } else if (props.firebase.user && props.firebase.user.displayName) {
      oldNickname = props.firebase.user.displayName;
    }
    this.state = {
      showNicknameLoading: false,
      dialogEmojiOpen: false,
      nickname: oldNickname
    }
  }

  render() {
    const {classes} = this.props;

    return (
      <div className='nickname'>
        <Typography component="h1" variant="h5">
          Pick a nickname
        </Typography>
        <form onSubmit={this.handleDialogNicknameSubmit.bind(this)} className={classes.form}>
          <br/>
          <TextField
            autoFocus
            required
            id="nickname"
            label="Nickname"
            className={classes.textField}
            onChange={this.handleNicknameTyping}
            value={this.state.nickname}
          />
          <Button onClick={this.handleOpenEmojiPicker.bind(this)}>🙂</Button>
          <br/><br/>
          <Button
            type="submit"
            color="primary"
            variant="contained"
            className={classes.submit}
            onClick="this.form.submit();"
            disabled={this.state.showNicknameLoading}
          >
            OK
          </Button>
          <br/><br/>
          {(this.state.showNicknameLoading) ? <CircularProgress/> : ''}
        </form>

        <Dialog
          open={this.state.dialogEmojiOpen}
          onClose={this.handleCloseEmojiPicker}
          aria-labelledby="form-dialog-title">
          <DialogTitle id="form-dialog-title">Pick Emoji</DialogTitle>
          <DialogContent>
            <Picker set='google' emoji='slightly_smiling_face' onSelect={this.handleEmojiPick}/>
          </DialogContent>
          <DialogActions>
            <Button onClick={this.handleCloseEmojiPicker} color="primary">
              Done
            </Button>
          </DialogActions>
        </Dialog>

      </div>
    );
  }

  handleOpenEmojiPicker = () => {
    this.setState({dialogEmojiOpen: true});
  };

  handleCloseEmojiPicker = () => {
    this.setState({dialogEmojiOpen: false});
  };

  handleNicknameTyping = () => {
    let nickname = document.getElementById('nickname').value;
    this.setState({nickname: nickname});
  };

  handleEmojiPick = (emoji) => {
    let nickname = document.getElementById('nickname').value;
    nickname += emoji.native;
    this.setState({nickname: nickname});
  };

  handleDialogNicknameSubmit(e) {
    e.preventDefault();
    this.setState({showNicknameLoading: true});
    let changeNick = firebase.functions().httpsCallable('changeNickname');
    changeNick({nickname: document.getElementById('nickname').value})
      .then(function (result) {
        console.log("changed nickname");
        this.setState({showNicknameLoading: false});
      }).catch((error) => {
      console.log("changed nickname; error!");
      console.log(error);
      this.setState({showNicknameLoading: false});
    });
  }
}

export default withStyles(styles)(ChangeNickname);
