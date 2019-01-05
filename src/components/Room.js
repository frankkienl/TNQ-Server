import React, {Component} from 'react';
import {withStyles} from "@material-ui/core/styles";

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
    return (
      <div className='room'>
        Room
      </div>
    );
  }
}

export default withStyles(styles)(Room);
