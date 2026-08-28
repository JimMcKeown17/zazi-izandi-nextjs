"use client";

import { Component, startTransition, type ReactNode, useState } from "react";
import { unstable_rethrow, useRouter } from "next/navigation";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  sectionName: string;
  resetKey: string;
}

interface BoundaryProps extends Props {
  onRetry: () => void;
}

interface State {
  failed: boolean;
}

class SectionErrorBoundaryImpl extends Component<BoundaryProps, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(error: unknown): State {
    // This Next API is load-bearing: revisit it during framework upgrades so
    // redirects and not-found control flow never become section error cards.
    unstable_rethrow(error);
    return { failed: true };
  }

  componentDidCatch() {
    // Next.js records the original render error. This boundary owns only the
    // section-local user experience and never exposes technical detail.
  }

  componentDidUpdate(previous: Props) {
    if (previous.resetKey !== this.props.resetKey && this.state.failed) {
      this.setState({ failed: false });
    }
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div
        className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900"
        role="alert"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
          <div>
            <h2 className="font-semibold">{this.props.sectionName} could not be displayed</h2>
            <p className="mt-1">The other teaching lens remains available. Try this section again.</p>
            <button
              type="button"
              onClick={this.props.onRetry}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-white px-3 py-1.5 font-semibold text-amber-900 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export function SectionErrorBoundary(props: Props) {
  const router = useRouter();
  const [retryAttempt, setRetryAttempt] = useState(0);

  const retry = () => {
    startTransition(() => {
      router.refresh();
      setRetryAttempt((value) => value + 1);
    });
  };

  return (
    <SectionErrorBoundaryImpl
      key={retryAttempt}
      {...props}
      onRetry={retry}
    />
  );
}
