(function (Game) {
  const positions = {
    "0-0":[675,64],
    "1-4-2":[290,590], "1-5-1":[290,730], "1-5-2":[180,730],
    "2-4-1":[400,590], "2-4-2":[510,590],
    "3-2-3":[730,730], "3-5-1":[840,730], "3-5-2":[950,730],
    "4-4-1":[1170,590], "4-4-2":[1280,590],
    "1-1":[180,200], "1-2":[180,325], "1-2-1":[70,450], "1-2-2":[70,590], "1-3-1":[180,450], "1-3-2":[290,450], "1-4-1":[180,590],
    "2-1":[510,200], "2-1-2":[400,325], "2-2":[510,325], "2-3-1":[400,450], "2-3-2":[510,450], "2-3-3":[620,450],
    "3-1":[840,200], "3-2":[840,325], "3-2-1":[730,450], "3-2-2":[730,590], "3-3":[950,450], "3-4-1":[840,590], "3-4-2":[950,590], "3-4-3":[1060,590],
    "4-1":[1170,200], "4-2":[1170,325], "4-3-1":[1060,450], "4-3-2":[1170,450], "4-3-3":[1280,450]
  };
  Game.TreeMap = {
    mode: null, lines: {},
    init: function () {
      this.port=document.getElementById("skill-map");this.world=document.getElementById("skill-map-world");
      const svg=document.getElementById("skill-map-links");
      Object.keys(positions).forEach(function (id) {
        if (id === "0-0") return;
        const parent=Game.CONFIG.PRESTIGE.skills[id].requires || "0-0", a=positions[parent], b=positions[id];
        const line=document.createElementNS("http://www.w3.org/2000/svg","path");
        // Orthogonal branches leave clear space for every node's text.
        const start=a[1]+87, end=b[1]-17, y=(start+end)/2;
        line.setAttribute("d","M"+a[0]+","+start+" V"+y+" H"+b[0]+" V"+end);
        line.dataset.to=id;svg.appendChild(line);Game.TreeMap.lines[id]=line;
      });
      for (const mode of ["2d","3d"]) document.getElementById("tree-view-"+mode).addEventListener("click",function () {
        Game.player.ui.skillTree2D=Number(mode === "2d");Game.PrestigeUI.hideDetails();Game.TreeMap.syncMode();Game.Save.save();Game.UI.render();
      });
      this.port.addEventListener("keydown",function (event) {
        const id=event.target.dataset.skill;if (!id || !event.key.startsWith("Arrow")) return;
        event.preventDefault();const current=positions[id], horizontal=event.key==="ArrowLeft" || event.key==="ArrowRight", sign=event.key==="ArrowLeft" || event.key==="ArrowUp" ? -1 : 1;
        const target=Object.keys(positions).filter(function (key) { return (positions[key][horizontal?0:1]-current[horizontal?0:1])*sign>1; }).sort(function (a,b) {
          const score=function (key) { return Math.abs(positions[key][horizontal?0:1]-current[horizontal?0:1])+Math.abs(positions[key][horizontal?1:0]-current[horizontal?1:0])*3; };return score(a)-score(b);
        })[0];
        if (target) Game.PrestigeUI.nodes[target].focus();
      });
      this.syncMode();
    },
    syncMode: function () {
      const flat=Boolean(Game.player.ui.skillTree2D);
      if (this.mode===flat || !this.port) return;this.mode=flat;
      Game.TreeCamera.setActive(false);
      document.getElementById("skill-tree").hidden=flat;this.port.hidden=!flat;
      document.getElementById("tree-view-2d").setAttribute("aria-pressed",String(flat));
      document.getElementById("tree-view-3d").setAttribute("aria-pressed",String(!flat));
      document.getElementById("tree-view-help").textContent=flat?"Scroll to explore · Hover for details · Select a node to unlock":"Drag to orbit · Shift / right-drag to pan · Scroll or pinch to zoom";
      const world=flat?this.world:document.getElementById("skill-world");
      (flat?this.world:document.getElementById("skill-tree")).appendChild(document.getElementById("symmetry-placeholder"));
      Object.entries(Game.PrestigeUI.nodes).forEach(function (entry) {
        const id=entry[0], node=entry[1];node.hidden=false;node.style.removeProperty("left");node.style.removeProperty("top");node.style.removeProperty("z-index");
        world.appendChild(node);
        if (flat) { node.style.left=positions[id][0]+"px";node.style.top=positions[id][1]+"px"; }
      });
      Game.TreeCamera.labelLayoutKey=null;
      if (!flat && !document.getElementById("prestige-view").hidden) Game.TreeCamera.setActive(true);
      if (flat) this.updateState();
    },
    updateState: function () {
      Object.entries(this.lines).forEach(function (entry) {
        const id=entry[0], line=entry[1];line.classList.toggle("is-owned",Game.Progression.hasSkill(id));line.classList.toggle("is-available",Game.Prestige.canBuySkill(id));
      });
    }
  };
})(window.CosmicIdle);

