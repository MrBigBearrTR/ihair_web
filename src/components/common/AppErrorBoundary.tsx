import { Component, type ErrorInfo, type ReactNode } from "react";

type AppErrorBoundaryState = {
  error: Error | null;
};

export class AppErrorBoundary extends Component<
  { children: ReactNode },
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Uygulama beklenmeyen bir hatayla karşılaştı.", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="bg-background text-foreground flex min-h-svh items-center justify-center p-4">
        <section
          className="bg-card w-full max-w-lg rounded-2xl border p-6 text-center shadow-lg"
          role="alert"
        >
          <h1 className="text-xl font-semibold">Bir şeyler ters gitti</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Sayfa görüntülenirken beklenmeyen bir hata oluştu. İşlemi yeniden
            deneyebilir veya ana ekrana dönebilirsiniz.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              className="border-input bg-background hover:bg-accent min-h-11 rounded-xl border px-4 text-sm font-medium"
              onClick={() => this.setState({ error: null })}
            >
              Yeniden dene
            </button>
            <button
              type="button"
              className="bg-primary text-primary-foreground hover:bg-primary/90 min-h-11 rounded-xl px-4 text-sm font-medium"
              onClick={() => window.location.assign("/dashboard")}
            >
              Ana ekrana dön
            </button>
          </div>
        </section>
      </main>
    );
  }
}
