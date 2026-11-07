# Cinderpine Express — integration contract

## Ownership
Root owns core.js (turtle authoring, closure solver, resampling, physics, ride), app.js (rendering/cameras/UI), page.html and build/test tooling. Park agent owns src/park.js. Rail agent owns src/rail.js. Audio agent owns src/audio.js. Each file is a plain IIFE assigning one factory to window; no imports, dependencies or DOM ownership. Three.js r128 is global THREE. Final build inlines all local CSS/JS/fonts into one HTML.

## Coordinates and time
Metres, right handed, Y up, ground Y=0. Floating island x=-48..48, z=-32..51, top y=0, bottom y=-9. Track construction zone x=-38..38, z=-25..25. Midway public zone z=27..47 plus side strips x=40..46. Main station x=-25..-12,z=22,y=1.4, forward +X. Pinewood western/back zone; Cinderloop eastern/back zone; Mine Run front zone. Keep major park structures out of track zone except tunnel hill requested below. Start is front-left-isometric view from (100,83,130), 31-degree elevation. All updates dt seconds, absolute elapsed seconds; no independent animation loops.

## Shared context
Factory signature createPark(ctx), createRails(ctx), createAudio(ctx). ctx={THREE,scene,colors,tracks,emit,on}. colors has hex keys: grass 0xb5ac67, grassDark 0x8a8955, plum 0x5b465b, rock 0x75566a, brick 0xb66545, brass 0xd2ab61, cherry 0xae3941, cream 0xffedbd, timber 0x71503c, steel 0x6e8182, teal 0x4c7b78, orange 0xd77b3e, yellow 0xe2b854, leafRed 0xad4b42, dark 0x302b39, water 0x719e9b, skin 0xe5b388.

## TRACK API
ctx.tracks is array of 3: id='pinewood'|'cinderloop'|'mine', name, type='wood'|'steel'|'mine', color(hex), length(m), samples[], station={position:Vector3,forward:Vector3}, stats, program[]. samples ~0.5m spacing with {s,p:Vector3,tangent:Vector3,up:Vector3,right:Vector3,q:Quaternion,speed(m/s),g,airtime,section}. frame basis local X=right, Y=up, Z=forward tangent (train nose local +Z). section='station'|'lift'|'drop'|'hill'|'loop'|'helix'|'tunnel'|'trim'|'brake'|'turn'|'return'. track.sample(distance) wraps and interpolates returning same shape. Up derives from normal force with transported sign retained in negative-g airtime. Stats include maxSpeed, maxHeight, maxG,minG,closureError,excitement,intensity,nausea,duration. Loops may have inverted up. Track paths exact data root owns; agents must use this API and not invent paths.

## RIDE API
rides is array [{track,s,speed,g,airtime,state,section,lapTime,lapCount,boardProgress,position:Vector3}]. state unload|board|dispatch|lift|drop|brake|arrive|ride. ride.sample behind via track.sample(ride.s-offset). 5 cars, 2.15m spacing, 4 riders/car. Head position is first car. root calls component.update(dt,time,rides,selectedIndex,dayMode), dayMode='day'|'dusk'|'night'. Root calls component.setDay(mode) on mode changes. Factories return {group,update,setDay,dispose?}; audio additionally start(),setMuted(bool), muted getter. No factory owns UI.

## Events
ctx.on(name,fn) and ctx.emit(name,payload). Payload {ride,index,track,...}. dispatch, state, chain, brake, arrive, loop, airtime, scream, firework, select. Audio subscribes to events. Park may emit firework with position. Use pooled particles and instancing for box people/leaves/ties/supports. Target low draw calls; no shadows required, basic/lambert materials, no external assets. Canvas labels permitted. No timers owned by modules.

## Light slots
Root hemisphere + sun. Park has maximum 4 PointLights for plaza, cafe, wheel, gate; change intensities with day mode; emissive window/lamp materials can be unlimited. Rails ONE headlamp SpotLight for selected train and optional 1 station PointLight total, not per train. Audio no lights. Root renderer max 6 local dynamic lights.

## Park requirements
Island slab with faceted plum cliffs and dry grass, main entry at (0,0,46), sign, switchback queue beside station z25..30, 6 stalls, cafe, fountain, ferris wheel (x32,z34), carousel (x-31,z36), trees, falling leaves, bunting, lamps, 140 instanced box guests. Guests stroll/queue/sit/eat/cheer. Tunnel hill will be defined by samples tagged tunnel on mine track: place segmented rock arch around those points with CLEAR inner passage radius >=2.3m; no solid rock over track. Park can derive tunnel from ctx.tracks[2].samples. Avoid visually obscuring trains.

## Rails requirements
Rail pairs gauge 1.2m, ties, timber trestles/steel lattice/stone piers to y=0, chain and moving dogs for lift samples, fins for trim/brake, station canopy with dynamic gates, 5 cars and 20 riders per ride, animate arms on drops/airtime, headlamp at night. All track geometry accepts inverted frames. Canopy must not occlude first-person front rails. Three stations as defined by each track station.

## Audio requirements
WebAudio only, lazily start on user gesture. Calliope loop, crowd, speed-linked wheels/wind, chain clank, screams, brakes, bell, fireworks. Moderate levels, master limiter, mute supported. Handle AudioContext errors gracefully.
