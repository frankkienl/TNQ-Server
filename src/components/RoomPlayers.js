import React, {Component} from 'react';
import {withStyles} from "@material-ui/core/styles";
import List from "@material-ui/core/List";
import StarIcon from "@material-ui/icons/Star";
import Person from '@material-ui/icons/Person';
import ListItem from "@material-ui/core/ListItem";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import Avatar from "@material-ui/core/Avatar";
import ListItemText from "@material-ui/core/ListItemText";

const styles = theme => ({});


class RoomPlayers extends Component {

  constructor(props) {
    super(props);
  }

  render() {
    const {classes} = this.props;
    let players = null;
    if (this.props.tnq.room && this.props.tnq.room.players) {
      players = this.props.tnq.room.players;
      //sort (vip on top, rest alphabetically)
      players.sort((a, b) => {
        if (a.vip) {
          return -1;
        }
        if (b.vip) {
          return 1;
        }
        if (a.nickname < b.nickname) {
          return -1;
        }
        if (a.nickname > b.nickname) {
          return 1;
        }
        return 0;
      });
    }
    return (
      <div className='roomPlayers'>
        <List>
          {(players) ?
            players.map((player) => (
              <ListItem>
                <ListItemAvatar>
                  <Avatar>
                    {player.vip ? <StarIcon/> : <Person/>}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={player.nickname}
                />
              </ListItem>
            ))
            : ''}
        </List>
      </div>
    );
  }
}

export default withStyles(styles)(RoomPlayers);
