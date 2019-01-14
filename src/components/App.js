import React, {Component} from 'react';
import '../App.css';
import TopBar from "./TopBar";
import Main from "./Main";
import * as firebase from "firebase";
import update from 'immutability-helper';
import StateView from "./StateView";

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
        <TopBar tnq={this.state.tnq} firebase={this.state.firebase}/>
        <Main tnq={this.state.tnq} firebase={this.state.firebase}/>
        <StateView tnq={this.state.tnq} firebase={this.state.firebase}/>
      </div>
    );
  }

  componentDidMount() {
    //init Firebase
    this.initFirebase();
  }

  initFirebase() {
    try {
      // Initialize Firebase
      let config = {
        apiKey: "AIzaSyCez5qhhOn2nHLnps9pup8Fpxn0x2NIK88",
        authDomain: "frankkienl-tnq.firebaseapp.com",
        databaseURL: "https://frankkienl-tnq.firebaseio.com",
        projectId: "frankkienl-tnq",
        storageBucket: "frankkienl-tnq.appspot.com",
        messagingSenderId: "178085488605"
      };
      firebase.initializeApp(config);
      //
      //let firebaseApp = firebase.app();
      const firestore = firebase.firestore();
      const settings = {timestampsInSnapshots: true};
      firestore.settings(settings);
      console.log("Firebase loaded");
      //Let state know Firebase is loaded
      let newState = update(this.state, {
        firebase: {loaded: {$set: true}}
      });
      this.setState(newState);
      //Add auth listener
      firebase.auth().onAuthStateChanged(user => {
        console.log(`Firebase auth:`);
        console.log(user);
        if (user) {
          //if logged in, start listener for tnq-user object
          firestore.doc(`users/${user.uid}`).onSnapshot(userDoc => {
            let newState = update(this.state, {
              tnq: {user: {$set: userDoc.data()}}
            });
            this.setState(newState);
            //if user is now in a room, start listener for tnq-room object
            if (userDoc && userDoc.data() && userDoc.data().roomCode) {
              //Room
              let userObj = userDoc.data();
              firestore.doc(`rooms/${userObj.roomCode}`).onSnapshot(roomDoc => {
                let roomObj = roomDoc.data();
                let newState = update(this.state, {
                  tnq: {room: {$set: roomObj}}
                });
                this.setState(newState);
                //Round
                if (roomObj.status.startsWith('round')) {
                  firestore.doc(`rooms/${userObj.roomCode}/rounds/${roomObj.status}/`).onSnapshot(roundDoc => {
                    let roundObj = roundDoc.data();
                    let newState = update(this.state, {
                      tnq: {room: {round: {$set: roundObj}}}
                    });
                    this.setState(newState);
                    //Questions
                    firestore.collection(`rooms/${userObj.roomCode}/rounds/${roomObj.status}/questions`).onSnapshot(questionsCol => {
                      let questions = {};
                      questionsCol.docs.forEach((questionDoc) => {
                        questions[questionDoc.id] = questionDoc.data();
                      });
                      let newState = update(this.state, {
                        tnq: {room: {round: {questions: {$set: questions}}}}
                      });
                      this.setState(newState);
                    });
                    //Answers
                    firestore.collection(`rooms/${userObj.roomCode}/rounds/${roomObj.status}/answers`).onSnapshot(answersCol => {
                      let answers = {};
                      answersCol.docs.forEach((answerDoc) => {
                        answers[answerDoc.id] = answerDoc.data();
                      });
                      let newState = update(this.state, {
                        tnq: {room: {round: {answers: {$set: answers}}}}
                      });
                      this.setState(newState);
                    });
                    //Vote results
                    firestore.collection(`rooms/${userObj.roomCode}/rounds/${roomObj.status}/voteResults`).onSnapshot(voteResultsCol => {
                      let voteResults = {};
                      voteResultsCol.docs.forEach((voteResultDoc) => {
                        voteResults[voteResultDoc.id] = voteResultDoc.data();
                      });
                      let newState = update(this.state, {
                        tnq: {room: {round: {voteResults: {$set: voteResults}}}}
                      });
                      this.setState(newState);
                    });
                  });
                }
              });
              //Players in room
              firestore.collection(`rooms/${userObj.roomCode}/players`).onSnapshot(playersCol => {
                let playersArray = playersCol.docs.map((playerDoc) => {
                  return playerDoc.data();
                });
                let newState = update(this.state, {
                  tnq: {room: {players: {$set: playersArray}}}
                });
                this.setState(newState);
              });
            }
          });
        }
        let newState = update(this.state, {
          firebase: {
            loaded: {$set: !!(user)},
            user: {$set: user}
          },
          tnq: {loggedIn: {$set: !!(user)}}
        });
        this.setState(newState);
      });
    } catch (e) {
      console.error(e);
    }
  }

}

export default App;
