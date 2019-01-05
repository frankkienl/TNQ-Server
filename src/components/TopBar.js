import React, {Component, Fragment} from 'react';
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import IconButton from "@material-ui/core/IconButton";
import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import AccountCircle from '@material-ui/icons/AccountCircle';
import {withStyles} from "@material-ui/core/styles";
import * as firebase from "firebase";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import TextField from "@material-ui/core/TextField";
import DialogActions from "@material-ui/core/DialogActions";
import Button from "@material-ui/core/Button";
import CircularProgress from "./ChangeNickname";

const styles = {
  root: {
    flexGrow: 1,
  },
  grow: {
    flexGrow: 1,
  }
};


class TopBar extends Component {

  state = {
    auth: true,
    anchorEl: null,
  };

  handleMenu = event => {
    this.setState({anchorEl: event.currentTarget});
  };

  handleMenuClose = () => {
    this.setState({anchorEl: null});
  };

  handleDialogNicknameOpen = () => {
    this.setState({dialogNicknameOpen: true});
  };

  handleDialogNicknameSubmit = () => {
    this.setState({showNicknameLoading: true});
    let changeNick = firebase.functions().httpsCallable('changeNickname');
    changeNick({nickname: document.getElementById('nickname').value})
      .then(() => {
        console.log("changed nickname");
        this.setState({showNicknameLoading: false});
      })
      .catch((error) => {
        console.log("changed nickname; error!");
        console.log(error);
        this.setState({showNicknameLoading: false});
      });
    this.handleDialogNicknameClose();
  };

  handleDialogNicknameClose = () => {
    this.setState({dialogNicknameOpen: false});
  };

  handleChangeNickname = () => {
    //open dialog to change nickname
    this.handleDialogNicknameOpen();
    this.handleMenuClose();
  };

  logout = () => {
    //go to logout screen
    this.handleMenuClose();
    let promise = firebase.auth().signOut();
    promise.then(() => {
      console.log('Logged out.');
      //this will reset state
      //TODO: Find better way to reset App-level state.
      window.location.reload();
    });
  };

  render() {
    const {classes} = this.props;
    const {auth, anchorEl} = this.state;
    const menuOpen = Boolean(anchorEl);

    return (
      <div className='flexGrow'>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" color="inherit" className={classes.grow}>
              TNQ
            </Typography>
            {this.props.tnq.loggedIn && (
              <Fragment>
                <Typography color="inherit" variant="h6">
                  {(this.props.tnq.user &&
                    this.props.tnq.user.nickname) ?
                    this.props.tnq.user.nickname : ''}
                </Typography>
                &nbsp;
                <IconButton
                  aria-owns={menuOpen ? 'menu-appbar' : undefined}
                  aria-haspopup="true"
                  onClick={this.handleMenu}
                  color="inherit"
                >
                  <AccountCircle/>
                </IconButton>
                <Menu
                  id="menu-appbar"
                  anchorEl={anchorEl}
                  anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  open={menuOpen}
                  onClose={this.handleMenuClose}
                >
                  <MenuItem onClick={this.handleChangeNickname}>Change nickname</MenuItem>
                  <MenuItem onClick={this.logout}>Logout</MenuItem>
                </Menu>
              </Fragment>
            )}
          </Toolbar>
        </AppBar>

        <Dialog
          open={this.state.dialogNicknameOpen}
          onClose={this.handleDialogNicknameClose}
          aria-labelledby="form-dialog-title">
          <DialogTitle id="form-dialog-title">Change nickname</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Change nickname
            </DialogContentText>
            <TextField
              autoFocus
              margin="dense"
              id="nickname"
              label="Nickname"
              fullWidth
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={this.handleDialogNicknameClose} color="primary">
              Cancel
            </Button>
            <Button
              onClick={this.handleDialogNicknameSubmit}
              color="primary"
              disabled={this.state.showNicknameLoading}
            >
              Submit
            </Button>
            <br/><br/>
            {(this.state.showNicknameLoading) ? <CircularProgress/> : ''}
          </DialogActions>
        </Dialog>
      </div>
    );
  }
}

export default withStyles(styles)(TopBar);
