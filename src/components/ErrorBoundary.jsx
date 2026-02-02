import { Component } from 'react';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("ErrorBoundary caught an error", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div className="p-8 bg-red-50 text-red-900 rounded-lg border border-red-200 m-4">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        ⚠️ Algo deu errado no componente
                    </h2>
                    <p className="mb-4">Ocorreu um erro ao renderizar esta parte da aplicação.</p>
                    <details className="whitespace-pre-wrap font-mono text-xs bg-red-100 p-4 rounded overflow-auto max-h-96">
                        <summary className="cursor-pointer font-bold mb-2">Ver detalhes do erro</summary>
                        {this.state.error && this.state.error.toString()}
                        <br />
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </details>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                    >
                        Recarregar Página
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
