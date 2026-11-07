(function () {
  'use strict';

  // All sound is synthesized. AudioContext creation is reserved for start(),
  // which the application invokes from its first pointer/keyboard gesture.
  window.createAudio = function createAudio(ctx) {
    var ac = null, master = null, limiter = null, muted = false, disposed = false;
    var selected = 0, dayMode = 'day', lastRide = null, initError = null;
    var volume = 0.68, noiseBuffer = null, continuous = [], transient = new Set();
    var buses = {}, unsubscribers = [], nextNote = 0, noteIndex = 0;
    var nextChain = 0, nextWheel = 0, lastScream = -100, lastBell = -100;
    var nextMurmur = 0, lastFrame = 0;

    var melody = [
      72, 76, 79, 76, 74, 72, 71, 67, 71, 74, 77, 74,
      72, 76, 79, 84, 83, 79, 77, 74, 71, 69, 67, null,
      69, 72, 76, 79, 76, 72, 67, 71, 74, 77, 74, 71,
      72, 76, 79, 76, 74, 71, 72, null, 67, 72, null, null
    ];
    var roots = [48, 48, 43, 43, 48, 48, 43, 43, 45, 45, 43, 43, 48, 43, 48, 48];
    var clamp = function (n, lo, hi) { return Math.max(lo, Math.min(hi, n)); };
    var hz = function (note) { return 440 * Math.pow(2, (note - 69) / 12); };

    function smooth(param, value, seconds) {
      if (ac && param) param.setTargetAtTime(value, ac.currentTime, seconds || 0.1);
    }

    function bus(name, gain) {
      var node = ac.createGain();
      node.gain.value = gain;
      node.connect(master);
      buses[name] = node;
      return node;
    }

    function remember(source, nodes) {
      transient.add(source);
      source.onended = function () {
        transient.delete(source);
        try { source.disconnect(); } catch (_) {}
        (nodes || []).forEach(function (n) { try { n.disconnect(); } catch (_) {} });
      };
    }

    function panNode(pan, destination) {
      if (ac.createStereoPanner) {
        var p = ac.createStereoPanner();
        p.pan.value = clamp(pan || 0, -1, 1);
        p.connect(destination);
        return p;
      }
      var gain = ac.createGain();
      gain.connect(destination);
      return gain;
    }

    function tone(frequency, duration, amplitude, type, destination, when, pan, endFrequency) {
      if (!ac || disposed || ac.state !== 'running') return;
      when = Math.max(when || ac.currentTime, ac.currentTime);
      var oscillator = ac.createOscillator(), envelope = ac.createGain();
      var stereo = panNode(pan, destination || buses.effects);
      oscillator.type = type || 'sine';
      oscillator.frequency.setValueAtTime(Math.max(20, frequency), when);
      if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), when + duration);
      envelope.gain.setValueAtTime(0, when);
      envelope.gain.linearRampToValueAtTime(amplitude, when + Math.min(0.025, duration / 6));
      envelope.gain.exponentialRampToValueAtTime(0.0001, when + duration);
      oscillator.connect(envelope);
      envelope.connect(stereo);
      remember(oscillator, [envelope, stereo]);
      oscillator.start(when);
      oscillator.stop(when + duration + 0.025);
    }

    function noiseBurst(duration, amplitude, frequency, type, when, pan) {
      if (!ac || disposed || ac.state !== 'running') return;
      when = Math.max(when || ac.currentTime, ac.currentTime);
      var source = ac.createBufferSource(), filter = ac.createBiquadFilter(), env = ac.createGain();
      var stereo = panNode(pan, buses.effects);
      source.buffer = noiseBuffer;
      filter.type = type || 'bandpass';
      filter.frequency.value = frequency;
      filter.Q.value = 0.75;
      env.gain.setValueAtTime(0, when);
      env.gain.linearRampToValueAtTime(amplitude, when + 0.009);
      env.gain.exponentialRampToValueAtTime(0.0001, when + duration);
      source.connect(filter); filter.connect(env); env.connect(stereo);
      remember(source, [filter, env, stereo]);
      source.start(when, Math.random() * 1.4);
      source.stop(when + duration + 0.03);
    }

    function noiseLoop(name, frequency, filterType, gain) {
      var source = ac.createBufferSource(), filter = ac.createBiquadFilter();
      var envelope = bus(name, gain);
      source.buffer = noiseBuffer;
      source.loop = true;
      filter.type = filterType;
      filter.frequency.value = frequency;
      filter.Q.value = 0.45;
      source.connect(filter); filter.connect(envelope);
      source.start(0, Math.random());
      continuous.push(source, filter);
      return { source: source, filter: filter, gain: envelope.gain };
    }

    var crowd, wind, wheels;
    function initialize() {
      var AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return false;
      ac = new AudioContextClass();
      master = ac.createGain();
      limiter = ac.createDynamicsCompressor();
      limiter.threshold.value = -15;
      limiter.knee.value = 18;
      limiter.ratio.value = 7;
      limiter.attack.value = 0.004;
      limiter.release.value = 0.22;
      master.gain.value = muted ? 0 : volume;
      master.connect(limiter); limiter.connect(ac.destination);

      noiseBuffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * 3), ac.sampleRate);
      var noise = noiseBuffer.getChannelData(0), low = 0;
      for (var i = 0; i < noise.length; i++) {
        var white = Math.random() * 2 - 1;
        low = (low + 0.035 * white) / 1.035;
        noise[i] = white * 0.24 + low * 2.4;
      }
      bus('music', 0.25);
      bus('effects', 0.62);
      bus('voices', 0.2);
      crowd = noiseLoop('crowd', 650, 'bandpass', 0.075);
      wind = noiseLoop('wind', 420, 'lowpass', 0);
      wheels = noiseLoop('wheels', 180, 'lowpass', 0);
      nextNote = ac.currentTime + 0.12;
      nextMurmur = ac.currentTime + 1.2;
      nextChain = nextWheel = ac.currentTime;
      return true;
    }

    async function start() {
      if (disposed) return false;
      try {
        if (!ac && !initialize()) return false;
        if (ac.state === 'suspended') await ac.resume();
        return ac.state === 'running';
      } catch (error) {
        initError = String(error && error.message || error);
        return false;
      }
    }

    function bell() {
      if (!ac || ac.currentTime - lastBell < 0.3) return;
      lastBell = ac.currentTime;
      [0, 0.32].forEach(function (delay, index) {
        var f = index ? 1046.5 : 784;
        tone(f, 1.1, 0.115, 'sine', buses.effects, ac.currentTime + delay);
        tone(f * 2.76, 0.55, 0.025, 'sine', buses.effects, ac.currentTime + delay);
        tone(f * 4.1, 0.25, 0.012, 'sine', buses.effects, ac.currentTime + delay);
      });
    }

    function chainClank() {
      if (!ac) return;
      noiseBurst(0.065, 0.08, 1400, 'highpass');
      tone(520, 0.055, 0.042, 'triangle');
      tone(831, 0.075, 0.026, 'sine');
    }

    function brake() {
      if (!ac) return;
      noiseBurst(0.65, 0.13, 1100, 'bandpass');
      tone(470, 0.55, 0.028, 'triangle', buses.effects, 0, 0, 170);
    }

    function scream() {
      if (!ac || ac.currentTime - lastScream < 2.6) return;
      lastScream = ac.currentTime;
      // A small chorus of vowel-like glissandi, kept below the music peak.
      for (var i = 0; i < 3; i++) {
        var base = 420 + Math.random() * 200;
        var at = ac.currentTime + i * 0.11;
        tone(base, 0.85, 0.05, 'sine', buses.voices, at, (i - 1) * 0.45, base * 1.55);
        tone(base * 2.02, 0.64, 0.012, 'sine', buses.voices, at + 0.05, (i - 1) * 0.45, base * 2.65);
      }
    }

    function firework(event) {
      if (!ac || dayMode !== 'night') return;
      var pan = event && event.position ? clamp(event.position.x / 60, -0.8, 0.8) : Math.random() - 0.5;
      tone(100, 0.45, 0.11, 'sine', buses.effects, 0, pan, 35);
      noiseBurst(0.6, 0.21, 230, 'lowpass', 0, pan);
      for (var i = 0; i < 5; i++) {
        noiseBurst(0.12, 0.06, 2300, 'highpass', ac.currentTime + 0.12 + i * 0.07, pan);
      }
    }

    function selectedEvent(event) {
      if (!event) return true;
      if (typeof event.index === 'number') return event.index === selected;
      if (event.ride && lastRide) return event.ride === lastRide;
      return true;
    }

    function listen(name, callback) {
      if (typeof ctx.on !== 'function') return;
      var off = ctx.on(name, function (event) {
        if (disposed || !ac || muted || ac.state !== 'running') return;
        callback(event);
      });
      if (typeof off === 'function') unsubscribers.push(off);
    }

    listen('dispatch', function (e) { if (selectedEvent(e)) bell(); });
    listen('arrive', function (e) { if (selectedEvent(e)) bell(); });
    listen('brake', function (e) { if (selectedEvent(e)) brake(); });
    listen('chain', function (e) {
      if (selectedEvent(e) && ac.currentTime >= nextChain) {
        chainClank(); nextChain = ac.currentTime + 0.24;
      }
    });
    listen('loop', function (e) { if (selectedEvent(e)) scream(); });
    listen('airtime', function (e) { if (selectedEvent(e)) scream(); });
    listen('scream', function (e) { if (selectedEvent(e)) scream(); });
    listen('firework', firework);

    function scheduleMusic(now) {
      // A tiny look-ahead sequencer driven only by the app's existing frame loop.
      // Dropped/hidden frames skip old notes rather than producing a burst.
      if (nextNote < now - 0.15) nextNote = now + 0.025;
      var step = dayMode === 'night' ? 0.3 : 0.27;
      var guard = 0;
      while (nextNote < now + 0.13 && guard++ < 3) {
        var note = melody[noteIndex % melody.length];
        if (note !== null) {
          tone(hz(note), step * 0.85, 0.105, 'sine', buses.music, nextNote, -0.22);
          tone(hz(note) * 2, step * 0.62, 0.022, 'sine', buses.music, nextNote, 0.15);
        }
        var root = roots[Math.floor(noteIndex / 3) % roots.length];
        if (noteIndex % 3 === 0) {
          tone(hz(root), step * 0.92, 0.085, 'triangle', buses.music, nextNote, 0.2);
        } else {
          tone(hz(root + 12), step * 0.7, 0.025, 'sine', buses.music, nextNote, 0.15);
          tone(hz(root + 16), step * 0.7, 0.025, 'sine', buses.music, nextNote, 0.15);
          tone(hz(root + 19), step * 0.7, 0.018, 'sine', buses.music, nextNote, 0.15);
        }
        noteIndex++;
        nextNote += step;
      }
    }

    function update(dt, time, rides, selectedIndex, mode) {
      selected = typeof selectedIndex === 'number' ? selectedIndex : selected;
      dayMode = mode || dayMode;
      lastRide = rides && rides[selected] || null;
      if (!ac || disposed || ac.state !== 'running') return;
      var now = ac.currentTime;
      if (muted) {
        nextNote = now + 0.04;
        return;
      }
      scheduleMusic(now);
      var speed = lastRide ? Math.max(0, lastRide.speed || 0) : 0;
      var section = lastRide ? lastRide.section || lastRide.state : '';
      var intensity = clamp(speed / 26, 0, 1);
      smooth(wind.gain, intensity * intensity * 0.29, 0.22);
      smooth(wind.filter.frequency, 300 + intensity * 1900, 0.2);
      smooth(wheels.gain, speed > 0.3 ? 0.02 + intensity * 0.15 : 0, 0.1);
      smooth(wheels.filter.frequency, 90 + speed * 17, 0.2);
      smooth(wheels.source.playbackRate, 0.55 + intensity * 1.4, 0.15);
      smooth(buses.music.gain, 0.26 - intensity * 0.12, 0.6);
      smooth(crowd.gain, (dayMode === 'night' ? 0.054 : 0.07) * (1 + Math.sin(time * 0.55) * 0.13), 0.6);

      if (section === 'lift' && now >= nextChain && speed > 0.1) {
        chainClank();
        nextChain = now + clamp(0.7 / Math.max(1, speed), 0.09, 0.3);
      }
      if (speed > 1.8 && now >= nextWheel) {
        tone(95 + Math.random() * 20, 0.038, 0.02 + intensity * 0.025, 'triangle');
        nextWheel = now + clamp(2.8 / speed, 0.08, 0.45);
      }
      if (now >= nextMurmur) {
        var f = 120 + Math.random() * 90;
        var pan = Math.random() * 1.4 - 0.7;
        tone(f, 0.32, 0.025, 'triangle', buses.voices, now, pan, f * 1.22);
        tone(f * 1.18, 0.26, 0.018, 'sine', buses.voices, now + 0.27, pan, f);
        nextMurmur = now + 0.85 + Math.random() * 1.3;
      }
      lastFrame = now;
    }

    function setMuted(value) {
      muted = Boolean(value);
      if (master && ac) {
        smooth(master.gain, muted ? 0 : volume, 0.045);
        if (!muted) nextNote = ac.currentTime + 0.05;
      }
      return muted;
    }

    function dispose() {
      if (disposed) return;
      disposed = true;
      unsubscribers.forEach(function (fn) { fn(); });
      continuous.forEach(function (node) {
        try { if (node.stop) node.stop(); node.disconnect(); } catch (_) {}
      });
      transient.forEach(function (node) { try { node.stop(); node.disconnect(); } catch (_) {} });
      transient.clear();
      if (ac) ac.close().catch(function () {});
    }

    return {
      group: null,
      start: start,
      update: update,
      setDay: function (mode) { dayMode = mode; },
      setMuted: setMuted,
      setVolume: function (value) {
        volume = clamp(Number(value) || 0, 0, 1);
        if (master && !muted) smooth(master.gain, volume, 0.08);
      },
      dispose: dispose,
      get muted() { return muted; },
      get started() { return !!ac && ac.state === 'running'; },
      get supported() { return !!(window.AudioContext || window.webkitAudioContext); },
      get error() { return initError; }
    };
  };
}());
