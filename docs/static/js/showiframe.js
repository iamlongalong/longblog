let allowSubs=["/archives/","/posts/","/categories/","/tags/"];let matchpath=window.location.pathname.match(/\/.*\//)||[];let firstPath=matchpath[0];if(allowSubs.includes(firstPath)&&self==top){let t=document.createElement("style");t.innerText=`.long-frame{width:500px;height:600px;border:none;position:absolute;z-index:9999;display:block;}.frame-on{display:block}`;let e=document.createElement("iframe");e.id="longframe";e.classList.add("long-frame");let l=document.getElementsByTagName("body")[0];l.append(t);l.append(e);runscript()}function runscript(){let e=document.getElementById("longframe");this.document.querySelectorAll("a").forEach(t=>{t.addEventListener("mouseover",t=>showInIframe(e,t))});this.document.onclick=function(t){if(e.style.display!="none"){}if(e.src!=""){e.style.height=0;e.style.width=0;e.style.display="none";e.src=""}}}function showInIframe(l,n){let t=n.target.href||"";if(!t){return}t=t.split("#")[0];if(t.trimStart().startsWith("http")){if(window.location.host==t.replace(/^(http|https):\/\//,"").split("/")[0]){l.style.display="block";if(l.src==t){return}l.onload=function(){if(l.src==""){return}let t=n.pageX;let e=n.pageY;l.style.top=e+30+"px";l.style.left=t+50+"px";l.style.width="500px";l.style.height="600px"};l.src=t}}}