(() => {
  const butterfly=document.querySelector('.mfv-butterfly');
  const layer=butterfly?.parentElement,controls=document.querySelector('.butterfly-controls');
  if(!butterfly||!layer||!controls)return;
  const toggle=controls.querySelector('[data-butterfly-toggle]');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const surfaces=[...document.querySelectorAll('.header-band,.statement,.digital,.footer')];
  let preference=false;
  try{preference=sessionStorage.getItem('mfv-butterfly-paused')==='true';}catch{}
  let paused=preference||reduced.matches,disposed=false,raf=0,previous=0,elapsed=0,flight=null;
  let heading={x:-.8,y:.2},bank=0,wingPhase=0,wingOpen=.98,bodyBob=0;
  let lastScrollY=scrollY,lastScrollAt=0;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  const bounds=()=>({left:18,right:Math.max(19,document.documentElement.clientWidth-butterfly.offsetWidth-18),top:12,bottom:Math.max(13,innerHeight-butterfly.offsetHeight-16)});
  const initial=bounds();
  // Pixel coordinates belong to the viewport, never to a scrolling section.
  let point={x:initial.left+Math.random()*(initial.right-initial.left),y:18};
  const randomPoint=()=>{const b=bounds();return{x:b.left+Math.random()*(b.right-b.left),y:b.top+Math.random()*(b.bottom-b.top)};};
  function perchTarget(){
    if(performance.now()-lastScrollAt<1000||Math.random()>.4)return null;
    const footer=document.querySelector('.footer');
    if(!footer)return null;
    const b=bounds(),f=footer.getBoundingClientRect();
    const candidates=[...footer.querySelectorAll('.footer-bottom .brand-logo,.footer-bottom .brand-tagline')].map(e=>e.getBoundingClientRect()).filter(r=>r.top>Math.max(0,f.top)+butterfly.offsetHeight*.8&&r.bottom<innerHeight-16);
    if(!candidates.length)return null;
    const r=candidates[Math.floor(Math.random()*candidates.length)];
    butterfly.style.setProperty('--perch-scale',String(clamp(r.width*.72/butterfly.offsetWidth,.55,.88)));
    return{x:clamp(r.right-butterfly.offsetWidth*.65,b.left,b.right),y:clamp(r.top-butterfly.offsetHeight*.75,b.top,b.bottom)};
  }
  function nextFlight(allowPerch=true){
    const b=bounds(),target=allowPerch?perchTarget():null,end=target||randomPoint();
    const dx=end.x-point.x,dy=end.y-point.y,distance=Math.hypot(dx,dy)||1;
    const direction={x:dx/distance,y:dy/distance},reach=clamp(distance*.32,35,170),bend=(Math.random()-.5)*Math.min(140,distance*.4);
    const limit=p=>({x:clamp(p.x,b.left,b.right),y:clamp(p.y,b.top,b.bottom)});
    flight={start:{...point},end,c1:limit({x:point.x+heading.x*reach,y:point.y+heading.y*reach}),c2:limit({x:end.x-direction.x*reach-direction.y*bend,y:end.y-direction.y*reach+direction.x*bend}),duration:clamp(distance/(15+Math.random()*7)*1000,16000,42000),perch:!!target,rest:target?8000+Math.random()*4000:0,glideStart:.2+Math.random()*.3,glideLength:.1+Math.random()*.14};
    elapsed=0;
  }
  function draw(){
    const width=document.documentElement.clientWidth,height=innerHeight;
    // Scrolling changes the reveal mask only, never the route or its origin.
    const regions=surfaces.map(element=>{const r=element.getBoundingClientRect();return{top:Math.max(0,r.top),bottom:Math.min(height,r.bottom),header:element.classList.contains('header-band')};}).filter(r=>r.bottom>r.top);
    layer.style.clipPath=regions.length?`path('${regions.map(r=>`M0 ${r.top}H${width}V${r.bottom}H0Z`).join(' ')}')`:'inset(50%)';
    const visible=regions.some(r=>point.y+butterfly.offsetHeight>r.top&&point.y<r.bottom);
    butterfly.classList.toggle('is-visible',visible&&!reduced.matches);
    butterfly.classList.toggle('on-header',regions.some(r=>r.header&&point.y+butterfly.offsetHeight*.5<r.bottom&&point.y+butterfly.offsetHeight>r.top));
    const resting=butterfly.classList.contains('is-perched');
    butterfly.style.transform=`translate3d(${point.x}px,${point.y+(resting?0:bodyBob)}px,0) rotate(${resting?0:bank}deg)`;
  }
  function frame(time){
    const delta=previous?Math.min(time-previous,50):0;previous=time;
    if(!flight)nextFlight();
    const t=Math.min(elapsed/flight.duration,1);
    const glide=flight.perch?0:smooth((t-flight.glideStart)/.035)*(1-smooth((t-flight.glideStart-flight.glideLength)/.035));
    wingPhase+=delta/(1300+glide*1300)*Math.PI*2;
    elapsed+=delta*(1+.06*Math.sin(wingPhase)*(1-glide));
    const progress=Math.min(elapsed/flight.duration,1);
    const u=flight.perch?progress*progress*progress*(progress*(progress*6-15)+10):progress,v=1-u;
    point={x:v*v*v*flight.start.x+3*v*v*u*flight.c1.x+3*v*u*u*flight.c2.x+u*u*u*flight.end.x,y:v*v*v*flight.start.y+3*v*v*u*flight.c1.y+3*v*u*u*flight.c2.y+u*u*u*flight.end.y};
    const vx=3*v*v*(flight.c1.x-flight.start.x)+6*v*u*(flight.c2.x-flight.c1.x)+3*u*u*(flight.end.x-flight.c2.x),vy=3*v*v*(flight.c1.y-flight.start.y)+6*v*u*(flight.c2.y-flight.c1.y)+3*u*u*(flight.end.y-flight.c2.y);
    const speed=Math.hypot(vx,vy)||1;heading={x:vx/speed,y:vy/speed};
    const landing=flight.perch?1-smooth((progress-.78)/.22):1,resting=progress===1&&flight.perch;
    bank+=(heading.x*5*landing-bank)*Math.min(1,delta/850);
    const beat=.62+.36*(.5+.5*Math.cos(wingPhase)),opening=resting?.88:beat*(1-glide)+.91*glide;
    wingOpen+=(opening-wingOpen)*Math.min(1,delta/(resting?400:120));
    butterfly.style.setProperty('--wing-open',String(wingOpen));
    butterfly.style.setProperty('--wing-right-open',String(clamp(wingOpen+.009*Math.sin(wingPhase+.1)*(1-glide)*landing,.62,.98)));
    bodyBob=resting?0:Math.sin(wingPhase-.6)*(1.45*(1-glide)+.2*glide)*landing;
    butterfly.classList.toggle('is-perched',resting);butterfly.classList.toggle('is-resting',resting);butterfly.classList.toggle('is-gliding',glide>.5);
    draw();
    if(elapsed>=flight.duration+flight.rest)nextFlight();
    raf=requestAnimationFrame(frame);
  }
  function update(){
    if(disposed)return;
    cancelAnimationFrame(raf);previous=0;butterfly.hidden=reduced.matches;controls.hidden=reduced.matches;
    butterfly.classList.toggle('is-paused',paused);
    toggle.textContent=reduced.matches?'Motion Reduced':paused?'Play Butterfly':'Pause Butterfly';toggle.disabled=reduced.matches;toggle.setAttribute('aria-pressed',String(!paused&&!reduced.matches));draw();
    if(!paused&&!reduced.matches&&!document.hidden)raf=requestAnimationFrame(frame);
  }
  toggle.addEventListener('click',()=>{paused=!paused;preference=paused;try{sessionStorage.setItem('mfv-butterfly-paused',String(paused));}catch{}update();});
  controls.querySelector('[data-butterfly-hide]')?.addEventListener('click',()=>{disposed=true;cancelAnimationFrame(raf);layer.remove();controls.remove();});
  reduced.addEventListener('change',()=>{paused=preference||reduced.matches;update();});
  document.addEventListener('visibilitychange',update);
  addEventListener('scroll',()=>{
    if(disposed)return;
    if(scrollY!==lastScrollY){lastScrollY=scrollY;lastScrollAt=performance.now();
      // Leave a moving landing target from the current position; never chase it.
      if(flight?.perch){butterfly.classList.remove('is-perched','is-resting');nextFlight(false);}
    }
    if(paused)draw();
  },{passive:true});
  addEventListener('resize',()=>{if(disposed)return;const b=bounds();point={x:clamp(point.x,b.left,b.right),y:clamp(point.y,b.top,b.bottom)};nextFlight(false);draw();});
  update();
})();
