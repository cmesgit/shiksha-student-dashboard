import { Component, Suspense } from "react";
import { ErrorState, LoadingState } from "./StateViews";

// Keep the dashboard chrome visible while the requested page downloads.
// A failed chunk needs a recovery action, rather than a blank screen.
class PageErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <ErrorState
      message="This page couldn’t load. Reload to try again."
      onRetry={() => window.location.reload()}
    />;
    return this.props.children;
  }
}

export default function RouteContent({ children }) {
  return <PageErrorBoundary>
    <Suspense fallback={<LoadingState label="Loading page" />}>{children}</Suspense>
  </PageErrorBoundary>;
}
