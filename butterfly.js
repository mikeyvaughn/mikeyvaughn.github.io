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
  let point = {x:.75,y:.4};
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
    flight={start:{...point},end,control:randomPoint(),duration:28000+Math.random()*10000,rest:perch?8000+Math.random()*4000:2000+Math.random()*2000,perch};elapsed=0;
  };
  function visibleSurface() {
    const size = butterfly.getBoundingClientRect();
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
    if (surface !== box.element) {surface = box.element;point={x:.75,y:.4};nextFlight();}
    layer.style.clipPath=`inset(${box.clipTop}px 0 ${Math.max(0,innerHeight-box.clipBottom)}px 0)`;
    butterfly.classList.toggle('on-header',box.isHeader);
    const x=box.left+(box.right-box.left)*point.x, y=box.top+(box.bottom-box.top)*point.y;
    const angle = Math.sin(point.x*Math.PI*2)*4;
    butterfly.style.transform=`translate3d(${x}px,${y}px,0) rotate(${angle}deg)`;
  }
  function frame(time) {
    const delta=previous?Math.min(time-previous,50):0;previous=time;
    if (!flight) nextFlight();
    if (surface) elapsed+=delta;
    const t=Math.min(elapsed/flight.duration,1),u=t*t*(3-2*t),v=1-u;
    point={x:v*v*flight.start.x+2*v*u*flight.control.x+u*u*flight.end.x,y:v*v*flight.start.y+2*v*u*flight.control.y+u*u*flight.end.y};
    butterfly.classList.toggle('is-resting',t===1);
    butterfly.classList.toggle('is-perched',t===1 && flight.perch);draw();
    if(elapsed>flight.duration+flight.rest) nextFlight();
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
