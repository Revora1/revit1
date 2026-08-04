import React from 'react';

export class ErrorBoundary extends React.Component<{children: React.ReactNode}, {error: string | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error: error.toString() };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-4 bg-red-500/20 text-red-500 rounded-xl m-4 border border-red-500">
          <h2 className="font-bold">Something went wrong</h2>
          <pre className="text-xs whitespace-pre-wrap mt-2">{this.state.error}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
