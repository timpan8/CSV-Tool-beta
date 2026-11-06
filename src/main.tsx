import { render } from 'preact'
import { effect } from '@preact/signals'
import './styles/tokens.css'
import './styles/base.css'
import './styles/grid.css'
import './styles/dialog.css'
import './styles/verkstad.css'
import './styles/kombinera.css'
import './styles/slaihop.css'
import './styles/jamfor.css'
import './styles/pivot.css'
import { App } from './ui/App.jsx'
import { applyAppearance } from './state/store.js'
import { tillampaSprak } from './ui/sprak.js'
import { KANAL } from './version.js'

/*
 * Utseendet följer signalerna synkront: ett byte av tema eller täthet
 * skriver attributet på roten i samma ögonblick, innan nästa ritning. Så
 * kan rutnätet mäta om sin radhöjd i sin layout-effekt och lita på att
 * variabeln redan bytt värde.
 */
effect(applyAppearance)
// `lang` på dokumentet från start, så att skärmläsaren och webbläsarens egen
// stavningskontroll vet vilket språk sidan är på innan något ritats.
tillampaSprak()
// Betan heter beta också i webbläsarens flik, så att två öppna utgåvor går att skilja åt.
if (KANAL === 'beta') document.title = 'CSV-verkstan beta'

const root = document.getElementById('app')
if (!root) throw new Error('Hittade inte #app i dokumentet.')
render(<App />, root)
