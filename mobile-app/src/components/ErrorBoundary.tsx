import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-zinc-900 rounded-xl border border-red-500/20 text-center m-4 space-y-3">
          <AlertTriangle size={32} className="text-red-500 mx-auto" />
          <h2 className="text-white font-bold text-lg">Something went wrong</h2>
          <p className="text-zinc-400 text-sm">{this.state.error?.message || 'An unexpected error occurred while loading this section.'}</p>
          <button 
            className="px-4 py-2 bg-white text-black font-bold text-sm rounded-lg mt-2"
            onClick={() => this.setState({ hasError: false })}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
