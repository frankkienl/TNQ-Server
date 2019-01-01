import React, {Component} from 'react';
import Typography from "@material-ui/core/es/Typography/Typography";
import {withStyles} from "@material-ui/core/styles";
import Grid from "@material-ui/core/Grid";
import Card from "@material-ui/core/Card";
import CardHeader from "@material-ui/core/CardHeader";
import CardContent from "@material-ui/core/CardContent";
import CardActions from "@material-ui/core/CardActions";
import Button from "@material-ui/core/Button";

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
    description: ['You pick the question packs', 'You give the roomcode to your friends', 'You decide pace of the game'],
    buttonText: 'Create a room',
    buttonVariant: 'outlined',
  },
  {
    title: 'Join room',
    subheader: "You're probably looking for this one!",
    description: ['Get a roomcode from a friend', 'Answer questions', 'Vote on the best answers'],
    buttonText: 'Join a room',
    buttonVariant: 'contained',
  },
  {
    title: 'Spectate room',
    description: ['Get a roomcode from a friend', 'Just watch, no pressure', 'Great for viewing on a big screen'],
    buttonText: 'View a room',
    buttonVariant: 'outlined',
  },
];

class PickRoom extends Component {

  render() {
    const {classes} = this.props;
    console.log('PickRoom', this.props);
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
                    <Button fullWidth variant={tier.buttonVariant} color="primary">
                      {tier.buttonText}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </main>
      </div>
    );
  }
}

export default withStyles(styles)(PickRoom);
