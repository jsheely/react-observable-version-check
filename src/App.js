import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import checker from './version-checker'
class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      serverDown: false
    }
    checker.start();

    checker.onNotifyServerDown.subscribe((serverDown) => {
      this.setState({ serverDown });
    })

    checker.onNotifyNewVersion.subscribe(() => {
      alert('New Version Available');
      // window.location.reload();
    })
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <p style={{
            color: this.state.serverDown ? 'red' : 'inherit'
          }}>
            Edit <code>src/App.js</code> and save to reload.
          </p>
          <a
            className="App-link"
            href="https://reactjs.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn React
          </a>
        </header>
      </div>
    );
  }
}

export default App;
