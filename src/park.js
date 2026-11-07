(function () {
  'use strict';
  window.createPark = function createPark(ctx) {
    const T = ctx.THREE, C = ctx.colors, group = new T.Group();
    group.name = 'Cinderpine floating fairground'; ctx.scene.add(group);
    let seed = 81457;
    const rand = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
    const color = n => new T.Color(n);
    const opaque = [], glow = [], waterPieces = [], dummy = new T.Object3D();
    const boxGeo = new T.BoxGeometry(1, 1, 1), cylGeo = new T.CylinderGeometry(1,1,1,8), coneGeo = new T.ConeGeometry(1,1,8);
    const v = (x,y,z) => new T.Vector3(x,y,z);
    function collect(geo, pos, scale, hex, rot, list) {
      const g = geo.index ? geo.toNonIndexed() : geo.clone();
      dummy.position.copy(pos); dummy.scale.copy(scale); dummy.rotation.set(rot ? rot[0] : 0, rot ? rot[1] : 0, rot ? rot[2] : 0); dummy.updateMatrix();
      g.applyMatrix4(dummy.matrix); const a = g.attributes.position.count, col = color(hex), data = new Float32Array(a * 3);
      for(let i=0;i<a;i++){ data[i*3]=col.r; data[i*3+1]=col.g; data[i*3+2]=col.b; }
      g.setAttribute('color',new T.BufferAttribute(data,3)); (list || opaque).push(g);
    }
    function box(x,y,z,w,h,d,c,rot,list){collect(boxGeo,v(x,y,z),v(w,h,d),c,rot,list);}
    function cylinder(x,y,z,r,h,c,rot,list){collect(cylGeo,v(x,y,z),v(r,h,r),c,rot,list);}
    function cone(x,y,z,r,h,c,rot){collect(coneGeo,v(x,y,z),v(r,h,r),c,rot);}
    function beam(a,b,width,c,list){
      const d=b.clone().sub(a), o=new T.Object3D();o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(v(0,1,0),d.clone().normalize());o.scale.set(width,d.length(),width);o.updateMatrix();
      const g=boxGeo.toNonIndexed();g.applyMatrix4(o.matrix);const col=color(c),data=new Float32Array(g.attributes.position.count*3);for(let i=0;i<data.length;i+=3){data[i]=col.r;data[i+1]=col.g;data[i+2]=col.b;}g.setAttribute('color',new T.BufferAttribute(data,3));(list||opaque).push(g);
    }
    function merge(list, material, parent) {
      if(!list.length)return null; let n=0;list.forEach(g=>n+=g.attributes.position.count);const p=new Float32Array(n*3),no=new Float32Array(n*3),c=new Float32Array(n*3);let off=0;
      list.forEach(g=>{p.set(g.attributes.position.array,off);no.set(g.attributes.normal.array,off);c.set(g.attributes.color.array,off);off+=g.attributes.position.array.length;g.dispose();});
      const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(p,3));g.setAttribute('normal',new T.BufferAttribute(no,3));g.setAttribute('color',new T.BufferAttribute(c,3));g.computeBoundingSphere();const m=new T.Mesh(g,material);(parent||group).add(m);return m;
    }
    const staticMat=new T.MeshLambertMaterial({vertexColors:true});
    const glowMat=new T.MeshBasicMaterial({vertexColors:true});
    const glowMeshMat=new T.MeshLambertMaterial({vertexColors:true,emissive:C.brass,emissiveIntensity:0});
    // The top is a clipped octagon; lower strata taper into a floating, faceted plum cliff.
    const outline=[[-41,-32],[39,-32],[48,-23],[48,40],[39,51],[-38,51],[-48,40],[-48,-23]];
    const poly=[];
    for(let i=0;i<outline.length;i++){const a=outline[i],b=outline[(i+1)%outline.length];for(let j=0;j<4;j++){const t=j/4;poly.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}}
    const islandP=[],islandC=[];function tri(a,b,c,hex){const co=color(hex);[a,b,c].forEach(p=>{islandP.push(...p);islandC.push(co.r,co.g,co.b);});}
    for(let i=0;i<poly.length;i++){
      const a=poly[i],b=poly[(i+1)%poly.length],midx=(a[0]+b[0])*.5,midz=(a[1]+b[1])*.5;
      tri([0,0,8],[b[0],0,b[1]],[a[0],0,a[1]],i%3?C.grass:0xb1a66b);
      const a0=[a[0],-.12,a[1]],b0=[b[0],-.12,b[1]],a1=[a[0]*.985,-1.1,a[1]*.985],b1=[b[0]*.985,-1.1,b[1]*.985];
      tri(a0,b0,a1,C.grassDark);tri(b0,b1,a1,C.grassDark);
      const a2=[a[0]*.94,-5.2-rand()*1.5,a[1]*.94],b2=[b[0]*.94,-5.2-rand()*1.5,b[1]*.94],a3=[a[0]*.81,-8.3-rand()*1.1,a[1]*.81],b3=[b[0]*.81,-8.3-rand()*1.1,b[1]*.81];
      const shades=[C.plum,C.rock,0x664d60,0x876478,0x59485b];tri(a1,b1,a2,shades[i%5]);tri(b1,b2,a2,shades[(i+1)%5]);tri(a2,b2,a3,shades[(i+3)%5]);tri(b2,b3,a3,shades[(i+2)%5]);tri(a3,b3,[0,-10,8],C.plum);
      if(i%2===0)box(midx*.99,-1.0,midz*.99,2,.8,.55,0x9b786a,[0,Math.atan2(b[0]-a[0],b[1]-a[1]),0]);
    }
    const islandG=new T.BufferGeometry();islandG.setAttribute('position',new T.Float32BufferAttribute(islandP,3));islandG.setAttribute('color',new T.Float32BufferAttribute(islandC,3));islandG.computeVertexNormals();group.add(new T.Mesh(islandG,staticMat));
    // Worn cream paths, grass flecks, occasional fallen leaves.
    box(0,.035,32,84,.07,6.5,0xd5c18e);box(0,.04,41,7,.08,15,0xd5c18e);box(0,.045,43,72,.075,4,0xcbbb8a);
    box(-42,.04,7,3,.08,52,0xc5b782);box(43,.04,8,3,.08,53,0xc5b782);
    for(let i=0;i<330;i++){let x=rand()*91-45.5,z=rand()*77-29;if((z>28&&z<46)||(x>40)||(x< -40))continue;box(x,.035,z,.15+rand()*.7,.04,.2+rand()*.6,i%3?0xa69c60:0xc4b570,[0,rand()*3,0]);}
    for(let i=0;i<85;i++){const x=rand()*78-39,z=28+rand()*18;box(x,.11,z,.19,.045,.15,[C.orange,C.leafRed,C.yellow][i%3],[0,rand()*6,0]);}
    function label(text,x,y,z,w,h,bg,fg,ry){
      const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const c=canvas.getContext('2d');c.fillStyle=bg;c.fillRect(0,0,512,128);c.strokeStyle=fg;c.lineWidth=6;c.strokeRect(10,10,492,108);c.fillStyle=fg;c.font='bold 43px Georgia, serif';c.textAlign='center';c.textBaseline='middle';c.fillText(text,256,67,474);const tex=new T.CanvasTexture(canvas);tex.magFilter=T.NearestFilter;tex.minFilter=T.LinearFilter;const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide}));m.position.set(x,y,z);m.rotation.y=ry||0;group.add(m);return m;
    }
    // Entrance, two ticket huts and chequered brick plaza.
    for(const x of [-7.2,7.2]){box(x,2.2,46,.65,4.4,.65,C.brick);box(x,4.45,46,.95,.3,.95,C.brass);cone(x,4.9,46,.6,.7,C.cherry);}
    beam(v(-7.1,4.15,46),v(7.1,4.15,46),.4,C.timber);label('CINDER PINE',0,4.7,46.16,12,1.5,'#8e343d','#ffedbd');
    label('FAIRGROUND  •  EST. 1987',0,3.55,46.2,8,.6,'#ffedbd','#5b465b');
    for(const x of [-10,10]){box(x,1.2,46,3,2.4,2.5,C.brick);box(x,1.7,47.28,1.7,1,.08,C.dark);box(x,1.65,47.34,1.2,.65,.06,C.brass,null,glow);cone(x,3,46,2.3,1.3,C.cherry);label('TICKETS',x,2.35,47.3,2,.45,'#ffedbd','#8e343d');}
    for(let i=-5;i<=5;i++){box(i*1.1,.12,47.5,.88,.11,1.3,i%2?C.brick:C.cream);}
    // Six striped stalls have deep counter shadows, awnings and products.
    const stalls=[[-23,35,C.cherry,'CANDY'],[-14,35,C.teal,'CIDER'],[10,35,C.orange,'PIES'],[19,35,C.cherry,'POPCORN'],[-18,45,C.yellow,'SOUVENIRS'],[20,45,C.teal,'ARCADE']];
    for(const [x,z,tint,title] of stalls){
      box(x,1.25,z,5.1,2.5,3,C.cream);box(x,1.65,z+1.53,4.3,1.35,.1,C.dark);box(x,.9,z+1.72,4.7,.28,.7,tint);box(x,.42,z+1.55,4.7,.75,.17,tint);
      for(let i=0;i<8;i++){box(x-2.6+(i+.5)*.65,2.78,z+.3,.65,.18,4,i%2?C.cream:tint,[.12,0,0]);box(x-2.6+(i+.5)*.65,2.53,z+2.28,.65,.45,.08,i%2?C.cream:tint);}
      for(const dx of [-2.4,2.4])box(x+dx,1.48,z+2.16,.12,2.96,.12,C.timber);
      for(let i=0;i<5;i++)box(x-1.6+i*.8,1.25,z+1.6,.3,.4+(i%2)*.18,.25,[C.brass,C.cherry,C.orange][i%3]);
      label(title,x,2.1,z+1.62,3.7,.52,'#ffedbd','#5b465b');
    }
    // Cafe on the western verge, pitched roof, chimney and luminous windows.
    box(-42,2.2,22,7.5,4.4,7,C.brick);box(-42,1.2,25.56,1.7,2.4,.12,C.timber);
    for(const x of [-44.4,-39.6]){box(x,2.3,25.56,1.6,1.6,.12,C.dark);box(x,2.3,25.64,1.3,1.3,.05,C.brass,null,glow);box(x,2.3,25.7,.12,1.4,.08,C.timber);box(x,2.3,25.7,1.4,.12,.08,C.timber);}
    box(-44,4.8,22,4.5,.35,8,C.cherry,[0,0,-.5]);box(-40,4.8,22,4.5,.35,8,C.cherry,[0,0,.5]);box(-43,5.9,20,1,2,1,C.brick);
    label('THE COPPER KETTLE',-42,3.9,25.65,6.8,.65,'#ffedbd','#8e343d');
    // Tables and benches are paired with the sitting/eating guests below.
    const seats=[];
    function bench(x,z,ry){const s=Math.sin(ry),c=Math.cos(ry);box(x,.65,z,2.4,.18,.75,C.timber,[0,ry,0]);box(x+s*.37,1.13,z+c*.37,2.4,.65,.14,C.timber,[0,ry,0]);for(const d of [-.9,.9])box(x+c*d,.33,z-s*d,.17,.65,.58,C.dark);seats.push({x,z,ry});}
    bench(-8,28.3,0);bench(8,28.3,0);bench(-8,40,Math.PI);bench(8,40,Math.PI);bench(25,42,0);bench(-25,43,0);bench(-39,30,Math.PI/2);bench(41,27,-Math.PI/2);
    for(const [x,z] of [[-40,29],[-35,28],[-33,44],[29,46]]){cylinder(x,.8,z,1.15,.15,C.brass);cylinder(x,.4,z,.12,.8,C.dark);for(let j=0;j<3;j++){const a=j*Math.PI*2/3;cylinder(x+Math.cos(a)*1.65,.42,z+Math.sin(a)*1.65,.45,.15,C.cherry);box(x+Math.cos(a)*1.65,.2,z+Math.sin(a)*1.65,.15,.4,.15,C.timber);}}
    // Fountain: concentric stepped stone basin and a little brass pine finial.
    cylinder(0,.28,33,3.1,.55,C.plum);cylinder(0,.6,33,2.8,.3,C.cream);cylinder(0,.78,33,2.53,.06,C.water,null,waterPieces);cylinder(0,1.4,33,.36,1.4,C.plum);cylinder(0,2.1,33,1.28,.22,C.cream);cylinder(0,2.23,33,1.05,.05,C.water,null,waterPieces);cone(0,2.9,33,.55,1.1,C.brass);
    const drops=new T.InstancedMesh(new T.BoxGeometry(.11,.2,.11),new T.MeshBasicMaterial({color:0xd9e3bd}),40);drops.instanceMatrix.setUsage(T.DynamicDrawUsage);group.add(drops);
    // Switchback queue rails beside the main platform.
    for(let lane=0;lane<4;lane++){const z=25.7+lane*1.1;beam(v(-26,.85,z),v(-12,.85,z),.09,C.brass);for(let j=0;j<8;j++)box(-26+j*2,.45,z,.12,.9,.12,C.timber);if(lane<3)beam(v(lane%2?-26:-12,.85,z),v(lane%2?-26:-12,.85,z+1.1),.09,C.brass);}
    // Decorative bunting spans the busy midway; flags are solid triangles.
    function bunting(x1,z1,x2,z2,height){beam(v(x1,0,z1),v(x1,height+.5,z1),.16,C.timber);beam(v(x2,0,z2),v(x2,height+.5,z2),.16,C.timber);let prev=v(x1,height,z1);for(let i=1;i<=22;i++){const t=i/22,p=v(x1+(x2-x1)*t,height-Math.sin(t*Math.PI)*.9,z1+(z2-z1)*t);beam(prev,p,.035,C.dark);const mid=prev.clone().add(p).multiplyScalar(.5),dir=p.clone().sub(prev).normalize().multiplyScalar(.35);const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([...mid.clone().sub(dir).toArray(),...mid.clone().add(dir).toArray(),mid.x,mid.y-.65,mid.z],3));g.computeVertexNormals();collect(g,v(0,0,0),v(1,1,1),[C.cherry,C.brass,C.teal,C.orange][i%4],null,opaque);g.dispose();prev=p;}}
    bunting(-30,31,28,31,5.2);bunting(-16,42,16,42,4.6);
    // Autumn trees and layered evergreens, all batched into the static park mesh.
    function tree(x,z,r){const h=3.5+r*3;box(x,h*.38,z,.44,h*.76,.45,C.timber);if(r>.68){cone(x,h*.72,z,2.2,h*.75,0x587368);cone(x,h*.98,z,1.7,h*.65,0x697b63);cone(x,h*1.2,z,1.1,h*.55,0x7e885b);}else{const leaf=[C.orange,C.yellow,C.leafRed,0xcb954f][Math.floor(r*6)%4];box(x,h*.73,z,3.3,2.6,3.1,leaf,[0,.2,0]);box(x-.8,h*.95,z+.1,2.3,1.9,2.5,leaf,[0,-.18,0]);box(x+.6,h*.95,z-.6,1.8,1.6,1.8,0xe0a451);box(x+.2,h*1.1,z,1.8,1.5,1.9,leaf);}}
    for(let i=0;i<18;i++)tree(-43+i*5.1,-28,rand());
    for(let i=0;i<11;i++){const z=-20+i*5.7;tree(-45,z,rand());if(i<8)tree(45,z,rand());}
    [[-39,42],[-31,47],[-27,47],[31,48],[39,45],[43,39],[-36,29],[-5,46],[5,46],[38,16],[-37,15],[-39,-14],[38,-13]].forEach(p=>tree(p[0],p[1],rand()));
    // Sparse tufts and pumpkins at the entry and attractions.
    for(const [x,z] of [[-8,47],[8,47],[-28,42],[27,39],[-36,30],[37,28],[-37,45]]){for(let j=0;j<3;j++){cylinder(x+j*.55,.35,z+(j%2)*.45,.38,.62,C.orange);box(x+j*.55,.72,z+(j%2)*.45,.1,.2,.1,C.timber);} }
    // Low perimeter fence on the public edge.
    for(let i=-35;i<=35;i+=3){box(i,.8,49,.12,1.6,.12,C.timber);beam(v(i,1.1,49),v(i+3,1.1,49),.1,C.cream);beam(v(i,.5,49),v(i+3,.5,49),.1,C.cream);}
    // Ferris wheel: rotating rim and spokes, gondolas remain upright.
    const wheelRoot=new T.Group();wheelRoot.position.set(32,10,34);group.add(wheelRoot);const wheel=new T.Group();wheelRoot.add(wheel);const wheelStatic=[];
    for(const z of [32.4,35.6]){beam(v(27,0,z),v(32,10,z),.38,C.cream);beam(v(37,0,z),v(32,10,z),.38,C.cream);beam(v(27,.4,z),v(37,.4,z),.3,C.cherry);}
    cylinder(32,10,34,.5,4,C.brass,[Math.PI/2,0,0]);
    const rr=7.8;const wmat=new T.MeshLambertMaterial({color:C.cherry});const rim=new T.Mesh(new T.TorusGeometry(rr,.19,4,48),wmat);wheel.add(rim);const rim2=rim.clone();rim2.position.z=-.55;wheel.add(rim2);
    const spokes=[];for(let i=0;i<12;i++){const a=i*Math.PI/6,d=v(Math.cos(a)*rr,Math.sin(a)*rr,0);beam(v(0,0,0),d,.105,C.brass,spokes);}merge(spokes,staticMat,wheel);
    const gondolas=[];for(let i=0;i<12;i++){const g=new T.Group(),parts=[];box(0,-.5,0,1.5,.8,1.4,[C.cherry,C.teal,C.orange][i%3],null,parts);box(0,.3,0,1.65,.14,1.55,C.cream,null,parts);for(const x of [-.65,.65])box(x,0,0,.09,.75,1.2,C.brass,null,parts);merge(parts,staticMat,g);wheelRoot.add(g);gondolas.push(g);}
    label('THE HARVEST WHEEL',32,2,36.1,9,.8,'#ffedbd','#8e343d');
    // Carousel canopy is striped, with a slow ring of carved horses.
    const carousel=new T.Group();carousel.position.set(-31,.35,36);group.add(carousel);const carouselParts=[];
    cylinder(-31,.22,36,5.4,.4,C.plum);cylinder(-31,.5,36,5,.3,C.brass);cylinder(-31,2.4,36,.65,4,C.cherry);cone(-31,5.1,36,5.65,2.5,C.cherry);
    for(let i=0;i<12;i++){const a=i*Math.PI/6, b=(i+1)*Math.PI/6;const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([-31,6.35,36,-31+Math.cos(a)*5.65,3.85,36+Math.sin(a)*5.65,-31+Math.cos(b)*5.65,3.85,36+Math.sin(b)*5.65],3));g.computeVertexNormals();collect(g,v(0,0,0),v(1,1,1),i%2?C.cream:C.cherry);g.dispose();}
    cone(-31,6.7,36,.28,.85,C.brass);const horses=[];
    for(let i=0;i<8;i++){const a=i*Math.PI/4, horse=new T.Group(),hp=[];horse.position.set(Math.cos(a)*3.4,0,Math.sin(a)*3.4);horse.rotation.y=-a;box(0,2,0,.08,3.3,.08,C.brass,null,hp);box(0,1.3,0,.65,.55,1.4,C.cream,null,hp);box(0,1.75,.65,.5,.8,.4,C.cream,[.35,0,0],hp);box(0,2.08,.79,.5,.35,.65,C.cream,null,hp);box(0,1.65,-.1,.7,.18,.6,[C.cherry,C.teal][i%2],null,hp);for(const x of [-.23,.23])for(const z of [-.48,.4])box(x,.83,z,.15,.7,.16,C.timber,[.2,0,0],hp);merge(hp,staticMat,horse);carousel.add(horse);horses.push(horse);}
    // Tunnel portals are hollow arches, following the authored mine-track frames.
    const mine=ctx.tracks.find(t=>t.id==='mine');if(mine){const ts=mine.samples.filter(s=>s.section==='tunnel');for(let i=0;i<ts.length;i+=6){const f=ts[i],p=f.p,side=f.right||v(1,0,0);for(const sign of [-1,1]){const q=p.clone().addScaledVector(side,sign*3.05);box(q.x,Math.max(1.8,p.y*.5+1.4),q.z,1.4,Math.max(3.6,p.y+2.8),2.5,C.rock,[0,Math.atan2(f.tangent.x,f.tangent.z),0]);}const roof=p.clone().add(v(0,3.6,0));box(roof.x,roof.y,roof.z,6.6,1.3,2.9,C.plum,[0,Math.atan2(f.tangent.x,f.tangent.z),0]);if(i%12===0)box(roof.x,roof.y+1.3,roof.z,4.5,1.5,2.4,C.rock,[0,.15,0]);}}
    // Lamps use emissive geometry plus four bounded point-light slots.
    const lampPositions=[[-28,31],[-18,40],[-7,31],[7,31],[18,40],[28,31],[-5,44],[5,44],[41,19],[-40,12],[-37,41],[37,41]];
    lampPositions.forEach(([x,z])=>{cylinder(x,1.8,z,.095,3.6,C.dark);box(x,3.65,z,.7,.12,.7,C.dark);box(x,3.3,z,.43,.55,.43,C.cream,null,glow);cone(x,4,z,.52,.58,C.dark);cylinder(x,.12,z,.35,.24,C.plum);});
    const lights=[];for(const [x,y,z] of [[0,7,34],[-40,5,25],[32,10,34],[0,6,46]]){const l=new T.PointLight(0xffc477,0,23,2);l.position.set(x,y,z);group.add(l);lights.push(l);}
    const glowMesh=merge(glow,glowMeshMat);merge(opaque,staticMat);merge(waterPieces,new T.MeshLambertMaterial({vertexColors:true,emissive:0x163d40,emissiveIntensity:.25}));
    // 140 guests, with separately instanced torsos, heads, legs and animated arms.
    const peopleCount=140, bodyMat=new T.MeshLambertMaterial({vertexColors:false});
    const bodies=new T.InstancedMesh(boxGeo,bodyMat,peopleCount),heads=new T.InstancedMesh(boxGeo,bodyMat,peopleCount),legs=new T.InstancedMesh(boxGeo,bodyMat,peopleCount*2),arms=new T.InstancedMesh(boxGeo,bodyMat,peopleCount*2);
    [bodies,heads,legs,arms].forEach(m=>{m.instanceMatrix.setUsage(T.DynamicDrawUsage);m.frustumCulled=false;group.add(m);});
    const clothes=[C.cherry,C.teal,C.cream,C.orange,0x687c92,0x8b6380,C.brass,0x4c6255],skins=[0xe5b388,0xb68161,0x875a46,0xf3caa4];const guests=[];
    for(let i=0;i<peopleCount;i++){
      const behavior=i<28?'queue':i<44?'sit':i<59?'eat':'stroll';let x,z,ry=0;
      if(behavior==='queue'){const lane=Math.floor(i/7);x=-24.8+(i%7)*1.8;z=26.15+lane*1.1;ry=lane%2?-Math.PI/2:Math.PI/2;}
      else if(behavior==='sit'){const s=seats[(i-28)>>1];x=s.x+((i%2)-.5)*1.05;z=s.z;ry=s.ry;}
      else if(behavior==='eat'){x=-23+(i-44)*3.2;z=38.5+(i%3)*.6;ry=rand()*6.28;}
      else{x=rand()*78-39;z=30+rand()*14;}
      guests.push({x,z,ry,behavior,phase:rand()*6.28,speed:.27+rand()*.35,path:rand(),scale:.78+rand()*.28});
      bodies.setColorAt(i,color(clothes[i%clothes.length]));heads.setColorAt(i,color(skins[i%skins.length]));for(let j=0;j<2;j++){legs.setColorAt(i*2+j,color(i%3?C.dark:C.timber));arms.setColorAt(i*2+j,color(clothes[i%clothes.length]));}
    }
    function instance(mesh,i,x,y,z,sx,sy,sz,ry,rz){dummy.position.set(x,y,z);dummy.rotation.set(0,ry||0,rz||0);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}
    // Floating leaf sprites and fireworks share small instanced buffers.
    const leaves=new T.InstancedMesh(boxGeo,new T.MeshLambertMaterial({}),90);leaves.instanceMatrix.setUsage(T.DynamicDrawUsage);leaves.frustumCulled=false;group.add(leaves);const leafData=[];
    for(let i=0;i<90;i++){leaves.setColorAt(i,color([C.orange,C.yellow,C.leafRed][i%3]));leafData.push({x:rand()*87-43.5,z:rand()*73-26,y:rand()*9,p:rand()*6.28});}
    const fireMat=new T.MeshBasicMaterial({vertexColors:false});const fireworks=new T.InstancedMesh(boxGeo,fireMat,160);fireworks.instanceMatrix.setUsage(T.DynamicDrawUsage);fireworks.frustumCulled=false;group.add(fireworks);const sparks=Array.from({length:160},()=>({active:false}));let sparkCursor=0,nextFirework=4,mode='day';
    function burst(time){const x=rand()*66-33,y=23+rand()*12,z=-20+rand()*19,c=[C.cherry,C.brass,0xe8e3c0,0x86b3aa][Math.floor(rand()*4)];for(let j=0;j<40;j++){const a=rand()*Math.PI*2,u=rand()*2-1,r=Math.sqrt(1-u*u),speed=3+rand()*5,s=sparks[sparkCursor];Object.assign(s,{active:true,x,y,z,vx:Math.cos(a)*r*speed,vy:u*speed,vz:Math.sin(a)*r*speed,birth:time,life:1.4+rand()*.9});fireworks.setColorAt(sparkCursor,color(c));sparkCursor=(sparkCursor+1)%sparks.length;}if(fireworks.instanceColor)fireworks.instanceColor.needsUpdate=true;ctx.emit('firework',{position:v(x,y,z)});}
    function setDay(day){mode=day;const n=day==='night'?1:day==='dusk'?.55:0;lights.forEach((l,i)=>l.intensity=n*(i===1?1.4:1.1));glowMeshMat.emissiveIntensity=n*.9;fireworks.visible=day==='night';}
    function update(dt,time,rides,selectedIndex,dayMode){
      if(dayMode&&dayMode!==mode)setDay(dayMode);
      const angle=time*.075;wheel.rotation.z=angle;for(let i=0;i<gondolas.length;i++){const a=angle+i*Math.PI/6;gondolas[i].position.set(Math.cos(a)*rr,Math.sin(a)*rr,0);}
      carousel.rotation.y=time*.13;horses.forEach((h,i)=>h.position.y=Math.sin(time*1.4+i)*.12);
      for(let i=0;i<40;i++){const a=i/40*Math.PI*2,p=(time*.67+i*.17)%1,r=.45+p*1.8;instance(drops,i,Math.cos(a)*r,2.35+Math.sin(p*Math.PI)*1.2-p*1.6,33+Math.sin(a)*r,.1,.18,.1,0,0);}drops.instanceMatrix.needsUpdate=true;
      for(let i=0;i<peopleCount;i++){
        const g=guests[i],walk=g.behavior==='stroll';let x=g.x,z=g.z,ry=g.ry;
        if(walk){const p=(g.path+time*g.speed*.005)%1,l=p*4;if(l<1){x=-38+l*76;z=31;ry=Math.PI/2;}else if(l<2){x=38;z=31+(l-1)*12;ry=0;}else if(l<3){x=38-(l-2)*76;z=43;ry=-Math.PI/2;}else{x=-38;z=43-(l-3)*12;ry=Math.PI;}z+=Math.sin(g.phase)*.8;x+=Math.cos(g.phase)*.6;}
        const s=g.scale,sit=g.behavior==='sit',bob=walk?Math.abs(Math.sin(time*4*g.speed+g.phase))*.055:0,y=(sit?.42:.65)*s+bob;
        let cheering=false;for(const ride of rides){if(ride.speed>5&&ride.position&&Math.hypot(ride.position.x-x,ride.position.z-z)<12){cheering=true;break;}}
        instance(bodies,i,x,y,z,.42*s,.55*s,.3*s,ry,0);instance(heads,i,x,y+.47*s,z,.32*s,.32*s,.32*s,ry,0);
        for(let j=0;j<2;j++){const side=j?1:-1,dx=Math.cos(ry)*side*.15*s,dz=-Math.sin(ry)*side*.15*s,swing=walk?Math.sin(time*5*g.speed+g.phase+j*Math.PI)*.12:0;
          instance(legs,i*2+j,x+dx,y-.43*s,z+dz+(sit?.25:0),.16*s,(sit?.24:.43)*s,.18*s,ry,swing);
          const armUp=cheering?side*-.72:g.behavior==='eat'&&j===1?-.75:side*.12;instance(arms,i*2+j,x+dx*1.9,y+(cheering?.28:.0)*s,z+dz*1.9,.12*s,.5*s,.14*s,ry,armUp);
        }
      }
      [bodies,heads,legs,arms].forEach(m=>m.instanceMatrix.needsUpdate=true);
      leafData.forEach((l,i)=>{const y=9-((time*.55+l.y)%9),x=l.x+Math.sin(time*.5+l.p)*1.3,z=l.z+Math.cos(time*.4+l.p);instance(leaves,i,x,y,z,.2,.04,.12,time+l.p,Math.sin(time+l.p));});leaves.instanceMatrix.needsUpdate=true;
      if(mode==='night'&&time>nextFirework){burst(time);nextFirework=time+2.6+rand()*2.2;}
      for(let i=0;i<sparks.length;i++){const s=sparks[i],age=time-(s.birth||0);if(s.active&&age<s.life&&mode==='night'){const scale=.17*(1-age/s.life)+.04;instance(fireworks,i,s.x+s.vx*age,s.y+s.vy*age-2.2*age*age,s.z+s.vz*age,scale,scale,scale,0,0);}else{instance(fireworks,i,0,-100,0,0,0,0,0,0);s.active=false;}}fireworks.instanceMatrix.needsUpdate=true;
    }
    setDay('day');update(0,0,[],0,'day');
    return {group,update,setDay,guestCount:peopleCount,lights};
  };
})();
