import React, {Component, Fragment} from 'react';
import {withStyles} from "@material-ui/core/styles";
import RoomPlayers from "./RoomPlayers";
import Typography from "@material-ui/core/es/Typography/Typography";
import PickQuestionPacks from "./PickQuestionPacks";
import Button from "@material-ui/core/es/Button/Button";

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


class Room extends Component {

  constructor(props) {
    super(props);
    this.state = {buttonsDisabled: false};
  }


  render() {
    const {classes} = this.props;
    let tnq = this.props.tnq;
    let isVip = ((tnq && tnq.room && tnq.user) && tnq.room.vip === tnq.user.uid);
    let canStart = (tnq && tnq.room && tnq.room.players && (tnq.room.players.length >= 3));
    return (
      <div className='room'>
        <Typography variant="h6">Roomcode: {tnq.user.currentRoom}</Typography>
        <br/>
        {(isVip) ?
          <Fragment>
            <Button
              color="primary"
              variant="contained"
              disabled={!canStart}
            >Start game</Button>
            {!canStart && <Fragment><i>You need at least 3 players.</i><br/></Fragment>}
          </Fragment> : ''
        }
        <br/>
        <PickQuestionPacks tnq={this.props.tnq}/>
        <br/>
        <RoomPlayers tnq={this.props.tnq}/>
      </div>
    );
  }
}

export default withStyles(styles)(Room);
