import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

/**
 * Overrides Android's hardware back button:
 * editor → notebook home → app home → exit.
 */
export default function AndroidBackButton() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
      return undefined
    }

    const listener = App.addListener('backButton', () => {
      const pageMatch = pathname.match(/^\/notebook\/([^/]+)\/page\/[^/]+\/?$/)
      if (pageMatch) {
        navigate(`/notebook/${pageMatch[1]}`)
        return
      }

      if (/^\/notebook\/[^/]+\/?$/.test(pathname) || /^\/note(\/|$)/.test(pathname)) {
        navigate('/')
        return
      }

      App.exitApp()
    })

    return () => {
      listener.then((handle) => handle.remove())
    }
  }, [navigate, pathname])

  return null
}
