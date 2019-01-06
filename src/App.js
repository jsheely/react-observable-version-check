import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import checker from './version-checker'
class App extends Component {
  constructor(props) {
    super(props);
    checker.start();
    setTimeout(() => {
      console.log('Time to run more often');
      checker.enableErrorMode();
    }, 10 * 1000)

    window.addEventListener(
      'visibilitychange',
      this.handleWindowVisibilityChange
    );

  }
  componentWillUnmount() {
    window.removeEventListener(
      'visibilitychange',
      this.handleWindowVisibilityChange
    );
  }
  handleWindowVisibilityChange(e) {
    // if (e.target.hidden) {
    //   checker.stop();
    // } else {
    //   checker.start();
    // }
  }
  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <p>
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
