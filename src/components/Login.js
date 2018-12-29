import React, {Component} from 'react';
import Button from "@material-ui/core/es/Button/Button";
import CardContent from "@material-ui/core/es/CardContent/CardContent";
import Card from "@material-ui/core/es/Card/Card";
import withStyles from "@material-ui/core/styles/withStyles";
import Typography from "@material-ui/core/es/Typography/Typography";
import * as firebaseui from "firebaseui";
import * as firebase from "firebase";
import CircularProgress from "@material-ui/core/es/CircularProgress/CircularProgress";


const styles = {
  card: {
    minWidth: 275,
  },
  bullet: {
    display: 'inline-block',
    margin: '0 2px',
    transform: 'scale(0.8)',
  },
  title: {
    fontSize: 14,
  },
  pos: {
    margin: 12,
  },
};

class Login extends Component {

  componentDidMount() {
    let ui = new firebaseui.auth.AuthUI(firebase.auth());
    ui.start('#firebaseui-auth-container', {
      callbacks: {
        signInSuccessWithAuthResult: function (authResult, redirectUrl) {
          // User successfully signed in.
          // Return type determines whether we continue the redirect automatically
          // or whether we leave that to developer to handle.
          return false;
        }
      },
      signInFlow: 'popup',
      signInSuccessUrl: '//frankkienl-tnq.firebaseapp.com/changeNick.html',
      signInOptions: [
        {
          provider: firebase.auth.EmailAuthProvider.PROVIDER_ID,
          requireDisplayName: false
        },
        {
          provider: firebase.auth.GoogleAuthProvider.PROVIDER_ID,
          scopes: ['profile', 'email'],
          prompt: 'select_account'
        }
      ],
      tosUrl: '//frankkienl-tnq.firebaseapp.com/tos.html'
    });

  }


  render() {
    return (
      <div className='login'>
        <Card>
          <CardContent>
            <Typography component='h1' variant='h5'>
              Log in
            </Typography>
            <div className='loader'>
              {(!this.state.firebase.loaded) ? <CircularProgress />: ''}
            </div>
            <Button variant='contained' color='primary'>
              Login anonymously
            </Button>
            <div id="firebaseui-auth-container" />
          </CardContent>
        </Card>
      </div>
    );
  }
}

export default withStyles(styles)(Login);
