/** Browser-harness entry only. Never imported by the application or production entry. */
import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import AuthProvider, { useAuth } from '../context/AuthProvider'

declare global { interface Window { fr12Probe?: ReturnType<typeof useAuth> } }
function Probe() {
  const auth=useAuth()
  useEffect(()=>{window.fr12Probe=auth;return()=>{delete window.fr12Probe}},[auth])
  return <output data-testid="auth-probe">{auth.state.status}</output>
}
const host=document.getElementById('root')
if(host)createRoot(host).render(<StrictMode><AuthProvider><Probe /></AuthProvider></StrictMode>)
