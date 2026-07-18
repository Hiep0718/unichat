import { Component, ErrorInfo, ReactNode } from 'react';

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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'var(--font-primary)' }}>
          <h2 style={{ color: 'var(--color-danger)' }}>Đã xảy ra lỗi không mong muốn</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
            Vui lòng tải lại trang hoặc liên hệ hỗ trợ.
          </p>
          <button 
            style={{ padding: '8px 16px', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            onClick={() => window.location.reload()}
          >
            Tải lại
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
