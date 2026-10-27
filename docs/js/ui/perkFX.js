(function (Game) {
  Game.PerkFX = {
    clear: function () {
      clearTimeout(this.timer);
      if (this.layer) this.layer.replaceChildren();
      if (this.node) this.node.classList.remove("perk-awakened");this.node=null;
    },
    play: function (id) {
      Game.Audio.play("perk");
      if (!Game.player.settings.perkVisuals || document.hidden) return;
      this.clear();
      const node=Game.PrestigeUI.nodes[id];if (!node || !node.getClientRects().length) return;
      const r=node.getBoundingClientRect(), x=r.left+r.width/2, y=r.top+Math.min(22,r.height/2);
      if (!this.layer) {
        this.layer=document.createElement("div");this.layer.id="perk-effects";this.layer.setAttribute("aria-hidden","true");document.body.appendChild(this.layer);
      }
      this.node=node;node.classList.add("perk-awakened");
      const ring=document.createElement("span");ring.className="perk-purchase-ring";ring.style.left=x+"px";ring.style.top=y+"px";this.layer.appendChild(ring);
      for(let i=0;i<10;i++) {
        const angle=i*Math.PI*2/10, fleck=document.createElement("i");fleck.className="perk-purchase-fleck";fleck.style.left=x+"px";fleck.style.top=y+"px";
        fleck.style.setProperty("--dx",Math.cos(angle)*62+"px");fleck.style.setProperty("--dy",Math.sin(angle)*62+"px");this.layer.appendChild(fleck);
      }
      this.timer=setTimeout(function () { Game.PerkFX.clear(); },1100);
    }
  };
})(window.CosmicIdle);
