import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import AndroidBackButton from './AndroidBackButton.jsx'
import Home from './Home.jsx'
import Editor from './Editor.jsx'
import NotebookHomeView from './NotebookHomeView.jsx'
import { getHomeSettings } from './homeSettings.js'
import { applyTheme } from './theme.js'

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}

function AppShell() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  useEffect(() => {
    let cancelled = false

    async function loadTheme() {
      const settings = await getHomeSettings()
      if (!cancelled) applyTheme(settings.theme)
    }

    void loadTheme()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <AndroidBackButton />
      <div className="app-home" hidden={!isHome} inert={!isHome}>
        <Home active={isHome} />
      </div>
      <Routes>
        <Route path="/notebook/:notebookId/page/:pageId" element={<Editor />} />
        <Route path="/notebook/:id" element={<NotebookHomeView />} />
        <Route path="/note/:noteId" element={<Editor />} />
      </Routes>
    </>
  )
}
