import React, {Component} from 'react';
import '../App.css';
import TopBar from "./TopBar";
import Main from "./Main";
import * as firebase from "firebase";

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      firebase: {
        loaded: false
      },
      tnq:
        {
          loggedIn: false
        }
    };
  }

  render() {
    return (
      <div className="App">
        <TopBar/>
        <Main tnq={this.state.tnq}/>
      </div>
    );
  }

  componentDidMount() {
    //init Firebase
    this.initFirebase();
  }

  initFirebase() {
    try {
      let firebaseApp = firebase.app();
      const firestore = firebase.firestore();
      const settings = {timestampsInSnapshots: true};
      firestore.settings(settings);
      console.log("Firebase loaded");
      //Let state know Firebase is loaded
      this.setState((state) => {
        let oldState = state;
        oldState.firebaseLoaded = true;
        return oldState;
      });
      //Add auth listener
      firebase.auth().onAuthStateChanged(user => {
        this.setState((state) => {
          let oldState = state;
          if (user) {
            oldState.firebase.loaded = true;
            oldState.firebase.user = user;
            oldState.tnq.loggedIn = true;
          } else {
            oldState.tnq.loggedIn = false;
          }
          return oldState;
        });
      });
    } catch (e) {
      console.error(e);
    }
  }

}

export default App;
