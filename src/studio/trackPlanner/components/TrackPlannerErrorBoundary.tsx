import React from "react";

type Props = { children: React.ReactNode; onBack: () => void };

type State = { error: Error | null };

export class TrackPlannerErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="screen tp-home">
          <div className="panel tp-panel">
            <h2>Track Planner error</h2>
            <p className="tp-formError">{this.state.error.message}</p>
            <button type="button" className="btn primary" onClick={this.props.onBack}>
              Back
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
