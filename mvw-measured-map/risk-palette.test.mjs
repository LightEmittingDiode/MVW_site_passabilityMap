import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';

const context={window:{}};
vm.runInNewContext(fs.readFileSync('risk-palette.js','utf8'),context);
const palette=context.window.RiskPalette;
function luminance(color){
 const [,hue,saturation,lightness]=color.match(/hsl\(([\d.]+) ([\d.]+)% ([\d.]+)%\)/).map(Number);
 const h=hue/360,s=saturation/100,l=lightness/100,q=l<.5?l*(1+s):l+s-l*s,p=2*l-q;
 const channel=t=>{if(t<0)t++;if(t>1)t--;return t<1/6?p+(q-p)*6*t:t<1/2?q:t<2/3?p+(q-p)*(2/3-t)*6:p};
 return [channel(h+1/3),channel(h),channel(h-1/3)].map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4).reduce((a,c,i)=>a+c*[.2126,.7152,.0722][i],0);
}
test('continuous vivid scores provide readable black or white popup text',()=>{
 for(let score=0;score<=100;score++){
  const color=palette.color(score),text=palette.text(score),lum=luminance(color);
  assert(color.includes(' 92% '));
  const ratio=text==='#ffffff'?1.05/(lum+.05):(lum+.05)/.05;
  assert(ratio>=4.5,{score,color,text,ratio}.toString());
 }
 assert.equal(palette.color(null),'#98a5b6');
});
