import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Incidents from './pages/Incidents'
import Cluster from './pages/Cluster'
import AIInsights from './pages/AIInsights'

function App() {
  return (
    <Router>
      <div className="flex bg-slate-950 min-h-screen text-white">
        <Sidebar />
        <div className="flex-1">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/incidents" element={<Incidents />} />
            <Route path="/cluster" element={<Cluster />} />
            <Route path="/ai-insights" element={<AIInsights />} />
          </Routes>
        </div>
      </div>
    </Router>
  )

}

export default App