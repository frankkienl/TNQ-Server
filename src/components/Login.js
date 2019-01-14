import React, {Component, Fragment} from 'react';
import Button from "@material-ui/core/es/Button/Button";
import CardContent from "@material-ui/core/es/CardContent/CardContent";
import Card from "@material-ui/core/es/Card/Card";
import withStyles from "@material-ui/core/styles/withStyles";
import Typography from "@material-ui/core/es/Typography/Typography";
import * as firebaseui from "firebaseui";
import * as firebase from "firebase";
import CircularProgress from "@material-ui/core/es/CircularProgress/CircularProgress";


const styles = {
  cardContent: {
    alignItems: 'center',
  }
};

class Login extends Component {

  constructor(props) {
    super(props);
    this.state = {showLoading: false};
  }

  ui;
  uiLoaded = false;

  render() {
    if (this.props.firebase.loaded) {
      if (!this.uiLoaded) {
        this.initAuthUI();
      }
      this.startAuthUI();
    }

    let output = (
      <div className='login'>
        <Card>
          <CardContent>
            <Typography component='h1' variant='h5'>
              Log in
            </Typography>
            <div style={{textAlign: 'center'}}>
              <Button variant='contained' color='primary' onClick={this.loginAnon.bind(this)}
                      disabled={this.state.showLoading}>
                Login anonymously
              </Button>
              {(this.state.showLoading) ? (
                <Fragment>
                  <br/><br/>
                  <CircularProgress/>
                </Fragment>) : ''}
            </div>
            <div id="firebaseui-auth-container"/>
          </CardContent>
        </Card>
      </div>
    );

    return output;
  }

  initAuthUI() {
    this.ui = new firebaseui.auth.AuthUI(firebase.auth());
    this.uiLoaded = true;
  }

  startAuthUI() {
    this.ui.start('#firebaseui-auth-container', {
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

  loginAnon() {
    console.log('loginAnon');
    this.setState({showLoading: true});
    firebase.auth().signInAnonymously().then(() => {
      console.log('loginAnon done');
      this.setState({showLoading: false});
    }).catch(function (error) {
      console.log(error);
      this.setState({showLoading: false});
    });
  }

}


export default withStyles(styles)(Login);
