// scripts/settings.js
import { saveState } from './save.js';

const btn  = document.getElementById('settings-btn');
const pane = document.getElementById('settings-panel');
btn.onclick = () => pane.classList.toggle('hidden');

document.getElementById('reset-btn').onclick = () => {
  localStorage.removeItem('idlePhysicsSave');
  location.reload();
};

setInterval(saveState, 10000);
window.addEventListener('beforeunload', saveState);