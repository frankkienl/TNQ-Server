import React, {Component} from 'react';

class StateView extends Component {
  render() {
    console.log('StateView');
    console.log(this.props);


    //make some html
    let data = JSON.stringify(this.props.tnq, null, 2);

    return (
      <div className='stateView'>
        <hr/>
        <code>
        {data}
        </code>
      </div>
    );
  }

}

export default StateView;
