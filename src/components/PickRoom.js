import React, {Component} from 'react';
import Typography from "@material-ui/core/es/Typography/Typography";
import {withStyles} from "@material-ui/core/styles";
import Grid from "@material-ui/core/Grid";
import Card from "@material-ui/core/Card";
import CardHeader from "@material-ui/core/CardHeader";
import CardContent from "@material-ui/core/CardContent";
import CardActions from "@material-ui/core/CardActions";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogContent from "@material-ui/core/DialogContent";
import TextField from "@material-ui/core/TextField";
import DialogTitle from "@material-ui/core/DialogTitle";
import CircularProgress from "@material-ui/core/CircularProgress";
import * as firebase from "firebase";
import {DialogActions} from "@material-ui/core";
import DialogContentText from "@material-ui/core/DialogContentText";

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
  cardHeader: {
    backgroundColor: theme.palette.grey[200],
  },
  cardActions: {
    [theme.breakpoints.up('sm')]: {
      paddingBottom: theme.spacing.unit * 2,
    },
  },
});

const choices = [
  {
    title: 'Create room',
    action: 'create_room',
    description: ['You pick the question packs', 'Send roomcode to friends', 'You decide pace of the game'],
    buttonText: 'Create a room',
    buttonVariant: 'outlined',
  },
  {
    title: 'Join room',
    action: 'join_room',
    subheader: "You're probably looking for this one!",
    description: ['Get a roomcode from a friend', 'Answer questions', 'Vote on the best answers'],
    buttonText: 'Join a room',
    buttonVariant: 'contained'
  },
  {
    title: 'Spectate room',
    action: 'spectate_room',
    description: ['Get a roomcode from a friend', 'Just watch, no pressure', 'Great for viewing on a big screen'],
    buttonText: 'View a room',
    buttonVariant: 'outlined',
  },
];

class PickRoom extends Component {

  constructor(props) {
    super(props);
    this.state = {dialogRoomcodeOpen: false, roomcodeUpper: '', buttonsDisabled: false};
  }

  handleDialogRoomcodeOpen() {
    this.setState({dialogRoomcodeOpen: true, showLoading: true});
  }

  handleDialogRoomcodeClose() {
    this.setState({dialogRoomcodeOpen: false, showLoading: false});
  }

  handleDialogRoomcodeTfChange() {
    let rawRoomcode = document.getElementById('roomcode').value;
    let roomcodeUpper = rawRoomcode.toString().substr(0, 5).toUpperCase();
    this.setState({roomcodeUpper: roomcodeUpper});
  }

  handleCreateRoom() {
    this.setState({showLoading: true});
    //Request new room
    console.log("creating room");
    let createRoom = firebase.functions().httpsCallable('createRoom');
    createRoom().then(function (result) {
      console.log("created roomCode: " + result.data.roomCode);
    });
  }


  handleDialogRoomcodeSubmit(e) {
    e.preventDefault();
    this.setState({showRoomcodeLoading: true, showLoading: true});
    let joinRoom = firebase.functions().httpsCallable('joinRoom');
    let roomCodeToJoin = document.getElementById('roomcode').value.toUpperCase();
    console.log("Trying to join: " + roomCodeToJoin);
    joinRoom({roomCode: roomCodeToJoin}).then((response) => {
      console.log('response', response);
      this.setState({showRoomcodeLoading: false, showLoading: false});
      debugger;
      if (response.data.status === 'roomDoesNotExist') {
        alert("Room does not exist");
      } else {
        this.handleDialogRoomcodeClose();
      }
    }).catch(() => {
      alert("Room does not exist");
      this.setState({showRoomcodeLoading: false, showLoading: false});
    });
  }

  handleClick(e, tier) {
    if (tier.action === 'create_room') {
      this.handleCreateRoom();
    }
    if (tier.action === 'join_room') {
      this.handleDialogRoomcodeOpen();
    }
  }

  render() {
    const {classes} = this.props;
    return (
      <div className='pickRoom'>
        <main className={classes.layout}>
          <Typography component="h1" variant="h5">
            Create, join or view room
          </Typography>

          <Grid container spacing={40} alignItems="flex-end">
            {choices.map(tier => (
              // Spectate card is full width at sm breakpoint
              <Grid item key={tier.title} xs={12} sm={tier.title === 'Spectate room' ? 12 : 6} md={4}>
                <Card>
                  <CardHeader
                    title={tier.title}
                    subheader={tier.subheader}
                    titleTypographyProps={{align: 'center'}}
                    subheaderTypographyProps={{align: 'center'}}
                    className={classes.cardHeader}
                  />
                  <CardContent>
                    {tier.description.map(line => (
                      <Typography variant="subtitle1" align="center" key={line}>
                        {line}
                      </Typography>
                    ))}
                  </CardContent>
                  <CardActions className={classes.cardActions}>
                    <Button
                      fullWidth
                      variant={tier.buttonVariant}
                      onClick={(e) => this.handleClick(e, tier)}
                      color="primary"
                      disabled={this.state.buttonsDiabled}
                    >
                      {tier.buttonText}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </main>

        <Dialog
          open={this.state.dialogRoomcodeOpen}
          onClose={(e) => this.handleDialogRoomcodeClose(e)}
         >
          <form onSubmit={() => this.handleDialogRoomcodeSubmit()}>
            <DialogContent>
              <Typography>Fill in roomcode, it should be 5 letters.</Typography>
              <TextField
                autoFocus
                margin="dense"
                id="roomcode"
                label="Roomcode"
                value={this.state.roomcodeUpper}
                fullWidth
                onChange={() => this.handleDialogRoomcodeTfChange()}
              />
            </DialogContent>
            <DialogActions>
              {(this.state.showRoomcodeLoading) ? <CircularProgress/> : ''}
              <Button onClick={() => this.handleDialogRoomcodeClose()} color="primary">
                Cancel
              </Button>
              <Button
                type="submit"
                onClick={(e) => this.handleDialogRoomcodeSubmit(e)}
                color="primary"
                disabled={this.state.showRoomcodeLoading}
              >
                Submit
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </div>
    );
  }
}

export default withStyles(styles)(PickRoom);
