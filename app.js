/**
 * Elevator Small Talk Simulator 🛗😬
 * Pure HTML5/CSS3/Vanilla JS + Web Audio Procedural Muzak Engine
 * Zero external dependencies.
 */

(function () {
  'use strict';

  // --- AUDIO SYNTHESIS ENGINE ---
  let audioCtx = null;
  let masterGain = null;
  let muzakGain = null;
  let isMuted = false;
  let muzakStep = 0;
  let muzakInterval = null;
  let muzakDetune = 0;

  function initAudio() {
    if (audioCtx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    audioCtx = new AudioContextClass();

    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.7, audioCtx.currentTime);
    masterGain.connect(audioCtx.destination);

    muzakGain = audioCtx.createGain();
    muzakGain.gain.setValueAtTime(0.5, audioCtx.currentTime);
    muzakGain.connect(masterGain);

    startBossaMuzak();
  }

  function resumeAudio() {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  // Bossa Nova Chords & Frequencies
  // [F3, A3, C4, E4, G4], [G3, B3, F4, A4, E5], [E3, G3, B3, D4], [A3, C#4, G4, F5]
  const CHORD_PROGRESSION = [
    [174.61, 220.00, 261.63, 329.63, 392.00], // Fmaj9
    [196.00, 246.94, 349.23, 440.00, 659.25], // G13
    [164.81, 196.00, 246.94, 293.66],         // Em7
    [220.00, 277.18, 392.00, 698.46],         // A7(b13)
    [146.83, 174.61, 261.63, 329.63],         // Dm9
    [138.59, 174.61, 246.94, 311.13],         // Db9
    [130.81, 164.81, 246.94, 293.66],         // Cmaj7
    [130.81, 164.81, 233.08, 311.13]          // C7alt
  ];

  const BASS_NOTES = [
    87.31, 130.81, 98.00, 146.83, 82.41, 123.47, 110.00, 164.81,
    73.42, 110.00, 69.30, 103.83, 65.41, 98.00, 65.41, 116.54
  ];

  function startBossaMuzak() {
    if (muzakInterval) clearInterval(muzakInterval);
    const tempoBpm = 112;
    const stepTimeMs = (60 / tempoBpm / 4) * 1000; // 16th note

    muzakInterval = setInterval(() => {
      if (!audioCtx || isMuted || audioCtx.state !== 'running') return;
      playMuzakStep(muzakStep);
      muzakStep = (muzakStep + 1) % 64;
    }, stepTimeMs);
  }

  function playMuzakStep(step) {
    const t = audioCtx.currentTime;
    const chordIdx = Math.floor(step / 8) % CHORD_PROGRESSION.length;
    const chord = CHORD_PROGRESSION[chordIdx];
    const subStep = step % 8;

    // Bossa Bass Pattern (Steps 0, 3, 4, 6)
    if (subStep === 0 || subStep === 3 || subStep === 4 || subStep === 6) {
      const bassFreq = BASS_NOTES[(chordIdx * 2 + (subStep === 0 ? 0 : 1)) % BASS_NOTES.length];
      playBassNote(bassFreq, t, 0.28);
    }

    // Rhodes / Electric Piano Chords on syncope (Steps 0, 3, 6)
    if (subStep === 0 || subStep === 3 || subStep === 6) {
      chord.forEach((freq, i) => {
        playRhodesKey(freq, t + i * 0.006, 0.35);
      });
    }

    // Soft Percussion: Kick on 0, Rimshot/Brush on 4, Hi-hat on every even step
    if (subStep === 0) playKick(t);
    if (subStep === 4) playRimshot(t);
    if (step % 2 === 0) playHiHat(t, subStep % 4 === 2 ? 0.08 : 0.04);
  }

  function playRhodesKey(freq, t, dur) {
    try {
      const osc = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, t);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.detune.setValueAtTime(muzakDetune + (Math.random() * 4 - 2), t);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2, t);
      osc2.detune.setValueAtTime(muzakDetune + 3, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.045, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      osc.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(muzakGain);

      osc.start(t);
      osc2.start(t);
      osc.stop(t + dur);
      osc2.stop(t + dur);
    } catch (_) {}
  }

  function playBassNote(freq, t, dur) {
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.detune.setValueAtTime(muzakDetune, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      osc.connect(gain);
      gain.connect(muzakGain);

      osc.start(t);
      osc.stop(t + dur);
    } catch (_) {}
  }

  function playKick(t) {
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.1);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.connect(gain);
      gain.connect(muzakGain);

      osc.start(t);
      osc.stop(t + 0.12);
    } catch (_) {}
  }

  function playRimshot(t) {
    try {
      const bufferSize = audioCtx.sampleRate * 0.04;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2400, t);
      filter.Q.setValueAtTime(3.0, t);

      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(muzakGain);

      noise.start(t);
    } catch (_) {}
  }

  function playHiHat(t, vol) {
    try {
      const bufferSize = audioCtx.sampleRate * 0.025;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(7500, t);

      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(muzakGain);

      noise.start(t);
    } catch (_) {}
  }

  // SFX: Elevator Floor Chime / Ding
  function playDing() {
    if (!audioCtx || isMuted) return;
    resumeAudio();
    const t = audioCtx.currentTime;

    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, t); // D5
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1174.66, t); // D6

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(masterGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 1.2);
    osc2.stop(t + 1.2);
  }

  // SFX: Throat Clearing "Ahem"
  function playThroatClear() {
    if (!audioCtx || isMuted) return;
    resumeAudio();
    const t = audioCtx.currentTime;

    const bufferSize = audioCtx.sampleRate * 0.35;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(650, t);
    filter.frequency.linearRampToValueAtTime(950, t + 0.15);
    filter.frequency.linearRampToValueAtTime(500, t + 0.35);
    filter.Q.setValueAtTime(4.0, t);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    noise.start(t);
  }

  // SFX: Tactile Button Click
  function playClick() {
    if (!audioCtx || isMuted) return;
    resumeAudio();
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.03);

    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.03);
  }

  // SFX: Coffee Slurp
  function playCoffeeSlurp() {
    if (!audioCtx || isMuted) return;
    resumeAudio();
    const t = audioCtx.currentTime;
    const bufferSize = audioCtx.sampleRate * 0.45;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, t);
    filter.frequency.linearRampToValueAtTime(2600, t + 0.2);
    filter.frequency.linearRampToValueAtTime(800, t + 0.45);
    filter.Q.setValueAtTime(6.0, t);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    noise.start(t);
  }

  // SFX: DTMF Dial Tone for Intercom Easter Egg
  function playDTMFTone(f1, f2, dur) {
    if (!audioCtx || isMuted) return;
    resumeAudio();
    const t = audioCtx.currentTime;
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc1.frequency.setValueAtTime(f1, t);
    osc2.frequency.setValueAtTime(f2, t);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(masterGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + dur);
    osc2.stop(t + dur);
  }

  // SFX: Alarm Siren on 100% Cringe Game Over
  function playEmergencySiren() {
    if (!audioCtx || isMuted) return;
    resumeAudio();
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';

    // Two-tone rising siren
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.linearRampToValueAtTime(880, t + 0.25);
    osc.frequency.linearRampToValueAtTime(440, t + 0.5);
    osc.frequency.linearRampToValueAtTime(880, t + 0.75);
    osc.frequency.linearRampToValueAtTime(220, t + 1.2);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 1.2);
  }

  // SFX: Triumphant Penthouse Victory Fanfare
  function playVictoryFanfare() {
    if (!audioCtx || isMuted) return;
    resumeAudio();
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        if (!audioCtx) return;
        const t = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.8);
      }, idx * 110);
    });
  }

  // --- GAME STATE & CONSTANTS ---
  const state = {
    floor: 1,
    maxFloor: 99,
    speedMultiplier: 1, // 1x or 3x
    awkwardness: 12,    // 0 - 100%
    peakAwkwardness: 12,
    gaze: 'floor',      // 'floor', 'shoes', 'permit', 'phone', 'npc'
    shoesConsecutiveSec: 0,
    startTime: Date.now(),
    dialoguesAnswered: 0,
    gameOver: false,
    victory: false,
    doorHammerCount: 0,
    throatCooldownRemaining: 0,
    nodCooldownRemaining: 0
  };

  // Small Talk Scenarios
  const DIALOGUES = [
    {
      question: "Crazy weather we're having today, huh?",
      options: [
        { text: "Haha yeah, totally unpredictable!", delta: -6, type: "safe" },
        { text: "The sun is an uncaring ball of nuclear fire.", delta: 25, type: "wild" },
        { text: "I haven't felt rain in four fiscal quarters.", delta: 14, type: "weird" },
        { text: "Actually, meteorological models indicate...", delta: 18, type: "weird" }
      ]
    },
    {
      question: "Working hard, or hardly working? Haha...",
      options: [
        { text: "You know how it is! Keepin' busy.", delta: -8, type: "safe" },
        { text: "I haven't done actual work since 2019, Gary.", delta: 30, type: "wild" },
        { text: "My soul left my body during the 9 AM standup.", delta: 18, type: "weird" },
        { text: "Define 'working' under late-stage capitalism.", delta: 24, type: "weird" }
      ]
    },
    {
      question: "Big weekend planned? Anything exciting?",
      options: [
        { text: "Just relaxing, catching up on chores.", delta: -10, type: "safe" },
        { text: "I'm going to stare at a blank wall until Monday.", delta: 22, type: "weird" },
        { text: "I'm reorganizing my underground fallout bunker.", delta: 28, type: "wild" },
        { text: "Why, Gary? Are you asking me out?", delta: 40, type: "wild" }
      ]
    },
    {
      question: "Did you catch the game last night?",
      options: [
        { text: "Great match! Incredible fourth quarter.", delta: -7, type: "safe" },
        { text: "Sports are merely gladiatorial bread and circuses.", delta: 20, type: "weird" },
        { text: "Which game? The eternal cosmic game of suffering?", delta: 25, type: "wild" },
        { text: "The referee was clearly compromised by a shadow cartel.", delta: 28, type: "wild" }
      ]
    },
    {
      question: "Smells like someone microwaved fish on floor 4 again.",
      options: [
        { text: "Classic floor 4. Unbelievable.", delta: -8, type: "safe" },
        { text: "It was me, Gary. Salmon curry. Reheated twice.", delta: 35, type: "wild" },
        { text: "I actually find the aroma comforting.", delta: 25, type: "weird" },
        { text: "Fish have feelings too, you know.", delta: 15, type: "weird" }
      ]
    },
    {
      question: "Mondays, am I right?",
      options: [
        { text: "Ugh, tell me about it.", delta: -6, type: "safe" },
        { text: "Gary, today is Thursday.", delta: 22, type: "weird" },
        { text: "Time is an illusion manufactured by calendar companies.", delta: 20, type: "weird" },
        { text: "Every day is Monday in corporate purgatory.", delta: 30, type: "wild" }
      ]
    },
    {
      question: "Elevator's making a strange rattling sound, don't you think?",
      options: [
        { text: "Probably just the cables stretching. Nothing to worry about!", delta: -8, type: "safe" },
        { text: "We have approximately 12 seconds before freefall.", delta: 35, type: "wild" },
        { text: "I'm emotionally prepared for impact.", delta: 24, type: "weird" },
        { text: "If we crash, I'm eating your coffee first.", delta: 32, type: "wild" }
      ]
    },
    {
      question: "Did you read that email from leadership about restructuring?",
      options: [
        { text: "Skimmed it! Lots of exciting synergy.", delta: -6, type: "safe" },
        { text: "I marked the CEO as spam three weeks ago.", delta: 28, type: "wild" },
        { text: "I believe AI will replace all of us by Tuesday.", delta: 20, type: "weird" },
        { text: "Are you offering me severance right now?", delta: 22, type: "weird" }
      ]
    },
    {
      question: "Long way up to 99, huh?",
      options: [
        { text: "Yup! Sure is.", delta: -5, type: "safe" },
        { text: "Not if we jump at the same time.", delta: 26, type: "wild" },
        { text: "I wonder what the terminal velocity is in here.", delta: 30, type: "wild" },
        { text: "Do you ever think about how tiny we are in this shaft?", delta: 18, type: "weird" }
      ]
    },
    {
      question: "I... uh, I like your shoes.",
      options: [
        { text: "Thanks! Got them on sale.", delta: -12, type: "safe" },
        { text: "I found them in the conference room closet.", delta: 22, type: "weird" },
        { text: "I haven't taken them off since October.", delta: 35, type: "wild" },
        { text: "Your shoes are an affront to ergonomics.", delta: 38, type: "wild" }
      ]
    }
  ];

  // DOM Elements
  const elFloorNum = document.getElementById('floor-number');
  const elAwkwardBar = document.getElementById('awkward-bar');
  const elAwkwardPercent = document.getElementById('awkward-percent');
  const elMeterStatus = document.getElementById('meter-status');
  const elTensionVignette = document.getElementById('tension-vignette');
  const elCabin = document.getElementById('cabin');

  // Gaze views
  const elShoesView = document.getElementById('player-shoes-view');
  const elPhoneView = document.getElementById('player-phone-view');

  // NPC elements
  const elNpcContainer = document.getElementById('npc-container');
  const elNpcBubble = document.getElementById('npc-bubble');
  const elNpcText = document.getElementById('npc-text');
  const elNpcEyeL = document.getElementById('npc-pupil-l');
  const elNpcEyeR = document.getElementById('npc-pupil-r');
  const elEyebrowL = document.getElementById('eyebrow-left');
  const elEyebrowR = document.getElementById('eyebrow-right');
  const elNpcMouth = document.getElementById('npc-mouth');
  const elNpcBlush = document.getElementById('npc-blush');
  const elSweatContainer = document.getElementById('sweat-container');
  const elCoffeeCup = document.getElementById('coffee-cup');

  // Dialogue card
  const elDialogueCard = document.getElementById('dialogue-card');
  const elDialoguePrompt = document.getElementById('dialogue-prompt');
  const elDialogueOptions = document.getElementById('dialogue-options');
  const elDialogueTimerBar = document.getElementById('dialogue-timer-bar');

  // Modals
  const elPermitFrame = document.getElementById('permit-frame');
  const elPermitModal = document.getElementById('permit-modal');
  const elBtnClosePermit = document.getElementById('btn-close-permit');
  const elBtnPermitDismiss = document.getElementById('btn-permit-dismiss');

  const elBtnEmergencyBell = document.getElementById('btn-emergency-bell');
  const elIntercomModal = document.getElementById('intercom-modal');
  const elBtnCloseIntercom = document.getElementById('btn-close-intercom');
  const elBtnHangup = document.getElementById('btn-hangup');

  const elGameOverModal = document.getElementById('game-over-modal');
  const elVictoryModal = document.getElementById('victory-modal');
  const elBtnRetry = document.getElementById('btn-retry');
  const elBtnReplay = document.getElementById('btn-replay');

  // Controls
  const elBtnSpeed = document.getElementById('btn-speed');
  const elSpeedLabel = document.getElementById('speed-label');
  const elBtnSound = document.getElementById('btn-sound');
  const elSoundIcon = document.getElementById('sound-icon');
  const elSoundLabel = document.getElementById('sound-label');

  const gazeButtons = document.querySelectorAll('.gaze-btn');
  const elBtnNod = document.getElementById('btn-nod');
  const elBtnThroat = document.getElementById('btn-throat');
  const elThroatLabel = document.getElementById('throat-label');
  const elBtnCloseDoor = document.getElementById('btn-close-door');

  // Dialogue state
  let activeDialogue = null;
  let dialogueTimer = null;
  let dialogueTimeLeft = 0;
  const DIALOGUE_DURATION = 8000; // 8 seconds to answer

  // --- GAZE SWITCHER ---
  function setGaze(newGaze) {
    if (state.gameOver || state.victory) return;
    initAudio();
    resumeAudio();

    state.gaze = newGaze;
    state.shoesConsecutiveSec = 0;

    // Update buttons
    gazeButtons.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-gaze') === newGaze);
    });

    // Toggle views
    elShoesView.classList.toggle('hidden', newGaze !== 'shoes');
    elPhoneView.classList.toggle('hidden', newGaze !== 'phone');

    // Update Gary's visual reaction
    elNpcContainer.classList.toggle('stared-at', newGaze === 'npc');

    if (newGaze === 'npc') {
      showGaryNervous(true);
      shakeScreen();
    } else {
      showGaryNervous(false);
    }
  }

  function showGaryNervous(isStaring) {
    if (isStaring) {
      elEyebrowL.classList.add('eyebrow-nervous-l');
      elEyebrowR.classList.add('eyebrow-nervous-r');
      elNpcMouth.className = 'npc-mouth grimace';
      elNpcBlush.style.opacity = '0.8';
      // Gary stares right back with horror
      elNpcEyeL.style.transform = 'translate(1px, 2px)';
      elNpcEyeR.style.transform = 'translate(-1px, 2px)';
      spawnSweatDrop();
    } else {
      elEyebrowL.classList.remove('eyebrow-nervous-l');
      elEyebrowR.classList.remove('eyebrow-nervous-r');
      elNpcMouth.className = 'npc-mouth neutral';
      elNpcBlush.style.opacity = Math.max(0, (state.awkwardness - 40) / 60).toFixed(2);
    }
  }

  function spawnSweatDrop() {
    const drop = document.createElement('div');
    drop.className = 'sweat-drop';
    drop.style.left = Math.random() > 0.5 ? '10px' : '70px';
    drop.style.top = `${15 + Math.random() * 20}px`;
    elSweatContainer.appendChild(drop);
    setTimeout(() => drop.remove(), 1200);
  }

  function shakeScreen() {
    elCabin.classList.remove('shake-screen');
    void elCabin.offsetWidth;
    elCabin.classList.add('shake-screen');
  }

  // Gary's Autonomous Eye Movement
  setInterval(() => {
    if (state.gaze === 'npc' || state.gameOver) return;

    // Darting procedural gaze
    const randX = (Math.random() - 0.5) * 8;
    const randY = (Math.random() - 0.5) * 6;
    elNpcEyeL.style.transform = `translate(${randX}px, ${randY}px)`;
    elNpcEyeR.style.transform = `translate(${randX}px, ${randY}px)`;

    // Procedural blink
    if (Math.random() > 0.7) {
      elNpcEyeL.parentElement.style.height = '2px';
      elNpcEyeR.parentElement.style.height = '2px';
      setTimeout(() => {
        elNpcEyeL.parentElement.style.height = '18px';
        elNpcEyeR.parentElement.style.height = '18px';
      }, 120);
    }
  }, 1600);

  // --- AWKWARDNESS & GAME LOOP ---
  function modifyAwkwardness(delta) {
    if (state.gameOver || state.victory) return;
    state.awkwardness = Math.max(0, Math.min(100, state.awkwardness + delta));
    if (state.awkwardness > state.peakAwkwardness) {
      state.peakAwkwardness = state.awkwardness;
    }
    updateMeterUI();

    if (state.awkwardness >= 100) {
      triggerGameOver();
    }
  }

  function updateMeterUI() {
    const pct = Math.round(state.awkwardness);
    elAwkwardBar.style.width = `${pct}%`;
    elAwkwardPercent.textContent = `${pct}%`;

    // Muzak Detuning tension
    if (state.awkwardness > 50) {
      muzakDetune = (state.awkwardness - 50) * 8; // sags up to 400 cents
      elTensionVignette.classList.add('tension-high');
    } else {
      muzakDetune = 0;
      elTensionVignette.classList.remove('tension-high');
    }

    // Status label
    if (pct < 25) {
      elMeterStatus.textContent = "Tolerable Silence";
      elMeterStatus.style.color = "#10b981";
    } else if (pct < 55) {
      elMeterStatus.textContent = "Visible Perspiration";
      elMeterStatus.style.color = "#f59e0b";
    } else if (pct < 85) {
      elMeterStatus.textContent = "Suffocating Tension";
      elMeterStatus.style.color = "#f97316";
    } else {
      elMeterStatus.textContent = "CRITICAL CRINGE OVERLOAD";
      elMeterStatus.style.color = "#ef4444";
    }

    // Sweat generation
    if (pct > 65 && Math.random() > 0.6) {
      spawnSweatDrop();
    }
  }

  // --- ELEVATOR ASCENT & FLOOR PROGRESSION ---
  let floorInterval = null;

  function startElevator() {
    if (floorInterval) clearInterval(floorInterval);
    const intervalMs = 1200 / state.speedMultiplier;

    floorInterval = setInterval(() => {
      if (state.gameOver || state.victory) return;

      state.floor++;
      elFloorNum.textContent = state.floor < 10 ? `0${state.floor}` : state.floor;
      playDing();

      // Floor button highlight
      const currBtn = document.getElementById('panel-btn-curr');
      if (currBtn) currBtn.textContent = state.floor < 10 ? `0${state.floor}` : state.floor;

      // Natural awkwardness creep based on current gaze
      processGazePassive();

      // Trigger random small talk
      if (!activeDialogue && state.floor < 95 && Math.random() < 0.28) {
        triggerSmallTalk();
      }

      // Check Victory
      if (state.floor >= state.maxFloor) {
        triggerVictory();
      }
    }, intervalMs);
  }

  function processGazePassive() {
    switch (state.gaze) {
      case 'floor':
        // Looking up at LED is neutral / slightly relaxing
        modifyAwkwardness(-0.5);
        break;
      case 'shoes':
        state.shoesConsecutiveSec++;
        if (state.shoesConsecutiveSec > 6) {
          // Gary notices you staring at feet and thinks you're judging his loafers
          modifyAwkwardness(2.5);
          showGarySpeech("Are... are my socks mismatched?");
        } else {
          modifyAwkwardness(-1.2);
        }
        break;
      case 'permit':
        modifyAwkwardness(-0.8);
        break;
      case 'phone':
        // Scrolling dead phone
        modifyAwkwardness(-0.8);
        break;
      case 'npc':
        // Eye contact is devastating!
        modifyAwkwardness(4.5);
        spawnSweatDrop();
        break;
    }
  }

  // --- SMALL TALK SYSTEM ---
  let dialogueIndex = 0;

  function triggerSmallTalk() {
    if (activeDialogue || state.gameOver || state.victory) return;

    const dialogue = DIALOGUES[dialogueIndex % DIALOGUES.length];
    dialogueIndex++;
    activeDialogue = dialogue;

    showGarySpeech(dialogue.question);

    // Show dialogue card
    elDialoguePrompt.textContent = `"${dialogue.question}"`;
    elDialogueOptions.innerHTML = '';

    dialogue.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';

      let riskClass = 'risk-safe';
      let riskLabel = 'Polite';
      if (opt.type === 'wild') {
        riskClass = 'risk-wild';
        riskLabel = 'Dangerous';
      } else if (opt.type === 'weird') {
        riskClass = 'risk-weird';
        riskLabel = 'Unsettling';
      }

      btn.innerHTML = `
        <span>${idx + 1}. ${opt.text}</span>
        <span class="option-risk ${riskClass}">${riskLabel}</span>
      `;

      btn.onclick = () => selectDialogueOption(opt);
      elDialogueOptions.appendChild(btn);
    });

    elDialogueCard.classList.remove('hidden');

    // Start timer bar
    dialogueTimeLeft = DIALOGUE_DURATION;
    const tickInterval = 100;

    if (dialogueTimer) clearInterval(dialogueTimer);
    dialogueTimer = setInterval(() => {
      dialogueTimeLeft -= tickInterval;
      const pct = Math.max(0, (dialogueTimeLeft / DIALOGUE_DURATION) * 100);
      elDialogueTimerBar.style.width = `${pct}%`;

      if (dialogueTimeLeft <= 0) {
        clearInterval(dialogueTimer);
        // Expiration = Agonizing Silence Penalty!
        onDialogueExpired();
      }
    }, tickInterval);
  }

  function selectDialogueOption(option) {
    if (!activeDialogue) return;
    clearInterval(dialogueTimer);
    playClick();

    modifyAwkwardness(option.delta);
    state.dialoguesAnswered++;

    elDialogueCard.classList.add('hidden');
    activeDialogue = null;

    if (option.delta < 0) {
      showGarySpeech("Haha, yeah. Exactly.");
      elNpcMouth.className = 'npc-mouth smile';
      setTimeout(() => elNpcMouth.className = 'npc-mouth neutral', 2000);
    } else if (option.delta > 20) {
      showGarySpeech("...Right. Okay.");
      elNpcMouth.className = 'npc-mouth grimace';
      spawnSweatDrop();
      setTimeout(() => elNpcMouth.className = 'npc-mouth neutral', 3000);
    }
  }

  function onDialogueExpired() {
    if (!activeDialogue) return;
    elDialogueCard.classList.add('hidden');
    activeDialogue = null;

    // Suffering in silence
    modifyAwkwardness(25);
    showGarySpeech("... (excruciating deafening silence) ...");
    spawnSweatDrop();
    shakeScreen();
  }

  function showGarySpeech(text) {
    elNpcText.textContent = text;
    elNpcBubble.classList.remove('hidden');
    setTimeout(() => {
      elNpcBubble.classList.add('hidden');
    }, 4500);
  }

  // --- TACTICAL ACTIONS: NOD & THROAT CLEAR ---
  function doMicroNod() {
    if (state.gameOver || state.victory || state.nodCooldownRemaining > 0) return;
    initAudio();
    playClick();

    state.nodCooldownRemaining = 5;
    elBtnNod.disabled = true;

    // Head nod animation
    elCabin.classList.add('shake-screen');
    setTimeout(() => elCabin.classList.remove('shake-screen'), 200);

    // Reward: quick de-escalation
    modifyAwkwardness(-8);
    showGarySpeech("*Gary micro-nods back curtly*");

    const timer = setInterval(() => {
      state.nodCooldownRemaining--;
      if (state.nodCooldownRemaining <= 0) {
        clearInterval(timer);
        elBtnNod.disabled = false;
      }
    }, 1000);
  }

  function doClearThroat() {
    if (state.gameOver || state.victory || state.throatCooldownRemaining > 0) return;
    initAudio();
    playThroatClear();

    state.throatCooldownRemaining = 8;
    elBtnThroat.disabled = true;

    // Break tension!
    modifyAwkwardness(-14);
    showGarySpeech("Ahem!");

    const timer = setInterval(() => {
      state.throatCooldownRemaining--;
      elThroatLabel.textContent = `Cooldown (${state.throatCooldownRemaining}s)`;
      if (state.throatCooldownRemaining <= 0) {
        clearInterval(timer);
        elBtnThroat.disabled = false;
        elThroatLabel.textContent = `"Ahem" (Throat)`;
      }
    }, 1000);
  }

  // --- EASTER EGGS ---

  // Easter Egg: Lukewarm Coffee Cup
  elCoffeeCup.addEventListener('click', () => {
    initAudio();
    playCoffeeSlurp();
    modifyAwkwardness(-5);
    showGarySpeech("Ah... lukewarm. Delicious.");
    shakeScreen();
  });

  // Easter Egg: Otis Control Panel Buttons
  const panelBtns = document.querySelectorAll('.panel-btn');
  panelBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      initAudio();
      playClick();
      const floorAttr = e.target.getAttribute('data-floor');

      if (e.target.id === 'btn-close-door') {
        state.doorHammerCount++;
        shakeScreen();
        if (state.doorHammerCount >= 10) {
          showGarySpeech("Hammering the door button won't make it go faster!");
        } else {
          showGarySpeech("Doors remain firmly closed.");
        }
      } else if (floorAttr === '42') {
        showGarySpeech("Floor 42: The Answer to Life, Universe & Compliance.");
      } else if (floorAttr === '13') {
        showGarySpeech("Floor 13 was deleted by building architects!");
        const light = document.querySelector('.fixture-center');
        light.classList.add('light-flicker');
        setTimeout(() => light.classList.remove('light-flicker'), 1000);
      } else if (floorAttr === '99') {
        showGarySpeech("Floor 99: Executive Penthouse. Almost there!");
      }
    });
  });

  // Easter Egg: Emergency Intercom Hotline
  elBtnEmergencyBell.addEventListener('click', () => {
    initAudio();
    playClick();
    playDTMFTone(941, 1336, 0.4); // DTMF tone
    elIntercomModal.classList.remove('hidden');
  });

  elBtnCloseIntercom.addEventListener('click', () => elIntercomModal.classList.add('hidden'));
  elBtnHangup.addEventListener('click', () => {
    playClick();
    elIntercomModal.classList.add('hidden');
  });

  // Easter Egg: Inspection Certificate Frame
  elPermitFrame.addEventListener('click', () => {
    initAudio();
    playClick();
    elPermitModal.classList.remove('hidden');
  });

  elBtnClosePermit.addEventListener('click', () => elPermitModal.classList.add('hidden'));
  elBtnPermitDismiss.addEventListener('click', () => elPermitModal.classList.add('hidden'));

  // --- GAME OVER & VICTORY ---
  function triggerGameOver() {
    state.gameOver = true;
    if (floorInterval) clearInterval(floorInterval);
    if (dialogueTimer) clearInterval(dialogueTimer);

    playEmergencySiren();
    shakeScreen();

    // Stats
    const elapsedSec = Math.round((Date.now() - state.startTime) / 1000);
    document.getElementById('stat-floors').textContent = `${state.floor} / 99`;
    document.getElementById('stat-time').textContent = `${elapsedSec}s`;
    document.getElementById('stat-fatal-gaze').textContent =
      state.gaze === 'npc' ? 'Unblinking Eye Contact' : 'Suffocating Corporate Dread';

    const garyThoughts = [
      '"I should have taken the stairs."',
      '"Is this what dying of awkwardness feels like?"',
      '"I will never make small talk again as long as I live."',
      '"Why did neither of us press the stop button?"'
    ];
    document.getElementById('stat-gary-thought').textContent =
      garyThoughts[Math.floor(Math.random() * garyThoughts.length)];

    elGameOverModal.classList.remove('hidden');
  }

  function triggerVictory() {
    state.victory = true;
    if (floorInterval) clearInterval(floorInterval);
    if (dialogueTimer) clearInterval(dialogueTimer);

    playVictoryFanfare();
    showGarySpeech("FLOOR 99! I'M FREE! I SURVIVED!");
    elNpcMouth.className = 'npc-mouth smile';

    document.getElementById('stat-peak-cringe').textContent = `${Math.round(state.peakAwkwardness)}%`;
    document.getElementById('stat-topics').textContent = `${state.dialoguesAnswered} topics dodged`;

    setTimeout(() => {
      elVictoryModal.classList.remove('hidden');
    }, 1500);
  }

  function resetGame() {
    state.floor = 1;
    state.awkwardness = 12;
    state.peakAwkwardness = 12;
    state.gaze = 'floor';
    state.startTime = Date.now();
    state.dialoguesAnswered = 0;
    state.gameOver = false;
    state.victory = false;
    state.doorHammerCount = 0;

    elFloorNum.textContent = '01';
    elGameOverModal.classList.add('hidden');
    elVictoryModal.classList.add('hidden');
    elDialogueCard.classList.add('hidden');
    activeDialogue = null;

    setGaze('floor');
    updateMeterUI();
    startElevator();
  }

  elBtnRetry.addEventListener('click', resetGame);
  elBtnReplay.addEventListener('click', resetGame);

  // --- HUD CONTROLS ---
  // Speed Toggle (1x / 3x)
  elBtnSpeed.addEventListener('click', () => {
    initAudio();
    playClick();
    if (state.speedMultiplier === 1) {
      state.speedMultiplier = 3;
      elSpeedLabel.textContent = "3x SPEED";
      elBtnSpeed.style.background = "#d97706";
    } else {
      state.speedMultiplier = 1;
      elSpeedLabel.textContent = "1x SPEED";
      elBtnSpeed.style.background = "";
    }
    startElevator();
  });

  // Sound Toggle
  elBtnSound.addEventListener('click', () => {
    initAudio();
    resumeAudio();
    isMuted = !isMuted;
    if (isMuted) {
      elSoundIcon.textContent = "🔇";
      elSoundLabel.textContent = "MUZAK OFF";
      if (masterGain) masterGain.gain.setValueAtTime(0, audioCtx.currentTime);
    } else {
      elSoundIcon.textContent = "🔊";
      elSoundLabel.textContent = "MUZAK ON";
      if (masterGain) masterGain.gain.setValueAtTime(0.7, audioCtx.currentTime);
    }
  });

  // Gaze click handlers
  gazeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const gazeType = btn.getAttribute('data-gaze');
      setGaze(gazeType);
    });
  });

  elBtnNod.addEventListener('click', doMicroNod);
  elBtnThroat.addEventListener('click', doClearThroat);

  // --- KEYBOARD SHORTCUTS ---
  window.addEventListener('keydown', (e) => {
    initAudio();
    resumeAudio();

    if (e.key >= '1' && e.key <= '5') {
      const gazeMap = ['floor', 'shoes', 'permit', 'phone', 'npc'];
      const targetGaze = gazeMap[parseInt(e.key, 10) - 1];
      if (targetGaze) setGaze(targetGaze);
    } else if (e.code === 'Space') {
      e.preventDefault();
      doMicroNod();
    } else if (e.key === 'c' || e.key === 'C') {
      doClearThroat();
    } else if (e.key === 's' || e.key === 'S' || e.key === 'x' || e.key === 'X') {
      elBtnSpeed.click();
    } else if (e.key === 'm' || e.key === 'M') {
      elBtnSound.click();
    }
  });

  // Start on first user interaction anywhere
  const userGestureStart = () => {
    initAudio();
    resumeAudio();
    window.removeEventListener('click', userGestureStart);
    window.removeEventListener('keydown', userGestureStart);
    window.removeEventListener('touchstart', userGestureStart);
  };
  window.addEventListener('click', userGestureStart);
  window.addEventListener('keydown', userGestureStart);
  window.addEventListener('touchstart', userGestureStart);

  // Initial boot
  updateMeterUI();
  startElevator();

})();
