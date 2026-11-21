import { Component, ErrorInfo, ReactNode } from 'react';

import { ErrorState } from './error-state';

interface Props {
  readonly children: ReactNode;
}

interface State {
  readonly hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Structured log — no sensitive data (ADR-016)
    // eslint-disable-next-line no-console
    console.error('Uncaught exception in React tree:', {
      message: error.message,
      componentStack: info.componentStack,
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <ErrorState
          icon="error"
          tone="danger"
          title="Đã xảy ra lỗi không mong muốn"
          description="Vui lòng tải lại trang hoặc liên hệ hỗ trợ."
          action={
            <button type="button" className="error-state__action" onClick={() => window.location.reload()}>
              Tải lại
            </button>
          }
        />
      );
    }
    return this.props.children;
  }
}
