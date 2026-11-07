(function () {
  'use strict';
  window.createRails = function createRails(ctx) {
    const T = ctx.THREE, C = ctx.colors, group = new T.Group();
    group.name = 'Rails, stations and rolling stock';
    ctx.scene.add(group);
    const cube = new T.BoxGeometry(1, 1, 1);
    const temp = new T.Object3D(), v = new T.Vector3(), axisY = new T.Vector3(0,1,0);
    const scratchM = new T.Matrix4(), scratchQ = new T.Quaternion();
    const materials = {}, batches = {}, glows = [], gateSets = [], liftDogs = [];
    const color = key => typeof key === 'number' ? key : C[key];
    function material(key, emissive) {
      const id = key + ':' + (emissive || 0);
      if (!materials[id]) materials[id] = new T.MeshLambertMaterial({color: color(key), emissive: emissive ? color(key) : 0, emissiveIntensity: emissive || 0});
      return materials[id];
    }
    function box(key, p, scale, q) {
      const id = String(key);
      if (!batches[id]) batches[id] = {key, entries:[]};
      temp.position.copy(p); temp.scale.set(scale[0],scale[1],scale[2]); temp.quaternion.copy(q || new T.Quaternion()); temp.updateMatrix();
      batches[id].entries.push(temp.matrix.clone());
    }
    function beam(key, a, b, width, depth) {
      v.subVectors(b,a); const len=v.length(); if(len<0.001)return;
      temp.position.addVectors(a,b).multiplyScalar(.5); temp.quaternion.setFromUnitVectors(axisY,v.divideScalar(len)); temp.scale.set(width,len,depth||width); temp.updateMatrix();
      const id=String(key); if(!batches[id])batches[id]={key,entries:[]}; batches[id].entries.push(temp.matrix.clone());
    }
    function at(f, x, y, z) { return f.p.clone().addScaledVector(f.right,x).addScaledVector(f.up,y).addScaledVector(f.tangent,z||0); }
    function plainFrame(track) {
      const forward=track.station.forward.clone().setY(0).normalize(), right=new T.Vector3().crossVectors(axisY,forward).normalize();
      return {p:track.station.position.clone(),tangent:forward,right,up:axisY,q:new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(right,axisY,forward))};
    }
    function railsGeometry(track) {
      const positions=[],normals=[];
      function vert(p,n){positions.push(p.x,p.y,p.z);normals.push(n.x,n.y,n.z);}
      function quad(a,b,c,d,n){vert(a,n);vert(b,n);vert(c,n);vert(a,n);vert(c,n);vert(d,n);}
      const ss=track.samples;
      for(let i=0;i<ss.length;i++) {
        const a=ss[i],b=ss[(i+1)%ss.length];
        if(a.p.distanceTo(b.p)>2)continue;
        for(const side of [-1,1]) {
          const x=side*.61, h=.085, w=track.type==='wood'?.09:.085;
          const aa=[at(a,x-w,-h),at(a,x+w,-h),at(a,x+w,h),at(a,x-w,h)], bb=[at(b,x-w,-h),at(b,x+w,-h),at(b,x+w,h),at(b,x-w,h)];
          quad(aa[0],bb[0],bb[1],aa[1],a.up.clone().negate());
          quad(aa[1],bb[1],bb[2],aa[2],a.right);
          quad(aa[2],bb[2],bb[3],aa[3],a.up);
          quad(aa[3],bb[3],bb[0],aa[0],a.right.clone().negate());
        }
      }
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geo.computeBoundingSphere();
      return geo;
    }
    function label(text, width, height, ink, paper) {
      const canvas=document.createElement('canvas'); canvas.width=512;canvas.height=128;
      const c=canvas.getContext('2d'); c.fillStyle=paper;c.fillRect(0,0,512,128);c.strokeStyle=ink;c.lineWidth=5;c.strokeRect(9,9,494,110);
      c.font='bold 44px Georgia, serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle=ink;c.fillText(text.toUpperCase(),256,66,464);
      const tex=new T.CanvasTexture(canvas);tex.magFilter=T.NearestFilter;tex.minFilter=T.LinearFilter;
      const mat=new T.MeshBasicMaterial({map:tex,side:T.DoubleSide});
      return new T.Mesh(new T.PlaneGeometry(width,height),mat);
    }
    ctx.tracks.forEach((track,index)=>{
      const railsMat=material(track.type==='wood'?'cream':track.color);
      const rails=new T.Mesh(railsGeometry(track),railsMat);rails.name=track.name+' rails';group.add(rails);
      const tieMat=track.type==='wood'?'timber':track.type==='mine'?'timber':'steel';
      for(let s=0;s<track.length;s+=1.1){const f=track.sample(s);box(tieMat,at(f,0,-.17),[1.7,.17,.24],f.q);}
      const step=track.type==='wood'?3.7:track.type==='steel'?5.5:5;
      for(let s=1;s<track.length;s+=step){
        const f=track.sample(s);if(f.p.y<.7||f.section==='tunnel')continue;
        const y=Math.max(.3,f.p.y-.45), p=f.p.clone();
        if(track.type==='wood'){
          const lateral=f.right.clone().setY(0).normalize();
          const topA=p.clone().addScaledVector(lateral,-.92).setY(y),topB=p.clone().addScaledVector(lateral,.92).setY(y);
          const baseA=p.clone().addScaledVector(lateral,-1.3).setY(.12),baseB=p.clone().addScaledVector(lateral,1.3).setY(.12);
          beam('timber',baseA,topA,.22);beam('timber',baseB,topB,.22);beam('timber',topA,topB,.25);
          for(let h=.25;h<y-.7;h+=3){
            const hi=Math.min(h+3,y),a=p.clone().addScaledVector(lateral,-1.16).setY(h),b=p.clone().addScaledVector(lateral,1.16).setY(hi);
            beam('timber',a,b,.12);a.x+=lateral.x*2.32;a.z+=lateral.z*2.32;b.x-=lateral.x*2.32;b.z-=lateral.z*2.32;beam('timber',a,b,.12);
            beam('timber',p.clone().addScaledVector(lateral,-1.16).setY(hi),p.clone().addScaledVector(lateral,1.16).setY(hi),.15);
          }
          box('rock',baseA,[.65,.22,.65]);box('rock',baseB,[.65,.22,.65]);
        }else if(track.type==='steel'){
          const lateral=f.right.clone().setY(0).normalize();if(lateral.length()<.1)lateral.set(1,0,0);
          const a=p.clone().addScaledVector(lateral,-1).setY(.1),b=p.clone().addScaledVector(lateral,1).setY(.1);
          beam('steel',a,a.clone().setY(y),.22);beam('steel',b,b.clone().setY(y),.22);
          beam('steel',a.clone().setY(y),b.clone().setY(y),.32);
          for(let h=.1;h<y-1;h+=4){const hi=Math.min(h+4,y);beam('steel',a.clone().setY(h),b.clone().setY(hi),.1);beam('steel',b.clone().setY(h),a.clone().setY(hi),.1);}
          box('rock',a,[.8,.3,.8]);box('rock',b,[.8,.3,.8]);
        }else{
          box('rock',new T.Vector3(p.x,y/2,p.z),[.92,y,.85]);box('cream',new T.Vector3(p.x,y-.12,p.z),[1.6,.25,1.05]);
          box('plum',new T.Vector3(p.x,.2,p.z),[1.4,.4,1.3]);
        }
      }
      const lift=[];
      for(let s=0;s<track.length;s+=.7){
        const f=track.sample(s);
        if(f.section==='lift'){box('dark',at(f,0,.015),[.15,.13,.62],f.q);lift.push(s);}
        if((f.section==='trim'||f.section==='brake')&&Math.round(s/.7)%2===0){box('brass',at(f,0,.13),[.09,.3,.62],f.q);box('dark',at(f,.22,-.03),[.12,.22,.66],f.q);box('dark',at(f,-.22,-.03),[.12,.22,.66],f.q);}
      }
      const dogCount=Math.ceil(lift.length/5);
      if(dogCount){const dogs=new T.InstancedMesh(cube,material('brass'),dogCount);dogs.instanceMatrix.setUsage(T.DynamicDrawUsage);dogs.frustumCulled=false;group.add(dogs);liftDogs.push({mesh:dogs,track,distances:lift,count:dogCount});}
      const f=plainFrame(track), st=new T.Group();st.name=track.name+' station';group.add(st);
      const platformY=f.p.y-.5;
      // Offset platforms leave the track trough and sightline open.
      box('brick',at(f,2.2,-.67,-3.5),[2.65,.7,11.5],f.q);
      box('cream',at(f,2.2,-.27,-3.5),[2.8,.16,11.7],f.q);
      box('brass',at(f,1.05,-.15,-3.5),[.17,.12,11.5],f.q);
      for(const z of [-8.7,-5,-1.3,2]){
        box('timber',at(f,3.3,1.42,z),[.2,3.4,.2],f.q);
        box('timber',at(f,-1.2,1.42,z),[.18,3.4,.18],f.q);
        beam('timber',at(f,-1.2,2.9,z),at(f,3.3,2.9,z),.2);
      }
      // The long canopy uses alternating narrow roof slats and cream fascia.
      for(let z=-9;z<2.6;z+=.65){box((Math.round((z+9)/.65)%2)?'cherry':'brick',at(f,1.05,3.25,z),[5.2,.22,.65],f.q);}
      box('cream',at(f,3.65,3.1,-3.3),[.16,.35,12],f.q);box('cream',at(f,-1.5,3.1,-3.3),[.16,.35,12],f.q);
      const sign=label(track.name,5.3,.94,'#ffedbd','#6b3640');sign.position.copy(at(f,1.05,3.79,2.65));sign.quaternion.copy(f.q);group.add(sign);
      for(let z=-8;z<1.8;z+=1.6){
        const gate=new T.Group();gate.position.copy(at(f,1.05,.48,z));gate.quaternion.copy(f.q);group.add(gate);
        const bar=new T.Mesh(cube,material('brass'));bar.scale.set(.08,.09,1.3);bar.position.set(0,.22,.65);gate.add(bar);
        const post=new T.Mesh(cube,material('brass'));post.scale.set(.1,.9,.1);post.position.y=.1;gate.add(post);
        gateSets.push({gate,base:f.q.clone(),index});
      }
      // Ticket window and luggage create a recognisable station at miniature scale.
      box('cherry',at(f,2.9,.65,-8.1),[1.1,1.9,1.25],f.q);box('cream',at(f,2.9,1.7,-8.1),[1.4,.2,1.5],f.q);
      const windowMat=new T.MeshLambertMaterial({color:C.cream,emissive:C.brass,emissiveIntensity:.1});glows.push(windowMat);
      const win=new T.Mesh(cube,windowMat);win.position.copy(at(f,2.9,.95,-7.45));win.quaternion.copy(f.q);win.scale.set(.7,.7,.03);group.add(win);
      for(let z=-7;z<1;z+=3.2){const lamp=new T.Mesh(new T.BoxGeometry(.25,.35,.25),windowMat);lamp.position.copy(at(f,1.05,2.85,z));group.add(lamp);}
    });
    Object.values(batches).forEach(b=>{const mesh=new T.InstancedMesh(cube,material(b.key),b.entries.length);b.entries.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;mesh.name='Station and track '+b.key;group.add(mesh);});
    const dynamic={};
    function dyn(name,count,key,colored){const mat=material(key); const mesh=new T.InstancedMesh(cube,mat,count);mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;mesh.name=name;group.add(mesh);dynamic[name]={mesh,index:0};return mesh;}
    const carN=ctx.tracks.length*5, riderN=carN*4;
    const body=dyn('coach',carN*5,'cream',true),trim=dyn('coach trim',carN*4,'brass'),seats=dyn('seats',carN*4,'dark'),wheels=dyn('wheels',carN*4,'dark');
    const torsos=dyn('rider coats',riderN,'cream',true),heads=dyn('rider heads',riderN,'skin',true),hair=dyn('rider hair',riderN,'timber',true),arms=dyn('rider arms',riderN*2,'cream',true),hands=dyn('rider hands',riderN*2,'skin',true);
    const lamps=dyn('train lamps',ctx.tracks.length,'cream');
    const lampMat=new T.MeshLambertMaterial({color:C.cream,emissive:C.cream,emissiveIntensity:0});lamps.material=lampMat;glows.push(lampMat);
    const coatColors=[C.cherry,C.teal,C.orange,C.cream,C.plum,C.yellow];const skinColors=[0xe5b388,0xc99370,0x936148,0xf0c8a0];
    for(let i=0;i<riderN;i++){torsos.setColorAt(i,new T.Color(coatColors[(i*7+2)%coatColors.length]));heads.setColorAt(i,new T.Color(skinColors[i%4]));hair.setColorAt(i,new T.Color(i%3===0?C.brass:C.timber));for(let a=0;a<2;a++){arms.setColorAt(i*2+a,new T.Color(coatColors[(i*7+2)%coatColors.length]));hands.setColorAt(i*2+a,new T.Color(skinColors[i%4]));}}
    ctx.tracks.forEach((track,ti)=>{for(let i=0;i<25;i++)body.setColorAt(ti*25+i,new T.Color(track.color));});
    const headlamp=new T.SpotLight(0xffe0a0,0,28,Math.PI/6,.5,1.5);headlamp.position.set(0,3,0);group.add(headlamp);group.add(headlamp.target);
    const stationLight=new T.PointLight(0xffc477,0,16,2);stationLight.position.copy(ctx.tracks[0].station.position).add(new T.Vector3(0,3,0));group.add(stationLight);
    const localQ=new T.Quaternion(),localP=new T.Vector3(),worldP=new T.Vector3();
    function instance(name,f,x,y,z,sx,sy,sz,rotation){
      const d=dynamic[name];localP.set(x,y,z).applyQuaternion(f.q).add(f.p);temp.position.copy(localP);temp.quaternion.copy(f.q);if(rotation)temp.quaternion.multiply(rotation);temp.scale.set(sx,sy,sz);temp.updateMatrix();d.mesh.setMatrixAt(d.index++,temp.matrix);
    }
    let day='day';
    function setDay(mode){day=mode;const night=mode==='night',dusk=mode==='dusk';glows.forEach(m=>m.emissiveIntensity=night?1.5:dusk?.7:.05);stationLight.intensity=night?1.15:dusk?.35:0;headlamp.intensity=night?2.8:dusk?.65:0;}
    function update(dt,time,rides,selectedIndex,dayMode){
      if(dayMode&&dayMode!==day)setDay(dayMode);
      Object.values(dynamic).forEach(d=>d.index=0);
      rides.forEach((ride,ti)=>{
        const track=ride.track||ctx.tracks[ti];
        for(let c=0;c<5;c++){
          const f=track.sample(ride.s-c*2.15),nose=c===0;
          instance('coach',f,0,.30,0,1.42,.26,1.74);
          instance('coach',f,-.67,.55,0,.12,.42,1.72);instance('coach',f,.67,.55,0,.12,.42,1.72);
          instance('coach',f,0,.48,.82,1.42,.30,.13);instance('coach',f,0,.6,-.82,1.42,.49,.12);
          instance('coach trim',f,0,.33,.91,1.52,.10,.10);instance('coach trim',f,0,.33,-.91,1.52,.10,.10);
          instance('coach trim',f,-.68,.78,0,.15,.06,1.8);instance('coach trim',f,.68,.78,0,.15,.06,1.8);
          for(const x of [-.76,.76])for(const z of [-.58,.58])instance('wheels',f,x,.05,z,.13,.3,.3);
          const raised=(f.airtime||f.section==='drop'||f.section==='loop')&&ride.speed>5;
          for(let row=0;row<2;row++)for(let side=0;side<2;side++){
            const x=side?.31:-.31,z=row?.32:-.36;
            instance('seats',f,x,.64,z-.21,.50,.43,.12);
            instance('rider coats',f,x,.89,z,.29,.4,.24);
            instance('rider heads',f,x,1.23,z+.035,.28,.29,.28);
            instance('rider hair',f,x,1.37,z,.30,.09,.30);
            for(let a=0;a<2;a++){
              const sign=a?1:-1;const lift=raised?1:0;const sway=raised?Math.sin(time*7+c+row)*.12:0;
              localQ.setFromAxisAngle(new T.Vector3(0,0,1),sign*(raised?-.32+sway:.16));
              instance('rider arms',f,x+sign*.22,raised?1.17:.87,z+.02,.11,raised?.46:.30,.13,localQ);
              instance('rider hands',f,x+sign*(raised?.29:.23),raised?1.43:.74,z+.045,.13,.13,.13);
            }
          }
          if(nose)instance('train lamps',f,0,.55,.91,.31,.23,.09);
        }
      });
      Object.values(dynamic).forEach(d=>{d.mesh.count=d.index;d.mesh.instanceMatrix.needsUpdate=true;});
      liftDogs.forEach(d=>{for(let i=0;i<d.count;i++){const idx=(i*5+time*3)%d.distances.length,base=Math.floor(idx),next=Math.min(base+1,d.distances.length-1),s=d.distances[base]+(d.distances[next]-d.distances[base])*(idx-base);const f=d.track.sample(s);temp.position.copy(at(f,0,.16));temp.quaternion.copy(f.q);temp.scale.set(.27,.13,.23);temp.updateMatrix();d.mesh.setMatrixAt(i,temp.matrix);}d.mesh.instanceMatrix.needsUpdate=true;});
      gateSets.forEach(g=>{const r=rides[g.index],open=r&&(r.state==='unload'||r.state==='board'||r.state==='arrive');g.gate.quaternion.copy(g.base);localQ.setFromAxisAngle(axisY,open?Math.PI/2:0);g.gate.quaternion.multiply(localQ);});
      const selected=rides[selectedIndex]||rides[0];if(selected){const f=selected.track.sample(selected.s);headlamp.position.copy(at(f,0,.62,1.05));headlamp.target.position.copy(at(f,0,.4,13));}
    }
    setDay('day');
    return {group,update,setDay,dispose(){group.traverse(o=>{if(o.geometry)o.geometry.dispose();});Object.values(materials).forEach(m=>m.dispose());group.removeFromParent();}};
  };
}());
