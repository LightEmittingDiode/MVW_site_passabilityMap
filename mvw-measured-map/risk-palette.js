'use strict';
// Continuous, high-chroma risk scale shared by measured and demo maps.
const RiskPalette={
 color(score){
  if(score===null||score===undefined||!Number.isFinite(score))return '#98a5b6';
  const value=Math.max(0,Math.min(100,score));
  const hue=190-1.9*value;
  const light=value<=55?38+value*0.22:50.1-(value-55)*0.15;
  return `hsl(${hue.toFixed(1)} 92% ${light.toFixed(1)}%)`;
 },
 text(score){
  if(score===null||score===undefined||!Number.isFinite(score))return '#000000';
  const value=Math.max(0,Math.min(100,score)),hue=(190-1.9*value)/360,s=.92,l=(value<=55?38+value*.22:50.1-(value-55)*.15)/100;
  const hueValue=(p,q,t)=>{if(t<0)t++;if(t>1)t--;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p;};
  const q=l<.5?l*(1+s):l+s-l*s,p=2*l-q;
  const channels=[hueValue(p,q,hue+1/3),hueValue(p,q,hue),hueValue(p,q,hue-1/3)];
  const luminance=channels.map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4).reduce((a,c,i)=>a+c*[.2126,.7152,.0722][i],0);
  return luminance>.179?'#000000':'#ffffff';
 }
};
if(typeof window!=='undefined')window.RiskPalette=RiskPalette;
