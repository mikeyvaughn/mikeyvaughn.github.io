(() => {
  const butterfly = document.querySelector('.mfv-butterfly');
  const layer = butterfly?.parentElement;
  const controls = document.querySelector('.butterfly-controls');
  if (!butterfly || !layer || !controls) return;
  const toggle = controls.querySelector('[data-butterfly-toggle]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const surfaces = [...document.querySelectorAll('.header-band,.statement,.digital,.footer')];
  let preference = false;
  try {preference=sessionStorage.getItem("mfv-butterfly-paused")==="true";} catch {}
  let disposed = false, paused = preference || reduced.matches, raf = 0, previous = 0, elapsed = 0, flight = null, surface = null;
  let point = {x:.15+Math.random()*.7,y:.2+Math.random()*.6};
  let heading={x:-.8,y:.2}, bank=0, wingPhase=0, wingOpen=.98, bodyBob=0;
  let footerFlights = 0;
  const randomPoint = () => ({x:.06 + Math.random() * .88,y:.1 + Math.random() * .8});
  const nextFlight = () => {
    let end=randomPoint(), perch=false;
    const box=visibleSurface();
    if(surface?.classList.contains('footer') && footerFlights++ % 3 === 0 && box){
      const anchors=[...surface.querySelectorAll('.footer-bottom .brand-logo,.footer-bottom .brand-tagline')];
      const anchor=anchors[Math.floor(Math.random()*anchors.length)];
      if(anchor){
        const rect=anchor.getBoundingClientRect();
        const scale=Math.max(.55,Math.min(.88,rect.width*.72/butterfly.offsetWidth));
        butterfly.style.setProperty("--perch-scale",String(scale));
        const x=rect.right-butterfly.offsetWidth*.65, y=rect.top-butterfly.offsetHeight*.75;
        const clamp=value=>Math.max(0,Math.min(1,value));
        end={x:clamp((x-box.left)/(box.right-box.left)),y:box.bottom === box.top ? .5 : clamp((y-box.top)/(box.bottom-box.top))};perch=true;
      }
    }
    const dx=end.x-point.x,dy=end.y-point.y,length=Math.hypot(dx,dy)||1;
    const direction={x:dx/length,y:dy/length},bend=(Math.random()-.5)*.38;
    const limit=value=>Math.max(.02,Math.min(.98,value));
    const reach=Math.min(.25,Math.max(.08,length*.32));
    const c1={x:limit(point.x+heading.x*reach),y:limit(point.y+heading.y*reach)};
    const c2={x:limit(end.x-direction.x*reach-direction.y*bend),y:limit(end.y-direction.y*reach+direction.x*bend)};
    const pixels=box?Math.hypot(dx*(box.right-box.left),dy*(box.bottom-box.top)):400;
    flight={start:{...point},end,c1,c2,duration:Math.max(18000,Math.min(42000,pixels/(15+Math.random()*7)*1000)),rest:perch?8000+Math.random()*4000:0,glideStart:.22+Math.random()*.2,glideLength:.08+Math.random()*.1,perch};elapsed=0;
  };
  function visibleSurface() {
    const size = {width:butterfly.offsetWidth,height:butterfly.offsetHeight};
    const topLimit = document.querySelector('.header-band')?.getBoundingClientRect().bottom || 0;
    return surfaces.map(element => {
      const box = element.getBoundingClientRect(), isHeader=element.classList.contains('header-band');
      const top = Math.max(0,box.top,isHeader?0:topLimit), bottom = Math.min(box.bottom,innerHeight);
      const room=bottom-top;
      const start = room<size.height+28 ? top+(room-size.height)/2 : top+14;
      const end = room<size.height+28 ? start : bottom-size.height-14;
      return {element,left:24,right:document.documentElement.clientWidth-size.width-24,top:start,bottom:end,clipTop:top,clipBottom:bottom,room,isHeader};
    }).filter(box=>box.room>54 && box.right>box.left).sort((a,b)=>scrollY<100 && a.isHeader!==b.isHeader ? (a.isHeader?-1:1) : b.room-a.room)[0];
  }
  function draw() {
    const box = visibleSurface();
    butterfly.classList.toggle('is-visible', !!box && !reduced.matches);
    if (!box) {surface = null; return;}
    if (surface !== box.element) {surface = box.element;point={x:.15+Math.random()*.7,y:.2+Math.random()*.6};nextFlight();}
    layer.style.clipPath=`inset(${box.clipTop}px 0 ${Math.max(0,innerHeight-box.clipBottom)}px 0)`;
    butterfly.classList.toggle('on-header',box.isHeader);
    const x=box.left+(box.right-box.left)*point.x, y=box.top+(box.bottom-box.top)*point.y;
    const resting=butterfly.classList.contains("is-perched");
    const drift=resting?0:1;
    butterfly.style.transform=`translate3d(${x}px,${y+bodyBob*drift}px,0) rotate(${resting?0:bank}deg)`;
  }
  function frame(time) {
    const delta=previous?Math.min(time-previous,50):0;previous=time;
    if (!flight) nextFlight();
    wingPhase+=delta/1300*Math.PI*2;
    if (surface) elapsed+=delta*(1+.07*Math.sin(wingPhase));
    const t=Math.min(elapsed/flight.duration,1);
    // Travel continuously; ease to a stop only when approaching a landing.
    const u=flight.perch?t*t*(3-2*t):t,v=1-u;
    point={x:v*v*v*flight.start.x+3*v*v*u*flight.c1.x+3*v*u*u*flight.c2.x+u*u*u*flight.end.x,y:v*v*v*flight.start.y+3*v*v*u*flight.c1.y+3*v*u*u*flight.c2.y+u*u*u*flight.end.y};
    const vx=3*v*v*(flight.c1.x-flight.start.x)+6*v*u*(flight.c2.x-flight.c1.x)+3*u*u*(flight.end.x-flight.c2.x);
    const vy=3*v*v*(flight.c1.y-flight.start.y)+6*v*u*(flight.c2.y-flight.c1.y)+3*u*u*(flight.end.y-flight.c2.y);
    const speed=Math.hypot(vx,vy)||1;heading={x:vx/speed,y:vy/speed};
    const landing=flight.perch && t>.8 ? 1-(t-.8)/.2 : 1;
    bank+=(heading.x*6*landing-bank)*Math.min(1,delta/600);
    const gliding=!flight.perch && t>flight.glideStart && t<flight.glideStart+flight.glideLength;
    const resting=t===1 && flight.perch;
    const opening=resting?.88:gliding?.91:.62+.36*(.5+.5*Math.cos(wingPhase));
    wingOpen+=(opening-wingOpen)*Math.min(1,delta/95);
    butterfly.style.setProperty('--wing-open',String(wingOpen));
    butterfly.style.setProperty('--wing-right-open',String(resting||gliding?wingOpen:Math.max(.62,Math.min(.98,wingOpen+.012*Math.sin(wingPhase+.1)))));
    bodyBob=resting?0:Math.sin(wingPhase-.6)*(gliding?.3:1.6)*landing;
    butterfly.classList.toggle('is-resting',t===1);
    butterfly.classList.toggle('is-perched',t===1 && flight.perch);
    butterfly.classList.toggle('is-gliding',gliding);
    draw();
    if(elapsed>=flight.duration+flight.rest) nextFlight();
    raf=requestAnimationFrame(frame);
  }
  function update() {
    if(disposed) return;
    cancelAnimationFrame(raf);previous=0;
    butterfly.hidden=reduced.matches;
    controls.hidden=reduced.matches;
    butterfly.classList.toggle('is-paused',paused);
    toggle.textContent=reduced.matches?'Motion Reduced':paused?'Play Butterfly':'Pause Butterfly';
    toggle.disabled=reduced.matches;toggle.setAttribute('aria-pressed',String(!paused&&!reduced.matches));
    draw();
    if(!paused&&!reduced.matches&&!document.hidden) raf=requestAnimationFrame(frame);
  }
  toggle.addEventListener('click',()=>{paused=!paused;try{sessionStorage.setItem('mfv-butterfly-paused',String(paused));}catch{} update();});
  controls.querySelector('[data-butterfly-hide]')?.addEventListener('click',()=>{disposed=true;cancelAnimationFrame(raf);layer.remove();controls.remove();});
  reduced.addEventListener('change',()=>{paused=reduced.matches;update();});
  document.addEventListener('visibilitychange',update);
  addEventListener('scroll',()=>{if(paused&&!disposed)draw();},{passive:true});
  addEventListener('resize',()=>{if(!disposed)draw();});
  update();
})();
