import * as Rx from 'rxjs';

// Because I hate looking at 1000 vs 10000 to make sure it's the right number of seconds.
let second = 1000;

export default class VersionChecker {
    /**
     * Private Properties
     */
    static _counter = 0; // Debug counter to know where we are and if things are processing in order and at the right speed.
    static _subscription; // Retain access to subscription to stop and restart.
    static _isInErrorMode = false; // ErrorMode will speed up interval checks.
    static _pipeline; // Retain pipeline to restart (or re-subscribe) without reinitializing pipeline.
    static _visibilityObs = Rx.Observable.fromEvent(window, 'visibilitychange') // Register Window Event Handler. Used for filtering pipeline
        .map(e => !e.target.hidden) // We only care about the hidden value.
        .startWith(true) // Set initial value since event won't trigger on page load
        .shareReplay(0) // Share Replay will repeat last value to any new subscriber. Adding the zero puts a ref count so it doesn't repeat the startWith value for each new subscriber

    /**
     * Public Properties
     */
    static onNotifyServerDown = new Rx.Subject(); // Use onNotifyServerDown outside of class to subscribe to know when version missmatch happens. 
    static onNotifyNewVersion = new Rx.Subject(); // Use onNotifyNewVersion outside of class to subscribe to know when version missmatch happens. 

    /**
     * Initialization Function. Creates Pipeline.
     */
    static init() { // This allows for redefining the pipeline values. Subscriptions will need to be unbsubscribed on the old pipeline.

        this._pipeline = Rx.Observable
            .timer(0, this._isInErrorMode ? second : 10 * second) // Sets the lowest interval to retry. Value can only be defined during initialization. Can't be updated with dynamic variables.
            .takeUntil(this.onNotifyNewVersion) // End pipeline if new version is out.
            .switchMap(() => this._visibilityObs) // Merge visibility with timer. SwitchMap will drop any timer interations while visibility is false.
            .filter(visibile => visibile) // Only process if page is visible
            .exhaustMap( // Ensures that only 1 zip function runs at a time. Intervals will wait till zip function completes.
                () => Rx.Observable.zip( // Combines multiple async operations ensuring they both complete together before moving on.
                    this.getVersion(),
                    this.getStatus(),
                    (version, serverStatus) => { // Merge values from async however you would like.
                        this._counter++; // Just a DEBUG counter
                        return {
                            version,
                            serverStatus
                        }
                    })
                .timeout(30 * second) // If it takes longer than 30 seconds. Kill process and restart.
                .catch(err => {
                    console.log('Error caught', err); // Log to AppInsights. This will be either a timeout error or ajax error from zip.
                    return Rx.Observable.throw(err); // Rethrow error if you want to handle it in subscriber
                    // return Rx.Observable.empty(); // Return empty observable if you want to swallow error here.

                }));

        return this;
    }

    /**
     * Begin Processing
     */
    static start() {
        if (this._subscription != null) {
            this.stop();
            console.log('Restarting...');
        } else {
            this.init();
            console.log('Starting...');
        }

        this._subscription = this._pipeline.subscribe(result => {
            // You need a try/catch in here. If any operation throws inside a subscriber the pipeline will terminate.
            try {
                console.log('Got result', result, this._counter);
                // TODO: Handle code required to determine if we need to display an error or change into ErrorMode.


                if (result.version !== 1) {
                    this.onNotifyNewVersion.next(true);
                    return;
                }

                this.onNotifyServerDown.next(!result.serverStatus);
                if (!result.serverStatus) {
                    if (!this._isInErrorMode) {
                        this.enableErrorMode();
                    }
                } else {
                    if (this._isInErrorMode) {
                        this.disableErrorMode();
                    }
                }

                if (this._counter % 7 === 0) { // DEBUG Just forcing a crash.
                    throw new Error('Wut now?');
                }
            } catch (err) {
                console.log('Handled inner error', err);
            }

        }, err => {
            console.log('An error occured', err); // Log Error with App Insights
            this.init().start(); // Restart the pipeline if an error occures that isn't caught.
        }, () => { // Should never get here. But if for some reason the pipeline completes. Restart it.
            console.log('Unexpected completion. Starting again...');
            this.init().start();
        });

        return this;
    }

    /**
     * Stop Processing Pipeline. Unsubscribes from observables.
     */
    static stop() {
        console.log('Stopping...');
        this._subscription.unsubscribe(); // Unsubscription from Observable will dispose the entire pipeline gracefully. Any ajax operations in flight will be aborted.
        return this;
    }

    /**
     * Enable error mode. Will expedite the checks.
     */
    static enableErrorMode() {
        this._isInErrorMode = true;
        this.init().start();
        return this;
    }

    /**
     * Disable error mode. This will return the pipeline back to normal check cadence. 
     */
    static disableErrorMode() {
        this._isInErrorMode = false;
        this.init().start();
        return this;
    }

    static handleWindowVisibilityChange(e) {
        if (e.target.hidden) {
            this.stop();
        } else {
            this.start();
        }
    }

    /**
     * Throw away code. Just for testing
     */
    static getVersion() {
        return Rx.Observable.ajax.getJSON('/manifest.json').delay(3 * second).map(x => x.version);
    }

    static getStatus() {
        return Rx.Observable.ajax.getJSON('/manifest.json').delay(3 * second).map(x => x.serverStatus);
    }
}