import { useDataLoader } from '@/hooks/useDataLoader'

function App() {
  const { data, isLoading, error, retry } = useDataLoader()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <p className="text-lg text-text-muted">Loading data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg">
        <p className="text-lg text-danger">Error: {error}</p>
        <button
          onClick={retry}
          className="rounded-sm bg-primary px-4 py-2 text-white hover:bg-primary-hover"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="min-h-screen bg-bg p-8">
      <h1 className="mb-6 text-2xl font-bold text-text">
        グリルプランナー — Phase 1
      </h1>
      <div className="grid max-w-md gap-4">
        <div className="rounded-sm border border-border bg-surface p-4">
          <p className="text-sm text-text-muted">Weapons</p>
          <p className="text-3xl font-bold text-text">{data.weapons.length}</p>
        </div>
        <div className="rounded-sm border border-border bg-surface p-4">
          <p className="text-sm text-text-muted">Specials</p>
          <p className="text-3xl font-bold text-text">{data.specials.length}</p>
        </div>
        <div className="rounded-sm border border-border bg-surface p-4">
          <p className="text-sm text-text-muted">Hazard Configs</p>
          <p className="text-3xl font-bold text-text">{data.hazardConfigData.length}</p>
        </div>
      </div>
    </div>
  )
}

export default App
