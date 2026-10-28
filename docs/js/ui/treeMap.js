(function (Game) {
  Game.TreeMap = {
    positions:{}, lines:{}, layoutKey:null,
    init:function () {
      this.port=document.getElementById('skill-map');this.world=document.getElementById('skill-map-world');
      const svg=document.getElementById('skill-map-links');
      Object.keys(Game.PrestigeUI.nodes).forEach(function (id) {
        if(id==='0-0') return;
        const line=document.createElementNS('http://www.w3.org/2000/svg','path');line.dataset.to=id;
        svg.appendChild(line);Game.TreeMap.lines[id]=line;
      });
      this.port.addEventListener('keydown',function (event) {
        const id=event.target.dataset.skill,positions=Game.TreeMap.positions;
        if(!id || !event.key.startsWith('Arrow')) return;
        event.preventDefault();const current=positions[id],axis=['ArrowLeft','ArrowRight'].includes(event.key)?0:1,sign=['ArrowLeft','ArrowUp'].includes(event.key)?-1:1;
        const target=Object.keys(positions).filter(function (key) { return (positions[key][axis]-current[axis])*sign>1; }).sort(function (a,b) {
          const score=function (key) { return Math.abs(positions[key][axis]-current[axis])+Math.abs(positions[key][1-axis]-current[1-axis])*3; };return score(a)-score(b);
        })[0];
        if(target) Game.PrestigeUI.nodes[target].focus();
      });
      document.querySelectorAll('[data-tree-branch]').forEach(function (button) { button.addEventListener('click',function () {
        const node=Game.PrestigeUI.nodes[button.dataset.treeBranch+'-1'];if(node&&!node.hidden) { node.scrollIntoView({block:'nearest',inline:'center'});node.focus({preventScroll:true}); }
      }); });
      this.syncMode();
    },
    syncMode:function () { Game.player.ui.skillTree2D=1; },
    updateState:function () {
      const tree=this,nodes=Game.PrestigeUI.nodes,visible=Object.keys(nodes).filter(function (id) { return Game.Discovery.skill(id); }),key=visible.join('|');
      if(this.layoutKey!==key) {
        const focus=nodes[Game.PrestigeUI.selected],before=focus&&!focus.hidden?focus.getBoundingClientRect():null;
        this.layoutKey=key;this.positions={};const children={},widths={};
        visible.forEach(function (id) { children[id]=[]; });
        visible.forEach(function (id) { if(id!=='0-0') children[Game.CONFIG.PRESTIGE.skills[id].requires||'0-0'].push(id); });
        function measure(id) { return (widths[id]=Math.max(180,children[id].reduce(function (sum,child) { return sum+measure(child); },0))); }
        const width=measure('0-0')+48;let maxDepth=0;
        function place(id,left,depth) {
          maxDepth=Math.max(maxDepth,depth);tree.positions[id]=[left+widths[id]/2,45+depth*155];
          let offset=left+(widths[id]-children[id].reduce(function (sum,child) { return sum+widths[child]; },0))/2;
          children[id].forEach(function (child) { place(child,offset,depth+1);offset+=widths[child]; });
        }
        place('0-0',24,0);
        Object.entries(nodes).forEach(function (entry) {
          const id=entry[0],node=entry[1],position=tree.positions[id];node.hidden=!position;
          if(position) { node.style.left=position[0]+'px';node.style.top=position[1]+'px'; }
        });
        const height=45+maxDepth*155+150;
        this.world.style.width=width+'px';this.world.style.height=height+'px';
        const svg=document.getElementById('skill-map-links');svg.setAttribute('viewBox','0 0 '+width+' '+height);svg.style.width=width+'px';svg.style.height=height+'px';
        Object.entries(this.lines).forEach(function (entry) {
          const id=entry[0],line=entry[1],b=tree.positions[id],a=tree.positions[Game.CONFIG.PRESTIGE.skills[id].requires||'0-0'];line.style.display=b?'':'none';
          if(a&&b) { const start=a[1]+100,end=b[1]-17,y=(start+end)/2;line.setAttribute('d','M'+a[0]+','+start+' V'+y+' H'+b[0]+' V'+end); }
        });
        if(before&&!focus.hidden) { const after=focus.getBoundingClientRect();this.port.scrollLeft+=after.left-before.left; }
        else this.port.scrollLeft=Math.max(0,(width-this.port.clientWidth)/2);
        if(nodes[Game.PrestigeUI.selected].hidden) Game.PrestigeUI.hideDetails();
      }
      if(this.entering || this.portWidth!==this.port.clientWidth) {
        this.entering=false;this.portWidth=this.port.clientWidth;this.port.scrollTop=0;
        this.port.scrollLeft=Math.max(0,this.positions['0-0'][0]-this.portWidth/2);
      }
      Object.entries(this.lines).forEach(function (entry) { entry[1].classList.toggle('is-owned',Game.Progression.hasSkill(entry[0]));entry[1].classList.toggle('is-available',Game.Prestige.canBuySkill(entry[0])); });
    }
  };
})(window.CosmicIdle);
