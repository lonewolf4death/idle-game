(function (Game) {
  const clamp = function (n, a, b) { return Math.max(a, Math.min(b, n)); };
  const coordinates = {
    "1-4-2": [-12,-1.5,-1.5], "1-5-1": [-15,-2.5,-.5], "1-5-2": [-15,5,1.5],
    "2-4-1": [-6.3,11.5,-3], "2-4-2": [-.7,12.5,-5],
    "3-2-3": [14,-3.2,2.5], "3-5-1": [6.5,10,3], "3-5-2": [14,7,-1],
    "4-4-1": [6,-12.2,-3], "4-4-2": [-4,-12.6,1.2],
    "1-1": [-3.2, .5, 1], "1-2": [-6, 1.4, .5],
    "1-3-1": [-9, 3.2, 1.5], "1-3-2": [-9, -.5, -1],
    "1-2-1": [-6.5, -3.2, 2.2],
    "1-4-1": [-12, 3.8, .3],
    "1-2-2": [-9.7, -5.1, 3],
    "2-1": [-.8, 2.5, -2.3], "2-2": [-1, 5.5, -3.2],
    "2-3-1": [-4.3, 8.4, -2.3], "2-3-2": [-.5, 9.2, -4.4], "2-3-3": [3, 8.1, -2],
    "2-1-2": [-4.1, 4.5, -4.5],
    "3-1": [3.2, .3, .35], "3-2": [5.7, 1.5, 2.4], "3-3": [8, 3.5, 1],
    "3-4-1": [7, 6.4, 2.3], "3-4-2": [11, 5.3, -.5],
    "3-2-1": [8, -1.6, 3.5],
    "3-2-2": [11, -2.2, 1.8], "3-4-3": [11, 8.5, 1.8],
    "4-1": [-.4, -3.5, 1.3], "4-2": [.4, -6.5, -.7],
    "4-3-1": [-2.6, -9.5, .6], "4-3-2": [3.2, -9.3, -2.2], "4-3-3": [.2, -11.8, 1.5]
  };
  Game.TreeCamera = {
    ready:false, active:false, unavailable:false, yaw:.22, pitch:.2, distance:16,
    zoom:1, pointers:new Map(), objects:{}, paths:{}, hovered:null, frame:null,
    init: function () {
      this.viewport=document.getElementById("skill-tree");this.canvas=document.getElementById("skill-scene");
      this.labels=document.getElementById("skill-world");this.status=document.getElementById("tree-render-status");
      this.labelLinks=document.getElementById("skill-label-links");this.labelLines={};this.labelMetrics={};
      this.reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
      const view=this, port=this.viewport;
      this.observer=new ResizeObserver(function () { view.resize(); });this.observer.observe(port);
      document.getElementById("tree-zoom-in").addEventListener("click",function () { view.zoomBy(1.2); });
      document.getElementById("tree-zoom-out").addEventListener("click",function () { view.zoomBy(1/1.2); });
      document.getElementById("tree-fit").addEventListener("click",function () { view.fit(); });
      document.querySelectorAll("[data-tree-branch]").forEach(function (button) { button.addEventListener("click",function () { view.centerBranch(Number(button.dataset.treeBranch)); }); });
      port.addEventListener("contextmenu",function (event) { event.preventDefault(); });
      port.addEventListener("wheel",function (event) { event.preventDefault();view.zoomBy(Math.exp(-event.deltaY*.0015)); },{passive:false});
      port.addEventListener("pointerdown",function (event) {
        if (event.target.closest(".tree-camera-controls,.tree-branch-nav") || !view.ready || ![0,2].includes(event.button)) return;
        view.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
        if (view.pointers.size===1) { view.origin={x:event.clientX,y:event.clientY};view.dragged=false;view.panGesture=event.button===2 || event.shiftKey; }
        view.pinch=view.pinchState();
      });
      port.addEventListener("pointermove",function (event) {
        const previous=view.pointers.get(event.pointerId);
        if (!previous) { if (event.pointerType!=="touch") view.hover(event);return; }
        view.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
        if (!view.dragged && view.pointers.size<2 && Math.hypot(event.clientX-view.origin.x,event.clientY-view.origin.y)<5) return;
        if (!view.dragged) { view.dragged=true;Game.PrestigeUI.hideDetails();view.hovered=null;port.classList.add("is-dragging"); }
        if (!port.hasPointerCapture(event.pointerId)) port.setPointerCapture(event.pointerId);
        event.preventDefault();
        if (view.pointers.size>1) {
          const next=view.pinchState();
          if (view.pinch.distance>0 && next.distance>0) {
            view.distance=clamp(view.distance*view.pinch.distance/next.distance,2.8,65);
            view.pan(next.x-view.pinch.x,next.y-view.pinch.y);
          }
          view.pinch=next;
        } else if (view.panGesture || event.shiftKey) view.pan(event.clientX-previous.x,event.clientY-previous.y);
        else {
          view.yaw-=(event.clientX-previous.x)*.006;
          view.pitch=clamp(view.pitch+(event.clientY-previous.y)*.005,-1.38,1.38);
        }
        view.apply();
      });
      const release=function (event) {
        view.pointers.delete(event.pointerId);view.pinch=view.pinchState();
        if (port.hasPointerCapture(event.pointerId)) port.releasePointerCapture(event.pointerId);
        if (view.dragged) view.suppressUntil=performance.now()+350;
        if (!view.pointers.size) { view.dragged=false;port.classList.remove("is-dragging"); }
      };
      port.addEventListener("pointerup",release);port.addEventListener("pointercancel",release);
      port.addEventListener("pointerleave",function () { if (!view.pointers.size) { view.hovered=null;Game.PrestigeUI.queueHide();port.classList.remove("has-3d-hover"); } });
      port.addEventListener("click",function (event) {
        if (performance.now()<(view.suppressUntil||0)) { event.preventDefault();event.stopImmediatePropagation();return; }
        if (event.target!==view.canvas) return;
        const id=view.pick(event.clientX,event.clientY);
        if (id) Game.PrestigeUI.showDetails(id,true);
      },true);
      port.addEventListener("keydown",function (event) {
        if (event.target.closest(".tree-camera-controls,.tree-branch-nav")) return;
        const id=event.target.dataset.skill;
        if (id && ["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key)) {
          event.preventDefault();const branches=Game.CONFIG.PRESTIGE.branches;
          let branch=branches.findIndex(function (item) { return item.nodes.includes(id); }),node=branches[branch].nodes.indexOf(id);
          if (event.key==="ArrowLeft") branch=Math.max(0,branch-1);
          if (event.key==="ArrowRight") branch=Math.min(branches.length-1,branch+1);
          if (event.key==="ArrowUp") node++;
          if (event.key==="ArrowDown") node--;
          const next=branches[branch].nodes[clamp(node,0,branches[branch].nodes.length-1)];view.centerOn(next);Game.PrestigeUI.nodes[next].focus({preventScroll:true});return;
        }
        if (event.key==="+" || event.key==="=") { event.preventDefault();view.zoomBy(1.2); }
        else if (event.key==="-") { event.preventDefault();view.zoomBy(1/1.2); }
        else if (event.key==="0" || event.key==="Home") { event.preventDefault();view.fit(); }
        else if (event.target===port && ["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key)) {
          event.preventDefault();const dx=event.key==="ArrowLeft"?45:event.key==="ArrowRight"?-45:0,dy=event.key==="ArrowUp"?45:event.key==="ArrowDown"?-45:0;
          if (event.shiftKey) view.pan(dx,dy);else { view.yaw+=dx*.007;view.pitch=clamp(view.pitch-dy*.006,-1.38,1.38); }
          view.apply();
        }
      });
      this.canvas.addEventListener("webglcontextlost",function (event) { event.preventDefault();view.lost=true;view.showUnavailable("The 3D view is recovering. Skills remain available below.");view.stopFrame(); });
      this.canvas.addEventListener("webglcontextrestored",function () { view.lost=false;view.unavailable=false;view.status.hidden=true;port.classList.remove("tree-unavailable");view.resize(); });
      document.addEventListener("visibilitychange",function () { if (document.hidden) view.stopFrame();else view.requestRender(); });
      this.reduced.addEventListener("change",function () { view.requestRender(); });
    },
    ensureRenderer: function () {
      if (this.ready || this.unavailable) return this.ready;
      try {
        const T=window.THREE;if (!T) throw new Error("Missing renderer");
        this.renderer=new T.WebGLRenderer({canvas:this.canvas,antialias:true,alpha:false,powerPreference:"low-power"});
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
        this.renderer.setClearColor(0x070b13,1);this.renderer.outputColorSpace=T.SRGBColorSpace;
        this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.12;
        this.scene=new T.Scene();this.scene.fog=new T.FogExp2(0x070b13,.023);
        this.camera=new T.PerspectiveCamera(44,1,.1,150);this.target=new T.Vector3(0,1.5,-.4);
        this.raycaster=new T.Raycaster();this.raycaster.params.Line.threshold=.03;this.pointer=new T.Vector2();this.pickables=[];
        this.scene.add(new T.HemisphereLight(0xc6d8ff,0x20112c,2.1));
        const key=new T.DirectionalLight(0xebd2aa,3.6);key.position.set(-6,7,8);this.scene.add(key);
        const rim=new T.DirectionalLight(0x79bad9,4);rim.position.set(7,3,-5);this.scene.add(rim);
        const fill=new T.PointLight(0xb58be1,19,15,2);fill.position.set(0,0,2);this.scene.add(fill);
        this.buildScene(T);this.ready=true;this.viewport.dataset.renderer="webgl";
        this.updateState(true);return true;
      } catch (error) { this.showUnavailable("The 3D view is unavailable in this browser. You can still inspect and purchase every skill below.");return false; }
    },
    buildScene: function (T) {
      const seed=function (i) { const n=Math.sin(i*127.1+311.7)*43758.5453;return n-Math.floor(n); };
      const stars=[],colors=[];
      for (let i=0;i<650;i++) {
        const angle=seed(i+1)*Math.PI*2,z=seed(i+73)*2-1,r=13+seed(i+131)*25,k=Math.sqrt(1-z*z);
        stars.push(Math.cos(angle)*k*r,z*r*.75,Math.sin(angle)*k*r);
        const color=new T.Color(i%4===0?0xa38ec9:i%3===0?0x749fb4:0xc1b99c);color.multiplyScalar(.35+seed(i+70)*.5);colors.push(color.r,color.g,color.b);
      }
      const starGeometry=new T.BufferGeometry();starGeometry.setAttribute("position",new T.Float32BufferAttribute(stars,3));starGeometry.setAttribute("color",new T.Float32BufferAttribute(colors,3));
      this.scene.add(new T.Points(starGeometry,new T.PointsMaterial({size:.035,vertexColors:true,transparent:true,opacity:.8,depthWrite:false})));
      this.core=new T.Group();this.core.position.set(0,-.75,0);this.scene.add(this.core);
      this.coreGem=new T.Mesh(new T.OctahedronGeometry(.72,0),new T.MeshStandardMaterial({color:0xe1c390,metalness:.65,roughness:.22,emissive:0xab6dbe,emissiveIntensity:.24,flatShading:true}));this.core.add(this.coreGem);
      const coreCage=new T.LineSegments(new T.EdgesGeometry(this.coreGem.geometry),new T.LineBasicMaterial({color:0xf6dba3,transparent:true,opacity:.8}));this.coreGem.add(coreCage);
      let coreOrbit;
      for(let i=0;i<3;i++) {
        const ring=new T.Mesh(new T.TorusGeometry(1+i*.17,.018,8,90),new T.MeshStandardMaterial({color:i===1?0xb08bcf:0xc5a56a,metalness:.7,roughness:.32,emissive:i===1?0x493262:0x59462c,emissiveIntensity:.45}));
        ring.rotation.set(.4+i*.85,i*.6,.25+i*.4);this.core.add(ring);
        if (i===0) coreOrbit=ring;
      }
      // The existing central crystal is the starting skill, rather than an
      // unpurchasable hub with a second Origin crystal attached beside it.
      this.core.traverse(function (object) { object.userData.skillId="0-0"; });
      this.objects["0-0"]={group:this.core,gem:this.coreGem,orbit:coreOrbit,edges:coreCage,index:-1};
      const originLine=document.createElementNS("http://www.w3.org/2000/svg","line");this.labelLinks.appendChild(originLine);this.labelLines["0-0"]=originLine;
      Object.keys(coordinates).forEach(function (id,index) {
        const group=new T.Group();group.position.fromArray(coordinates[id]);group.userData.skillId=id;
        const geometry=id[0]==="1"?new T.OctahedronGeometry(.52,0):id[0]==="2"?new T.TorusKnotGeometry(.31,.12,64,10,2,3):id[0]==="3"?new T.DodecahedronGeometry(.49,0):new T.IcosahedronGeometry(.5,1);
        const material=new T.MeshStandardMaterial({color:0x8a76a5,metalness:.5,roughness:.32,emissive:0x4d315e,emissiveIntensity:.22,flatShading:true});
        const gem=new T.Mesh(geometry,material);gem.rotation.set(index===3?.22:index*.29,index===3?.28:.35+index*.4,.18);group.add(gem);
        const edges=new T.LineSegments(new T.EdgesGeometry(geometry,20),new T.LineBasicMaterial({color:0xcfb3e3,transparent:true,opacity:.52}));gem.add(edges);
        const orbit=new T.Mesh(new T.TorusGeometry(.73,.024,8,80),new T.MeshStandardMaterial({color:0xa38ebf,metalness:.75,roughness:.28,emissive:0x36264b,emissiveIntensity:.5}));
        orbit.rotation.set(.55+index*.37,index*.4,-.35+index*.25);group.add(orbit);
        const bead=new T.Mesh(new T.SphereGeometry(.065,12,8),new T.MeshStandardMaterial({color:0xe5c98f,emissive:0x9a6836,emissiveIntensity:.8,metalness:.35,roughness:.3}));bead.position.set(.73,0,0);orbit.add(bead);
        group.traverse(function (object) { object.userData.skillId=id; });this.scene.add(group);this.pickables.push(group);
        this.objects[id]={group:group,gem:gem,orbit:orbit,edges:edges,index:index};
        const line=document.createElementNS("http://www.w3.org/2000/svg","line");this.labelLinks.appendChild(line);this.labelLines[id]=line;
      },this);
      Object.keys(coordinates).forEach(function (id) {
        const parent=Game.CONFIG.PRESTIGE.skills[id].requires;
        const a=(parent?this.objects[parent].group:this.core).position.clone(),b=this.objects[id].group.position.clone();
        const direction=b.clone().sub(a),c1=a.clone().addScaledVector(direction,.35),c2=a.clone().addScaledVector(direction,.75);
        c1.y-=.45;c1.z+=.7;c2.z+=id[0]==="2"?-.5:.45;
        const curve=new T.CubicBezierCurve3(a,c1,c2,b);
        const tube=new T.Mesh(new T.TubeGeometry(curve,56,.018,6,false),new T.MeshStandardMaterial({color:0x665575,metalness:.45,roughness:.55,emissive:0x3b284c,emissiveIntensity:.4}));
        this.scene.add(tube);this.paths[id]=tube;
      },this);
    },
    updateState: function (force) {
      if (!this.ready) return;
      const key=Object.keys(this.objects).map(function (id) { return Number(Game.Progression.hasSkill(id))+":"+Number(Game.Prestige.canBuySkill(id))+":"+Game.PrestigeUI.nodes[id].getAttribute("aria-expanded"); }).join("|");
      if (!force && key===this.stateKey) return;this.stateKey=key;
      Object.keys(this.objects).forEach(function (id) {
        const own=Game.Progression.hasSkill(id),available=Game.Prestige.canBuySkill(id),item=this.objects[id];
        const color=own?0xd6b876:available?0xa48bc9:0x4b596c,light=own?0x8e652b:available?0x58356f:0x172132;
        item.gem.material.color.setHex(color);item.gem.material.emissive.setHex(light);item.gem.material.emissiveIntensity=own?.48:available?.32:.1;
        item.orbit.material.color.setHex(own?0xe3c281:available?0xb8a1d3:0x59667b);
        item.edges.material.color.setHex(own?0xffe3ac:available?0xd6c3ec:0x748297);
        if (this.paths[id]) {
          this.paths[id].material.color.setHex(own?0xc9a76c:available?0x8970a8:0x39485a);
          this.paths[id].material.emissive.setHex(own?0x6f4d23:available?0x392445:0x111a25);
        }
      },this);
      this.dirty=true;this.requestRender();
    },
    showUnavailable: function (message) {
      this.unavailable=true;this.labelLayoutKey=null;this.status.textContent=message;this.status.hidden=false;this.viewport.classList.add("tree-unavailable");
      if (!Game.player.ui.skillTree2D) Object.values(Game.PrestigeUI.nodes).forEach(function (node) { node.hidden=false;node.style.removeProperty("left");node.style.removeProperty("top"); });
    },
    setActive: function (active) {
      this.active=active;
      if (active) this.resize();else { this.stopFrame();this.pointers.clear();this.hovered=null;this.viewport.classList.remove("is-dragging","has-3d-hover"); }
    },
    resize: function () {
      if (!this.active || !this.viewport.clientWidth || !this.viewport.clientHeight || !this.ensureRenderer()) return;
      const width=this.viewport.clientWidth,height=this.viewport.clientHeight;
      this.renderer.setSize(width,height,false);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();
      if (!this.fitted) { this.fitted=true;this.fit(); }else this.apply(false);
    },
    basis: function () {
      const T=window.THREE,c=Math.cos(this.pitch),s=Math.sin(this.pitch),y=this.yaw;
      return {back:new T.Vector3(Math.sin(y)*c,s,Math.cos(y)*c),right:new T.Vector3(Math.cos(y),0,-Math.sin(y)),up:new T.Vector3(-Math.sin(y)*s,c,-Math.cos(y)*s)};
    },
    apply: function (hideDetails) {
      if (!this.ready || this.lost) return;
      const basis=this.basis();this.camera.position.copy(this.target).addScaledVector(basis.back,this.distance);this.camera.lookAt(this.target);this.camera.updateMatrixWorld();
      this.scene.updateMatrixWorld(true);this.positionLabels();
      this.zoom=(this.fitDistance||this.distance)/this.distance;
      document.getElementById("tree-zoom-level").textContent=Math.round(this.zoom*100)+"%";
      if (hideDetails!==false) { Game.PrestigeUI.hideDetails();this.hovered=null; }
      this.dirty=true;this.requestRender();
    },
    fit: function () {
      if (!this.ready) return;
      this.yaw=.22;this.pitch=.2;this.target.set(0,1.5,-.4);
      const axes=this.basis(),vertical=Math.tan(this.camera.fov*Math.PI/360),horizontal=vertical*this.camera.aspect;
      let distance=8;
      Object.values(this.objects).forEach(function (item) {
        const p=item.group.position.clone().sub(this.target);
        distance=Math.max(distance,p.dot(axes.back)+Math.max((Math.abs(p.dot(axes.right))+1.1)/horizontal,(Math.abs(p.dot(axes.up))+1.4)/vertical));
      },this);
      this.distance=this.fitDistance=clamp(distance+1,8,60);this.apply();
    },
    zoomBy: function (factor) { if (!this.ready) return;this.distance=clamp(this.distance/factor,2.8,65);this.apply(); },
    pan: function (dx,dy) {
      if (!this.ready) return;const basis=this.basis(),scale=2*this.distance*Math.tan(this.camera.fov*Math.PI/360)/Math.max(1,this.viewport.clientHeight);
      this.target.addScaledVector(basis.right,-dx*scale).addScaledVector(basis.up,dy*scale);this.target.clampLength(0,18);
    },
    centerOn: function (id) { if (!this.ready || !this.objects[id]) return;this.target.copy(this.objects[id].group.position);this.distance=7.5;this.apply(); },
    centerBranch: function (id) {
      if (!this.ready) return;
      const branch=Game.CONFIG.PRESTIGE.branches.find(function (item) { return item.id===id; });if (!branch) return;
      const box=new window.THREE.Box3();branch.nodes.forEach(function (key) { box.expandByPoint(this.objects[key].group.position); },this);
      box.getCenter(this.target);this.yaw=.22;this.pitch=.2;
      const axes=this.basis(),vertical=Math.tan(this.camera.fov*Math.PI/360),horizontal=vertical*this.camera.aspect;let distance=8;
      branch.nodes.forEach(function (key) {
        const p=this.objects[key].group.position.clone().sub(this.target);
        distance=Math.max(distance,p.dot(axes.back)+Math.max((Math.abs(p.dot(axes.right))+1.1)/horizontal,(Math.abs(p.dot(axes.up))+1.4)/vertical));
      },this);
      this.distance=clamp(distance+1,8,60);this.apply();
    },
    reveal: function (id) {
      if (!this.ready || !this.objects[id]) return;const p=this.project(this.objects[id].group.position);
      if (p.x<80 || p.x>this.viewport.clientWidth-80 || p.y<60 || p.y>this.viewport.clientHeight-80 || p.depth<0) this.centerOn(id);
    },
    project: function (position) {
      const p=position.clone().project(this.camera);return {x:(p.x+1)*this.viewport.clientWidth/2,y:(1-p.y)*this.viewport.clientHeight/2,depth:p.z};
    },
    pick: function (clientX,clientY) {
      if (!this.ready || this.lost) return null;
      const box=this.canvas.getBoundingClientRect();this.pointer.set((clientX-box.left)/box.width*2-1,-(clientY-box.top)/box.height*2+1);
      this.raycaster.far=Infinity;this.raycaster.setFromCamera(this.pointer,this.camera);const hits=this.raycaster.intersectObjects(this.pickables.concat([this.core]),true);
      return hits.length?hits[0].object.userData.skillId||null:null;
    },
    hover: function (event) {
      if (!this.ready || event.target.closest(".tree-camera-controls,.tree-branch-nav")) return;
      const label=event.target.closest("[data-skill]"),id=label?label.dataset.skill:this.pick(event.clientX,event.clientY);
      this.viewport.classList.toggle("has-3d-hover",Boolean(id));
      if (id===this.hovered) return;this.hovered=id;
      if (id) Game.PrestigeUI.scheduleDetails(id);else Game.PrestigeUI.queueHide();
    },
    pinchState: function () { const p=Array.from(this.pointers.values());return p.length<2?{distance:0,x:0,y:0}:{distance:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2}; },
    requestRender: function () {
      if (!this.active || !this.ready || this.lost || document.hidden || this.frame) return;
      clearTimeout(this.idleTimer);this.idleTimer=null;
      this.frame=requestAnimationFrame(function (now) { Game.TreeCamera.tick(now); });
    },
    stopFrame: function () { cancelAnimationFrame(this.frame);clearTimeout(this.idleTimer);this.frame=null;this.idleTimer=null; },
    tick: function (now) {
      this.frame=null;if (!this.active || !this.ready || this.lost || document.hidden) return;
      if (this.dirty || !this.lastDraw || now-this.lastDraw>=1000/30) { this.render(now);this.lastDraw=now;this.dirty=false; }
      if (!this.reduced.matches) this.idleTimer=setTimeout(function () { Game.TreeCamera.requestRender(); },1000/15);
    },
    render: function (now) {
      if (!this.ready || this.lost) return;
      if (!this.reduced.matches) this.coreGem.rotation.y=now*.00012;
      Object.keys(this.objects).forEach(function (id) {
        this.objects[id].orbit.material.emissiveIntensity=Game.PrestigeUI.nodes[id].getAttribute("aria-expanded")==="true"?1.6:.5;
      },this);
      this.scene.updateMatrixWorld(true);this.renderer.render(this.scene,this.camera);
      this.positionLabels();
    },
    positionLabels: function () {
      const height=this.viewport.clientHeight,width=this.viewport.clientWidth;
      const layoutKey=[this.stateKey,width,height,this.yaw,this.pitch,this.distance,this.fitDistance,this.target.x,this.target.y,this.target.z].join("|");
      if (layoutKey===this.labelLayoutKey) return;this.labelLayoutKey=layoutKey;
      this.viewport.classList.toggle("is-overview", this.distance > (this.fitDistance || this.distance) / 1.45);
      this.labelLinks.setAttribute("viewBox","0 0 "+width+" "+height);
      // Read all label dimensions before writing positions, avoiding repeated layout.
      Object.values(Game.PrestigeUI.nodes).forEach(function (node) { node.hidden=false; });
      Object.keys(this.objects).forEach(function (id) {
        const node=Game.PrestigeUI.nodes[id];if (node.offsetWidth) this.labelMetrics[id]={width:node.offsetWidth,height:node.offsetHeight};
      },this);
      const viewport=this.viewport.getBoundingClientRect(),occupied=[];
      this.viewport.querySelectorAll(".tree-branch-nav,.tree-camera-controls,.tree-legend,.symmetry-placeholder").forEach(function (element) {
        const r=element.getBoundingClientRect();if (r.width && r.height) occupied.push({x:r.left-viewport.left-3,y:r.top-viewport.top-3,width:r.width+6,height:r.height+6});
      });
      const labels=Object.keys(this.objects).map(function (id) {
        const item=this.objects[id],node=Game.PrestigeUI.nodes[id],p=this.project(item.group.position);
        const separation=this.camera.position.distanceTo(item.group.position),size=height*.78/(separation*Math.tan(this.camera.fov*Math.PI/360));
        const direction=item.group.position.clone().sub(this.camera.position).normalize();
        this.raycaster.set(this.camera.position,direction);this.raycaster.far=separation-.55;
        const blocked=this.raycaster.intersectObjects(this.pickables.concat([this.core]),true).some(function (hit) { return hit.object.isMesh && hit.object.userData.skillId!==id; });
        const hidden=blocked || p.depth<-1 || p.depth>1 || p.x<-50 || p.x>width+50 || p.y<-50 || p.y>height-20;
        return {id:id,node:node,p:p,size:size,separation:separation,hidden:hidden,metrics:this.labelMetrics[id]||{width:120,height:38}};
      },this);
      labels.forEach(function (label) {
        if (!label.hidden) { const radius=Math.max(10,label.size*.5);occupied.push({x:label.p.x-radius,y:label.p.y-radius,width:radius*2,height:radius*2}); }
      });
      labels.sort(function (a,b) { return Number(b.node.getAttribute("aria-expanded")==="true")-Number(a.node.getAttribute("aria-expanded")==="true") || Number(b.node.classList.contains("is-root"))-Number(a.node.classList.contains("is-root")); });
      const overlaps=function (a,b) { return a.x<b.x+b.width+4 && a.x+a.width+4>b.x && a.y<b.y+b.height+4 && a.y+a.height+4>b.y; };
      const offsets=[];[0,-44,44,-88,88,-132,132,-176,176,-220,220,-264,264].forEach(function (y) { [0,-110,110,-220,220,-330,330,-440,440,-550,550,-660,660].forEach(function (x) { offsets.push({x:x,y:y}); }); });
      offsets.sort(function (a,b) { return a.x*a.x+a.y*a.y*3-b.x*b.x-b.y*b.y*3; });
      labels.forEach(function (label) {
        const node=label.node,p=label.p,line=this.labelLines[label.id],w=label.metrics.width,h=label.metrics.height;
        node.hidden=label.hidden;line.setAttribute("visibility","hidden");if (label.hidden) return;
        const preferred={x:p.x-w/2,y:p.y+Math.max(20,label.size*.58),width:w,height:h};let box;
        for (const offset of offsets) {
          const candidate={x:clamp(preferred.x+offset.x,6,Math.max(6,width-w-6)),y:clamp(preferred.y+offset.y,6,Math.max(6,height-h-6)),width:w,height:h};
          if (!occupied.some(function (other) { return overlaps(candidate,other); })) { box=candidate;break; }
        }
        // A dense overview may need space beyond the nearby crystal cluster.
        if (!box) for (let y=6;y<=height-h-6 && !box;y+=8) for (let x=6;x<=width-w-6;x+=16) {
          const candidate={x:x,y:y,width:w,height:h};
          if (!occupied.some(function (other) { return overlaps(candidate,other); })) { box=candidate;break; }
        }
        box=box||{x:clamp(preferred.x,6,Math.max(6,width-w-6)),y:clamp(preferred.y,6,Math.max(6,height-h-6)),width:w,height:h};occupied.push(box);
        node.style.left=(box.x+w/2)+"px";node.style.top=box.y+"px";node.style.zIndex=String(Math.round(1000-label.separation*10));
        if (Math.abs(box.x-preferred.x)+Math.abs(box.y-preferred.y)>12) {
          line.setAttribute("x1",p.x);line.setAttribute("y1",p.y);line.setAttribute("x2",box.x+w/2);line.setAttribute("y2",box.y+h/2);line.setAttribute("visibility","visible");
        }
      },this);
      document.getElementById("tree-core-label").hidden=true;
    }
  };
})(window.CosmicIdle);
