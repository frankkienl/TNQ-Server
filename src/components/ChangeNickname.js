import React, {Component} from 'react';
import * as firebase from "firebase";
import CircularProgress from "@material-ui/core/es/CircularProgress/CircularProgress";

class ChangeNickname extends Component {

  constructor(props) {
    super(props);
    this.state = {showLoading: false}
  }

  render() {
    return (
      <div className='nickname'>
        Pick a nickname
        <form onSubmit={this.handleChangeNickname.bind(this)}>
          <input type='text' ref='nickname' value={this.props.tnq.user.nickname}/>
          <input type='submit' value='ok' disabled={this.state.showLoading}/>
          <br/><br/>
          {(this.state.showLoading) ? <CircularProgress/> : ''}
        </form>
      </div>
    );
  }

  handleChangeNickname(e) {
    e.preventDefault();
    this.setState({showLoading: true});
    let changeNick = firebase.functions().httpsCallable('changeNickname');
    changeNick({nickname: this.refs.nickname.value})
      .then(function (result) {
        console.log("changed nickname");
        this.setState({showLoading: false});
      }).catch((error) => {
      console.log("changed nickname; error!");
      console.log(error);
      this.setState({showLoading: false});
    });
  }
}

export default ChangeNickname;
