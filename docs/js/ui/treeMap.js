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
      const tree=this,nodes=Game.PrestigeUI.nodes,visible=Object.keys(nodes).filter(function (id) { return Game.Discovery.skill(id); }),key=visible.join('|')+':'+this.port.clientWidth;
      if(this.layoutKey!==key) {
        this.layoutKey=key;this.positions={};
        const width=Math.max(240,this.port.clientWidth),columns=Math.max(1,Math.min(6,Math.floor(width/145))),cell=width/columns,depths={};
        function depth(id) { return depths[id]===undefined?(depths[id]=id==='0-0'?0:1+depth(Game.CONFIG.PRESTIGE.skills[id].requires||'0-0')):depths[id]; }
        const rows={};visible.forEach(function (id) { const d=depth(id);(rows[d]||(rows[d]=[])).push(id); });
        let top=document.getElementById('symmetry-placeholder').hidden?36:190;
        Object.keys(rows).sort(function (a,b) { return a-b; }).forEach(function (d) {
          const row=rows[d];row.sort(function (a,b) { const pa=tree.positions[Game.CONFIG.PRESTIGE.skills[a].requires||'0-0'],pb=tree.positions[Game.CONFIG.PRESTIGE.skills[b].requires||'0-0'];return (pa?pa[0]:0)-(pb?pb[0]:0)||a.localeCompare(b,undefined,{numeric:true}); });
          row.forEach(function (id,index) { const count=Math.min(columns,row.length-Math.floor(index/columns)*columns),offset=(width-count*cell)/2;tree.positions[id]=[offset+(index%columns+.5)*cell,top+Math.floor(index/columns)*151]; });
          top+=Math.ceil(row.length/columns)*151+24;
        });
        Object.entries(nodes).forEach(function (entry) {
          const id=entry[0],node=entry[1],position=tree.positions[id];node.hidden=!position;
          if(position) { node.style.left=position[0]+'px';node.style.top=position[1]+'px'; }
        });
        const height=top+90;
        this.world.style.setProperty('--node-width',Math.min(138,cell-14)+'px');
        this.world.style.width=width+'px';this.world.style.height=height+'px';
        const svg=document.getElementById('skill-map-links');svg.setAttribute('viewBox','0 0 '+width+' '+height);svg.style.width=width+'px';svg.style.height=height+'px';
        Object.entries(this.lines).forEach(function (entry) {
          const id=entry[0],line=entry[1],b=tree.positions[id],a=tree.positions[Game.CONFIG.PRESTIGE.skills[id].requires||'0-0'];line.style.display=b?'':'none';
          if(a&&b) { const start=a[1]+100,end=b[1]-17,y=(start+end)/2;line.setAttribute('d','M'+a[0]+','+start+' V'+y+' H'+b[0]+' V'+end); }
        });
        this.port.scrollLeft=0;
        if(nodes[Game.PrestigeUI.selected].hidden) Game.PrestigeUI.hideDetails();
      }
      if(this.entering || this.portWidth!==this.port.clientWidth) {
        this.entering=false;this.portWidth=this.port.clientWidth;this.port.scrollTop=0;
        this.port.scrollLeft=0;
      }
      Object.entries(this.lines).forEach(function (entry) { entry[1].classList.toggle('is-owned',Game.Progression.hasSkill(entry[0]));entry[1].classList.toggle('is-available',Game.Prestige.canBuySkill(entry[0])); });
    }
  };
})(window.CosmicIdle);
