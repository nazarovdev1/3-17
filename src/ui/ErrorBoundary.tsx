import { Component, type ErrorInfo, type ReactNode } from 'react'
import { logError } from './errorLog'

interface Props {
  children: ReactNode
  /** Falling back to mobile mode on 3D crash is decided by the parent. */
  onError?: (error: Error) => void
  label: string
}

interface State {
  hasError: boolean
}

/**
 * Error boundary (spec 4.4). The root boundary shows a calm in-game message;
 * a boundary around the 3D canvas lets the shell fall back to mobile mode.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logError(`[${this.props.label}] ${error.message}`)
    this.props.onError?.(error)
    console.error(`[${this.props.label}]`, error, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.label === 'root' ? (
        <div className="error-fallback">
          <p>Bir narsa buzildi.</p>
          <button onClick={() => window.location.reload()}>Qaytadan boshlash</button>
        </div>
      ) : null
    }
    return this.props.children
  }
}
