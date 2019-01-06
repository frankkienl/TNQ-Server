import React, {Component} from 'react';
import {withStyles} from "@material-ui/core/styles";
import List from "@material-ui/core/List";
import StarIcon from "@material-ui/icons/Star";
import Person from '@material-ui/icons/Person';
import ListItem from "@material-ui/core/ListItem";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import Avatar from "@material-ui/core/Avatar";
import ListItemText from "@material-ui/core/ListItemText";
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
  cardHeader: {
    backgroundColor: theme.palette.grey[200],
  },
  cardActions: {
    [theme.breakpoints.up('sm')]: {
      paddingBottom: theme.spacing.unit * 2,
    },
  },
});


class PickQuestionPacks extends Component {

  constructor(props) {
    super(props);
  }

  render() {
    const {classes} = this.props;
    return (
      <div className='pickQuestionPacks'>
        <Typography>
          TODO: Questionpack picker
        </Typography>
      </div>
    );
  }
}

export default withStyles(styles)(PickQuestionPacks);
