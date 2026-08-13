import React from "react";

type Props = { children: React.ReactNode };

type State = { error: Error | null };

/**
 * Local Simulator containment — analysis/render failures stay in the Simulator panel.
 * Must NEVER navigate to Start or unmount Track Planner.
 */
export class SimulatorErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("SimulatorErrorBoundary", error);
  }

  private retry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div className="tp-simulatorView">
          <div className="panel tp-panel">
            <h3>Simulator error</h3>
            <p className="tp-simWarn">{this.state.error.message}</p>
            <p className="tp-hint">
              Analysis failed locally. The Track Planner is still open — this is not an unsolvable
              track verdict.
            </p>
            <button type="button" className="btn primary" onClick={this.retry}>
              Reset Simulator panel
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
