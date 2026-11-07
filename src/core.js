/* Cinderpine Express: authored turtle paths, numerical closure and ride dynamics. */
(function(){
'use strict';
const V=THREE.Vector3, UP=new V(0,1,0), G=9.81, TAU=Math.PI*2, clamp=THREE.MathUtils.clamp;
const colors={grass:0xb5ac67,grassDark:0x8a8955,plum:0x5b465b,rock:0x75566a,brick:0xb66545,brass:0xd2ab61,cherry:0xae3941,cream:0xffedbd,timber:0x71503c,steel:0x6e8182,teal:0x4c7b78,orange:0xd77b3e,yellow:0xe2b854,leafRed:0xad4b42,dark:0x302b39,water:0x719e9b,skin:0xe5b388};
const smooth=t=>t*t*t*(10+t*(-15+6*t));
class Turtle {
 constructor(x,y,z,heading=0){this.p=new V(x,y,z);this.a=heading;this.points=[this.p.clone()];this.labels=['station'];this.program=[];}
 add(p,section){this.points.push(p);this.labels.push(section);this.p=p.clone();}
 straight(length,section='return'){return this.pitch(length,this.p.y,section);}
 pitch(length,height,section='lift'){this.program.push({op:'pitch-ease',length,height,section});const p=this.p.clone(),n=Math.ceil(length*3);for(let i=1;i<=n;i++){let t=i/n;this.add(new V(p.x+Math.cos(this.a)*length*t,p.y+(height-p.y)*smooth(t),p.z+Math.sin(this.a)*length*t),section);}return this;}
 hill(length,height,section='hill'){this.program.push({op:'hill',length,height});const p=this.p.clone(),n=Math.ceil(length*3);for(let i=1;i<=n;i++){let t=i/n;this.add(new V(p.x+Math.cos(this.a)*length*t,p.y+height*Math.pow(Math.sin(Math.PI*t),2),p.z+Math.sin(this.a)*length*t),section);}return this;}
 turn(radius,degrees,rise=0,section='turn'){this.program.push({op:section==='helix'?'helix':'turn',radius,degrees,rise});const a=this.a,angle=degrees*Math.PI/180,sign=Math.sign(angle),p=this.p.clone(),n=Math.ceil(Math.abs(angle)*radius*3);for(let i=1;i<=n;i++){let t=i/n,b=a+angle*t;this.add(new V(p.x+sign*radius*(Math.sin(b)-Math.sin(a)),p.y+rise*smooth(t),p.z-sign*radius*(Math.cos(b)-Math.cos(a))),section);}this.a+=angle;return this;}
 loop(radius,side=3.4){this.program.push({op:'vertical-loop-clothoid',radius,side});let p=this.p.clone(),f=new V(Math.cos(this.a),0,Math.sin(this.a)),r=new V(-f.z,0,f.x),z=0,y=0;const n=240,kbase=1/radius;for(let i=1;i<=n;i++){let t=i/n,a=(i-.5)/n*TAU,ds=(TAU/n)/(kbase*(1-.6*Math.cos(a)));z+=Math.cos(a)*ds;y+=Math.sin(a)*ds;this.add(p.clone().addScaledVector(f,z).addScaledVector(r,side*smooth(t)).addScaledVector(UP,y),'loop');}return this;}
 // A damped finite-difference least-squares shooting solve closes position and heading.
 close(){const p=this.p.clone(),target=this.points[0],f=new V(Math.cos(this.a),0,Math.sin(this.a)),end=this.points[1].clone().sub(target).normalize();let vars=[0,0,0];let error=Infinity,iterations=0;for(;iterations<20;iterations++){const residual=new V(p.x+vars[0]-target.x,p.y+vars[1]-target.y,p.z+vars[2]-target.z);error=residual.length();if(error<1e-7)break;for(let j=0;j<3;j++)vars[j]-=residual.getComponent(j)*.95;}let q=p.clone().add(new V(...vars));const d=p.distanceTo(q),c1=p.clone().addScaledVector(f,Math.min(8,d*.42)),c2=q.clone().addScaledVector(end,-Math.min(8,d*.42));const curve=new THREE.CubicBezierCurve3(p,c1,c2,q);let n=Math.max(20,Math.ceil(d*4));for(let i=1;i<=n;i++)this.add(curve.getPoint(i/n),i/n>.48?'brake':'return');this.program.push({op:'numeric-close',iterations,error});this.closureError=q.distanceTo(target);return this;}
}
function makeTrack(id,name,type,color,turtle){
 let raw=turtle.points.slice(0,-1),curve=new THREE.CatmullRomCurve3(raw,true,'centripetal',.5);curve.arcLengthDivisions=5000;const length=curve.getLength(),n=Math.ceil(length/.5),ds=length/n,points=Array.from({length:n},(_,i)=>curve.getPointAt(i/n)),samples=[];
 // Determine labels by closest authored point. This preserves feature labels through smoothing.
 for(let i=0;i<n;i++){let p=points[i],near=0,dist=Infinity;for(let j=0;j<raw.length;j++){let d=p.distanceToSquared(raw[j]);if(d<dist){dist=d;near=j;}}let prev=points[(i-1+n)%n],next=points[(i+1)%n];let tangent=next.clone().sub(prev).normalize();let curvature=next.clone().add(prev).addScaledVector(p,-2).multiplyScalar(1/(ds*ds));samples.push({s:i*ds,p,tangent,curvature,section:turtle.labels[near],speed:4,g:1,airtime:false});}
 // Forward work-energy integration (gravity, rolling resistance, quadratic drag).
 // Curvature-dependent governor represents magnetic trims; a backward braking envelope
 // propagates limits upstream so deceleration is bounded, rather than clamping measured g.
 const vmax=samples.map(s=>{let k=s.curvature.length();return Math.min(type==='mine'?15:27,Math.sqrt(3.25*G/Math.max(.001,k)));});
 for(let lap=0;lap<3;lap++)for(let i=0;i<n;i++){let s=samples[i],prev=samples[(i-1+n)%n],v2=prev.speed*prev.speed+2*G*(prev.p.y-s.p.y)-2*ds*(.035*G+.0015*prev.speed*prev.speed);let speed=Math.sqrt(Math.max(0,v2));if(s.section==='lift')speed=5.2;if(s.section==='station')speed=3.3;if(s.section==='trim')speed=Math.min(speed,11);if(s.section==='brake')speed=Math.min(speed,5.5);s.speed=Math.min(vmax[i],speed);}
 // Chain exit carries enough energy into each compact circuit; a hidden propulsion floor
 // is deliberately avoided. Tune path energy by reducing rolling loss, not speed clamping.
 for(let pass=0;pass<5;pass++)for(let i=n-1;i>=0;i--){let s=samples[i],next=samples[(i+1)%n];if(!['lift','station'].includes(s.section))s.speed=Math.min(s.speed,Math.sqrt(next.speed*next.speed+2*5.5*ds));}
 let transported=new V(0,1,0);for(let i=0;i<n;i++){let s=samples[i],t=s.tangent;transported.addScaledVector(t,-transported.dot(t)).normalize();let force=s.curvature.clone().multiplyScalar(s.speed*s.speed).addScaledVector(UP,G);force.addScaledVector(t,-force.dot(t));let fLen=force.length(),up=fLen>.04?force.clone().normalize():transported.clone();if(s.section!=='loop'&&up.dot(transported)<0)up.negate();s.up=up;s.right=new V().crossVectors(up,t).normalize();s.up=new V().crossVectors(t,s.right).normalize();s.g=force.dot(s.up)/G;s.airtime=s.g<.45&&s.speed>5;s.q=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(s.right,s.up,t));transported=s.up.clone();}
 let maxSpeed=Math.max(...samples.map(s=>s.speed)),maxHeight=Math.max(...samples.map(s=>s.p.y)),maxG=Math.max(...samples.map(s=>s.g)),minG=Math.min(...samples.map(s=>s.g)),duration=samples.reduce((sum,s)=>sum+ds/Math.max(.1,s.speed),0);let stats={maxSpeed,maxHeight,maxG,minG,duration,closureError:turtle.closureError,excitement:Math.min(9.9,3+maxSpeed*.14+maxHeight*.06),intensity:Math.min(9.9,maxG*1.5+(type==='steel'?1:0)),nausea:type==='steel'?4.2:type==='wood'?2.7:1.4};
 const track={id,name,type,color,length,samples,stats,program:turtle.program,station:{position:samples[0].p.clone(),forward:samples[0].tangent.clone()}};
 track.sample=function(distance){let v=((distance%length)+length)%length/ds,i=Math.min(n-1,Math.floor(v)),a=samples[i],b=samples[(i+1)%n],u=v-i;let q=a.q.clone().slerp(b.q,u);return{s:distance,p:a.p.clone().lerp(b.p,u),tangent:new V(0,0,1).applyQuaternion(q),up:new V(0,1,0).applyQuaternion(q),right:new V(1,0,0).applyQuaternion(q),q,speed:THREE.MathUtils.lerp(a.speed,b.speed,u),g:THREE.MathUtils.lerp(a.g,b.g,u),airtime:a.airtime,section:a.section};};return track;
}
function createTracks(){
 const pine=new Turtle(-28,1.4,21).straight(13,'station').turn(6,-80).pitch(30,21,'lift').turn(8,-100).pitch(15,3,'drop').turn(6,-180).hill(23,1.8).straight(4,'trim').turn(9,180).turn(6,-270,-1.2,'helix').close();
 const loop=new Turtle(13,1.4,23).straight(10,'station').turn(5,-90).pitch(36,19,'lift').turn(6,-180).pitch(23,2.8,'drop').loop(3.35,3.4).straight(2,'trim').close();
 const mine=new Turtle(-30,1.4,25).straight(10,'station').pitch(12,6.5,'lift').pitch(6,3.4,'drop').pitch(6,4.6,'hill').pitch(6,2.2,'drop').pitch(6,3.1,'hill').turn(4,-180).straight(6,'trim').turn(6,45,0,'tunnel').turn(6,-90,-1,'tunnel').turn(6,45,0,'tunnel').pitch(9,1.4,'return').close();
 return[makeTrack('pinewood','Old Pinewood','wood',colors.brass,pine),makeTrack('cinderloop','Cinderloop','steel',colors.cherry,loop),makeTrack('mine','Ember Mine Run','mine',colors.teal,mine)];
}
function createRide(track,index,emit){const ride={track,index,s:0,speed:0,g:1,airtime:false,state:'board',section:'station',lapTime:0,lapCount:0,boardProgress:0,position:track.samples[0].p.clone(),clock:index*3,previous:'station',previousAir:false,auto:true};
 ride.dispatch=()=>{if(ride.state!=='board'&&ride.state!=='unload')return false;ride.state='dispatch';ride.clock=0;emit('dispatch',{ride,index,track});return true;};
 ride.update=dt=>{ride.clock+=dt;if(['unload','board','arrive'].includes(ride.state)){ride.speed=Math.max(0,ride.speed-dt*5);if(ride.state==='arrive'&&ride.clock>1){ride.state='unload';ride.clock=0;}else if(ride.state==='unload'&&ride.clock>3){ride.state='board';ride.clock=0;}else if(ride.state==='board'){ride.boardProgress=clamp(ride.clock/10,0,1);if(ride.clock>13&&ride.auto)ride.dispatch();}return;}
 let frame=track.sample(ride.s),target=Math.min(frame.speed,Math.sqrt(2*2.6*Math.max(0,track.length-ride.s)));ride.speed=ride.clock<1.5?Math.min(target,ride.speed+3*dt):target;let distance=ride.speed*dt;ride.s+=distance;ride.lapTime+=dt;
 if(ride.s>=track.length){ride.s=0;ride.speed=0;ride.state='arrive';ride.clock=0;ride.lapCount++;ride.lastLap=ride.lapTime;ride.lapTime=0;emit('arrive',{ride,index,track});}
 else{frame=track.sample(ride.s);ride.state=frame.section==='lift'?'lift':frame.section==='drop'?'drop':frame.section==='brake'||frame.section==='trim'?'brake':ride.clock<1?'dispatch':'ride';}
 ride.position.copy(frame.p);ride.section=frame.section;ride.g=frame.g;ride.airtime=frame.airtime;
 if(ride.previous!==frame.section){emit('state',{ride,index,track,section:frame.section});if(['loop','brake','lift'].includes(frame.section))emit(frame.section==='lift'?'chain':frame.section,{ride,index,track});if(frame.section==='drop')emit('scream',{ride,index,track});ride.previous=frame.section;}
 if(frame.airtime&&!ride.previousAir)emit('airtime',{ride,index,track});ride.previousAir=frame.airtime;};return ride;}
window.CinderCore={colors,createTracks,createRide,Turtle};
})();
