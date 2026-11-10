'use strict';
const routePanel=document.querySelector('.left');
function refreshMapLayout(){if(map){const center=map.getCenter();map.relayout();map.setCenter(center);}}
$('panelToggle').onclick=()=>{const expanded=routePanel.classList.toggle('expanded');$('panelToggle').setAttribute('aria-expanded',String(expanded));$('panelToggleLabel').textContent=expanded?'접기':'펼치기';requestAnimationFrame(refreshMapLayout);};
window.addEventListener('resize',()=>requestAnimationFrame(refreshMapLayout));

window.showSegmentPanel=()=>{const panel=$('segmentPanel');panel.open=true;if(window.matchMedia('(max-width:700px)').matches&&!routePanel.classList.contains('expanded'))$('panelToggle').click();requestAnimationFrame(()=>panel.scrollIntoView({block:'nearest'}));};
