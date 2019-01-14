import React, {Component} from 'react';
import {withStyles} from "@material-ui/core/styles";
import LinearProgress from "@material-ui/core/es/LinearProgress/LinearProgress";

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


class Countdown extends Component {

  constructor(props) {
    super(props);
    this.state = {progress: 0};
  }

  componentDidMount() {
    this.timer = setInterval(this.calcProgress, 1000);
  }

  componentWillUnmount() {
    clearInterval(this.timer);
  }

  calcProgress = () => {
    let start = this.props.start;
    let end = this.props.end;

    //Map value to correct rate
    let rawProgress = Countdown.arduino_map(new Date().valueOf() / 1000, start, end, 0, 100);
    //Limit between 0 and 100
    let progress = Math.min(100, Math.max(0, rawProgress));
    console.log("calcProgress", start, end, rawProgress, progress);
    this.setState({progress: progress});
  };

  static arduino_map(x, in_min, in_max, out_min, out_max) {
    //https://www.arduino.cc/reference/en/language/functions/math/map/
    return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
  }

  sillyRemarks(timeLeft) {
    if (timeLeft <= 0) {
      return 'Time is up!';
    }
    if (timeLeft < 10) {
      return 'Less than 10 seconds left! Hurry up!';
    }
    if (timeLeft < 30) {
      return 'Clock is ticking...';
    }
    if (timeLeft < 60) {
      return 'Half way there...';
    }
    if (timeLeft < 90) {
      return 'Take your time, but not to much time';
    }
    if (timeLeft < 120) {
      return 'Come up with something great! I believe in you!';
    }

    return '';
  }

  render() {
    const {classes} = this.props;
    let secondsLeft = Math.max(0, Math.floor(this.props.end - new Date() / 1000));
    return (
      <div className='countDown'>
        Countdown: {secondsLeft}
        <br/>
        {this.sillyRemarks(secondsLeft)}
        <br/>
        <LinearProgress variant="determinate" value={this.state.progress}/>
      </div>
    );
  }
}

export default withStyles(styles)(Countdown);
