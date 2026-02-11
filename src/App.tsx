import { useDataLoader } from '@/hooks/useDataLoader'
import { ScenarioProvider } from '@/hooks/ScenarioContext'
import { ScenarioView } from './ScenarioView'

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
    <ScenarioProvider hazardConfigData={data.hazardConfigData}>
      <ScenarioView
        hazardConfigData={data.hazardConfigData}
        weapons={data.weapons}
        specials={data.specials}
      />
    </ScenarioProvider>
  )
}

export default App
