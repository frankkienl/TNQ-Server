import React, { Component } from 'react';
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";

class TopBar extends Component {
  render() {
    return (
      <div className='flexGrow'>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" color="inherit">
              TNQ
            </Typography>
          </Toolbar>
        </AppBar>
      </div>
    );
  }
}

export default TopBar;
