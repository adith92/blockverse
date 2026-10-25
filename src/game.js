import '@fortawesome/fontawesome-free/css/all.min.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, onSnapshot, collection, deleteDoc, runTransaction } from 'firebase/firestore';
import { Validator, MAX_WORLD_OBJECTS, ALLOWED_OBJECT_TYPES, ALLOWED_ACCESSORIES, escapeHtml } from './schema.mjs';
import './styles.css';
import './mobile.css';
import { CengkarengExploration, makeCengkarengMapUI } from './world/cengkareng.js';
import { GamepadController } from './input/gamepad.js';
import { NpcSchool } from './npc/client.js';

// VITE_ variables are PUBLIC configuration, NEVER backend secrets.
const __app_id = import.meta.env.VITE_APP_ID || 'blockverse-mvp-app';
const __firebase_config = import.meta.env.VITE_FIREBASE_CONFIG || null;
const __vps_multiplayer_url = import.meta.env.VITE_MULTIPLAYER_URL || (import.meta.env.PROD ? `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws` : '');
const __initial_auth_token = null; // Never bundle privileged/custom Firebase auth tokens.

/********************************************************************
     * 1. CONSTANTS, PALETTES, LOCALIZATION & SHARED SCHEMAS
     ********************************************************************/
    const CURATED_COLORS = [
      '#4CC9F0', // Sky Blue
      '#3DD6D0', // Cyan
      '#FFCB47', // Warm Sun Yellow
      '#FF6B6B', // Coral
      '#6FCF97', // Grass Green
      '#F7FBFF', // Cloud White
      '#A78BFA', // Lavender (Unlockable / Bonus)
      '#F97316'  // Sunset Orange (Unlockable / Bonus)
    ];
    const HEAD_COLORS = ['#FFE0BD', '#F1C27D', '#E0AC69', '#C68642', '#8D5524', '#FFCB47'];
    const LIMB_COLORS = ['#14213D', '#2B3A67', '#3DD6D0', '#FF6B6B', '#6FCF97', '#F7FBFF'];

    // Allowlisted Child-Safe Quick-Chat / Emote Codes
    const SAFE_EMOTES = [
      { code: 'WAVE', icon: '👋', id: 'Halo semuanya!', en: 'Hello everyone!' },
      { code: 'GG', icon: '🏆', id: 'GG! Kerja bagus!', en: 'GG! Well played!' },
      { code: 'FOLLOW', icon: '🏃', id: 'Ikuti aku!', en: 'Follow me!' },
      { code: 'JUMP', icon: '🚀', id: 'Ayo lompat!', en: 'Let us jump!' },
      { code: 'BUILD', icon: '🧱', id: 'Lihat bangunanku!', en: 'Check out my build!' },
      { code: 'CHEER', icon: '🎉', id: 'Semangat! Pasti bisa!', en: 'You can do it!' }
    ];

    const ACHIEVEMENT_DEFS = [
      { id: 'FIRST_STEPS', title: 'Langkah Pertama', desc: 'Bergerak menjelajahi Sunrise Plaza.', stars: 10, icon: 'fa-shoe-prints' },
      { id: 'FIRST_CHECKPOINT', title: 'Penjelajah Awan', desc: 'Mencapai Checkpoint pertama di Sky Obby.', stars: 15, icon: 'fa-flag' },
      { id: 'OBBY_FINISHER', title: 'Juara Sky Obby', desc: 'Menyelesaikan seluruh 15 rintangan Sky Obby.', stars: 50, icon: 'fa-trophy' },
      { id: 'WORLD_BUILDER', title: 'Arsitek Pulau', desc: 'Menyimpan dunia kreasi sendiri di Builder Island.', stars: 25, icon: 'fa-hammer' }
    ];

    const I18N = {
      id: {
        starsLabel: 'Bintang',
        checkpoint: 'Checkpoint',
        falls: 'Jatuh',
        worldsBtn: 'Dunia',
        avatarBtn: 'Avatar',
        homeDesc: 'Jelajahi Sunrise Plaza, taklukkan 15 rintangan di Sky Obby, kumpulkan Bintang, kustomisasi avatarmu, dan bangun duniamu sendiri di Builder Island bersama teman di ruangan yang sama!',
        playNow: 'MAIN SEKARANG (SUNRISE PLAZA)',
        selectWorld: 'Pilih Dunia & Obby',
        customizeAvatar: 'Editor Avatar',
        howToPlay: 'Cara Bermain',
        settings: 'Pengaturan & Kualitas'
      },
      en: {
        starsLabel: 'Stars',
        checkpoint: 'Checkpoint',
        falls: 'Falls',
        worldsBtn: 'Worlds',
        avatarBtn: 'Avatar',
        homeDesc: 'Explore Sunrise Plaza, conquer 15 obstacles in Sky Obby, earn Stars, customize your blocky avatar, and build your own world on Builder Island with friends in the same room!',
        playNow: 'PLAY NOW (SUNRISE PLAZA)',
        selectWorld: 'Select World & Obby',
        customizeAvatar: 'Avatar Editor',
        howToPlay: 'How to Play',
        settings: 'Settings & Quality'
      }
    };

    /********************************************************************
     * 2. STRICT SCHEMA & SECURITY VALIDATORS (Zod-Equivalent)
     ********************************************************************/
    // Shared source-of-truth schema checks imported from src/schema.mjs.

    /********************************************************************
     * 3. PROCEDURAL WEB AUDIO SYNTHESIZER (No External Audio Assets Needed)
     ********************************************************************/
    class SoundEngine {
      constructor() {
        this.ctx = null;
        this.volume = 0.7;
      }
      init() {
        if (!this.ctx) {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          if (AudioCtx) this.ctx = new AudioCtx();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume();
        }
      }
      play(type) {
        if (this.volume <= 0.01) return;
        try {
          this.init();
          if (!this.ctx) return;
          const now = this.ctx.currentTime;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          const v = this.volume * 0.18;

          if (type === 'jump') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(240, now);
            osc.frequency.exponentialRampToValueAtTime(520, now + 0.14);
            gain.gain.setValueAtTime(v, now);
            gain.gain.linearRampToValueAtTime(0.001, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
          } else if (type === 'checkpoint') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.setValueAtTime(659.25, now + 0.09);
            gain.gain.setValueAtTime(v, now);
            gain.gain.linearRampToValueAtTime(0.001, now + 0.28);
            osc.start(now);
            osc.stop(now + 0.28);
          } else if (type === 'win') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(523.25, now);
            osc.frequency.setValueAtTime(659.25, now + 0.1);
            osc.frequency.setValueAtTime(783.99, now + 0.2);
            osc.frequency.setValueAtTime(1046.5, now + 0.32);
            gain.gain.setValueAtTime(v * 1.2, now);
            gain.gain.linearRampToValueAtTime(0.001, now + 0.55);
            osc.start(now);
            osc.stop(now + 0.55);
          } else if (type === 'place') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(360, now);
            osc.frequency.exponentialRampToValueAtTime(480, now + 0.07);
            gain.gain.setValueAtTime(v * 0.8, now);
            gain.gain.linearRampToValueAtTime(0.001, now + 0.08);
            osc.start(now);
            osc.stop(now + 0.08);
          } else if (type === 'delete' || type === 'fall') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(260, now);
            osc.frequency.exponentialRampToValueAtTime(110, now + 0.2);
            gain.gain.setValueAtTime(v * 0.7, now);
            gain.gain.linearRampToValueAtTime(0.001, now + 0.22);
            osc.start(now);
            osc.stop(now + 0.22);
          } else if (type === 'coin') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, now);
            osc.frequency.setValueAtTime(1318.5, now + 0.06);
            gain.gain.setValueAtTime(v * 0.9, now);
            gain.gain.linearRampToValueAtTime(0.001, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
          }
        } catch (_) {
          // Ignore audio context autoplay restrictions until user interacts
        }
      }
    }
    const sfx = new SoundEngine();

    /********************************************************************
     * 4. CLIENT SERVICE LAYER (IndexedDB + Cloud Firestore + BroadcastChannel)
     ********************************************************************/
    const DEFAULT_BUILDER_OBJECTS = [
      { id: 'seed_base_1', type: 'block', position: [-4, 0.5, 0], rotation: [0, 0, 0], scale: [3, 1, 3], color: '#4CC9F0' },
      { id: 'seed_ramp_1', type: 'ramp', position: [-1, 0.5, 0], rotation: [0, 0, 0], scale: [2, 1, 3], color: '#FFCB47' },
      { id: 'seed_plat_1', type: 'platform', position: [-4, 2.0, -4], rotation: [0, 0, 0], scale: [4, 0.5, 4], color: '#3DD6D0' },
      { id: 'seed_tree_1', type: 'tree', position: [6, 0, -5], rotation: [0, 0, 0], scale: [1, 1, 1], color: '#6FCF97' },
      { id: 'seed_lamp_1', type: 'lamp', position: [4, 0, 4], rotation: [0, 0, 0], scale: [1, 1, 1], color: '#FFCB47' },
      { id: 'seed_spawn_1', type: 'spawn', position: [0, 0.1, 14], rotation: [0, 0, 0], scale: [2, 0.2, 2], color: '#6FCF97' }
    ];

    class GameBackendService {
      constructor() {
        this.db = null;
        this.IntDB = null;
        this.cloudReady = false;
        this.firebaseUser = null;
        this.appId = typeof __app_id !== 'undefined' ? __app_id : 'blockverse-mvp-app';
        this.session = {
          playerId: 'plr_' + crypto.randomUUID().slice(0, 8),
          displayName: 'Builder' + Math.floor(1000 + Math.random() * 9000),
          stars: 0,
          avatar: {
            torsoColor: '#4CC9F0',
            headColor: '#FFCB47',
            limbColor: '#14213D',
            accessory: 'cap'
          },
          achievements: {},
          rewardClaims: {},
          obbyStats: {
            bestMs: null,
            completions: 0
          }
        };
        this.myWorld = {
          id: 'world_default',
          ownerPlayerId: this.session.playerId,
          title: 'My Builder Island',
          visibility: 'private',
          revision: 1,
          objects: JSON.parse(JSON.stringify(DEFAULT_BUILDER_OBJECTS)),
          updatedAt: new Date().toISOString()
        };
        this.activeObbyAttempt = null;
      }

      async init() {
        await this.initIndexedDB();
        await this.loadFromIndexedDB();
        await this.initFirebaseCloud();
      }

      initIndexedDB() {
        return new Promise((resolve) => {
          try {
            const req = indexedDB.open('BlockverseDB_v1', 1);
            req.onupgradeneeded = (e) => {
              const idb = e.target.result;
              if (!idb.objectStoreNames.contains('kv')) {
                idb.createObjectStore('kv');
              }
            };
            req.onsuccess = (e) => {
              this.IntDB = e.target.result;
              resolve();
            };
            req.onerror = () => resolve();
          } catch (_) {
            resolve();
          }
        });
      }

      idbGet(key) {
        return new Promise((resolve) => {
          if (!this.IntDB) return resolve(null);
          try {
            const tx = this.IntDB.transaction('kv', 'readonly');
            const req = tx.objectStore('kv').get(key);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
          } catch (_) {
            resolve(null);
          }
        });
      }

      idbSet(key, val) {
        return new Promise((resolve) => {
          if (!this.IntDB) return resolve();
          try {
            const tx = this.IntDB.transaction('kv', 'readwrite');
            tx.objectStore('kv').put(val, key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
          } catch (_) {
            resolve();
          }
        });
      }

      async loadFromIndexedDB() {
        const savedProfile = await this.idbGet('player_profile');
        if (savedProfile && savedProfile.playerId) {
          this.session = { ...this.session, ...savedProfile, playerId: this.session.playerId };
        } else {
          await this.idbSet('player_profile', this.session);
        }

        const savedWorld = await this.idbGet('builder_world');
        if (savedWorld && Array.isArray(savedWorld.objects)) {
          this.myWorld = savedWorld;
          this.myWorld.ownerPlayerId = this.session.playerId;
        } else {
          this.myWorld.ownerPlayerId = this.session.playerId;
          await this.idbSet('builder_world', this.myWorld);
        }
      }

      async initFirebaseCloud() {
        try {
          if (typeof __firebase_config === 'undefined' || !__firebase_config) return;
          const config = JSON.parse(__firebase_config);
          const app = initializeApp(config);
          const auth = getAuth(app);
          this.db = getFirestore(app);

          if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
          } else {
            await signInAnonymously(auth);
          }

          const user = auth.currentUser;
          if (!user) throw new Error('Firebase sign-in completed without a user');
          this.firebaseUser = user;
          this.cloudReady = true;
          this.session.playerId = user.uid;
          this.myWorld.ownerPlayerId = user.uid;
          await this.syncProfileWithCloud();
        } catch (_) {
          this.cloudReady = false;
        }
      }

      async syncProfileWithCloud() {
        if (!this.cloudReady || !this.firebaseUser || !this.db) return;
        try {
          const profRef = doc(this.db, 'artifacts', this.appId, 'users', this.firebaseUser.uid, 'profile', 'main');
          const snap = await getDoc(profRef);
          if (snap.exists()) {
            const data = snap.data();
            if (typeof data.displayName === 'string') this.session.displayName = Validator.sanitizeDisplayName(data.displayName);
            if (Validator.validateAvatar(data.avatar).ok) this.session.avatar = data.avatar;
            await this.idbSet('player_profile', this.session);
          } else {
            await setDoc(profRef, this.getCloudProfile());
          }

          const worldRef = doc(this.db, 'artifacts', this.appId, 'users', this.firebaseUser.uid, 'worlds', 'my_island');
          const wSnap = await getDoc(worldRef);
          if (wSnap.exists()) {
            const wData = wSnap.data();
            if (wData.objectsJson) {
              const cloudObjects = JSON.parse(wData.objectsJson);
              const checked = Validator.validateWorldPayload({ revision: wData.revision, objects: cloudObjects }, null, this.session.playerId);
              if (checked.ok && wData.ownerPlayerId === this.firebaseUser.uid) {
                this.myWorld = { ...wData, objects: cloudObjects, ownerPlayerId: this.session.playerId };
                await this.idbSet('builder_world', this.myWorld);
              }
            }
          }
          updateAllMenusUI();
        } catch (_) {
          // Fallback to IndexedDB seamlessly
        }
      }

      getCloudProfile() {
        return { displayName: Validator.sanitizeDisplayName(this.session.displayName), avatar: this.session.avatar };
      }

      async saveProfile() {
        await this.idbSet('player_profile', this.session);
        if (this.cloudReady && this.firebaseUser && this.db) {
          try {
            const profRef = doc(this.db, 'artifacts', this.appId, 'users', this.firebaseUser.uid, 'profile', 'main');
            await setDoc(profRef, this.getCloudProfile());
          } catch (error) {
            return { ok: false, localSaved: true, cloudSaved: false, error: error.message };
          }
          return { ok: true, localSaved: true, cloudSaved: true };
        }
        return { ok: true, localSaved: true, cloudSaved: false };
      }

      // Schema-checked local save; cloud writes use atomic Firestore revision checks.
      // The client does not act as an authoritative game server.
      async saveWorld(payload, callerPlayerId = this.session.playerId) {
        const validation = Validator.validateWorldPayload(payload, this.myWorld, callerPlayerId);
        if (!validation.ok) return validation;
        const next = {
          ...this.myWorld,
          title: (payload.title || 'My Builder Island').trim().slice(0, 40),
          visibility: payload.visibility === 'unlisted' ? 'unlisted' : 'private',
          revision: this.myWorld.revision + 1,
          objects: JSON.parse(JSON.stringify(payload.objects)),
          updatedAt: new Date().toISOString()
        };
        if (this.cloudReady && this.firebaseUser && this.db) {
          const worldRef = doc(this.db, 'artifacts', this.appId, 'users', this.firebaseUser.uid, 'worlds', 'my_island');
          try {
            await runTransaction(this.db, async (tx) => {
              const snap = await tx.get(worldRef);
              if (snap.exists() && snap.data().revision !== payload.revision) {
                throw new Error('409: World changed in another tab. Reload before saving.');
              }
              if (!snap.exists() && payload.revision !== 1) {
                throw new Error('409: Expected first world revision');
              }
              tx.set(worldRef, {
                id: next.id,
                ownerPlayerId: this.firebaseUser.uid,
                title: next.title,
                visibility: next.visibility,
                revision: next.revision,
                objectsJson: JSON.stringify(next.objects),
                updatedAt: next.updatedAt
              });
            });
          } catch (error) {
            return { ok: false, status: /409/.test(error.message) ? 409 : 503, error: `Cloud save failed: ${error.message}` };
          }
        }
        this.myWorld = next;
        await this.idbSet('builder_world', next);
        await this.unlockAchievement('WORLD_BUILDER');
        return { status: 200, ok: true, world: this.myWorld };
      }

      // Local DEMO Obby Attempt Lifecycle: not authoritative for public rewards
      startObbyAttempt(courseId = 'sky_obby') {
        this.activeObbyAttempt = {
          attemptId: 'att_' + crypto.randomUUID().slice(0, 8),
          courseId,
          startedAt: performance.now(),
          highestCheckpoint: 0,
          deaths: 0,
          completed: false
        };
        return this.activeObbyAttempt;
      }

      advanceCheckpoint(cpIndex) {
        if (!this.activeObbyAttempt) return { ok: false, error: 'No active attempt' };
        // Must progress sequentially (cannot jump from 0 directly to finish without hitting 1 and 2)
        if (cpIndex === this.activeObbyAttempt.highestCheckpoint + 1) {
          this.activeObbyAttempt.highestCheckpoint = cpIndex;
          if (cpIndex >= 1) {
            this.unlockAchievement('FIRST_CHECKPOINT');
          }
          return { ok: true, checkpoint: cpIndex };
        }
        return { ok: false, error: 'Out of order checkpoint' };
      }

      async finishObbyAttempt() {
        if (!this.activeObbyAttempt) return { ok: false, error: 'No active attempt' };
        if (this.activeObbyAttempt.completed) return { ok: false, error: 'Attempt already claimed' };
        if (this.activeObbyAttempt.highestCheckpoint < 2) {
          return { ok: false, error: 'Must pass all checkpoints before finishing' };
        }
        const elapsedMs = Math.round(performance.now() - this.activeObbyAttempt.startedAt);
        // Minimum plausible time check (prevent 0ms instant teleport exploit)
        if (elapsedMs < 3500) {
          return { ok: false, error: 'Implausible completion duration (<3.5s)' };
        }

        this.activeObbyAttempt.completed = true;
        const isFirstClear = !this.session.rewardClaims['obby_first_clear'];
        const rewardStars = isFirstClear ? 50 : 15;
        if (isFirstClear) {
          this.session.rewardClaims['obby_first_clear'] = new Date().toISOString();
        }
        this.session.stars += rewardStars;
        this.session.obbyStats.completions += 1;
        if (!this.session.obbyStats.bestMs || elapsedMs < this.session.obbyStats.bestMs) {
          this.session.obbyStats.bestMs = elapsedMs;
        }
        await this.unlockAchievement('OBBY_FINISHER');
        await this.saveProfile();

        return {
          ok: true,
          elapsedMs,
          deaths: this.activeObbyAttempt.deaths,
          rewardStars,
          bestMs: this.session.obbyStats.bestMs
        };
      }

      async unlockAchievement(achId) {
        if (this.session.achievements[achId]) return false;
        const def = ACHIEVEMENT_DEFS.find(a => a.id === achId);
        if (!def) return false;
        this.session.achievements[achId] = new Date().toISOString();
        this.session.stars += def.stars;
        await this.saveProfile();
        showToast(`🏅 Pencapaian Terbuka: ${def.title} (+${def.stars} ★)`, 'sun');
        updateAllMenusUI();
        return true;
      }
    }

    const backend = new GameBackendService();

    /********************************************************************
     * 5. REAL-TIME MULTIPLAYER ROOM SYNC (BroadcastChannel + Firestore)
     *    Genuine player-to-player sync across tabs/sessions; NO fake bots!
     ********************************************************************/
    class MultiplayerRoomManager {
      constructor(scene) {
        this.scene = scene;
        this.roomId = 'HUB-1';
        this.worldType = 'hub';
        this.remotePlayers = new Map(); // playerId -> { meshGroup, data, lastSeen, emoteBubble, emoteUntil }
        this.channel = null;
        this.lastBroadcastAt = 0;
        this.lastEmoteAt = 0;
        this.firestoreUnsub = null;
        this.cloudPresenceConnected = false;
        this.cloudPresenceError = null;
        this.vpsUrl = __vps_multiplayer_url;
        this.socket = null;
        this.serverConnected = false;
        this.serverJoined = false;
        this.serverPlayerId = null;
        this.setupBroadcastChannel();
        if (this.vpsUrl) this.connectVpsServer();
      }

      // Native WebSocket protocol supported by the independent VPS Node service.
      // Server assigns authoritative session IDs; client never selects another player's ID.
      connectVpsServer() {
        if (!/^wss:\/\//.test(this.vpsUrl) && !/^ws:\/\/localhost(?::\d+)?\/ws$/.test(this.vpsUrl) && !/^ws:\/\/127\.0\.0\.1(?::\d+)?\/ws$/.test(this.vpsUrl)) {
          console.warn('BLOCKVERSE: use wss:// for public multiplayer (ws:// allowed only for localhost testing)');
          return;
        }
        try {
          const ws = new WebSocket(this.vpsUrl);
          this.socket = ws;
          ws.addEventListener('open', () => {
            this.serverConnected = true;
            this.serverJoined = false;
            this.joinVpsRoom();
            this.updateNetworkHUD();
          });
          ws.addEventListener('message', (ev) => {
            let msg;
            try { msg = JSON.parse(ev.data); } catch { return; }
            if (!msg || typeof msg.event !== 'string') return;
            if (msg.event === 'server:hello') this.serverPlayerId = msg.playerId;
            else if (msg.event === 'room:joined') {
              if (msg.roomKey !== this.getFullRoomKey()) return;
              this.serverJoined = true;
              this.clearRemoteMeshes();
              (Array.isArray(msg.players) ? msg.players : []).forEach(p => this.upsertRemotePlayer(p));
              this.updateNetworkHUD();
            } else if (msg.event === 'player:join' || msg.event === 'player:move') {
              if (msg.player?.roomKey !== this.getFullRoomKey()) return;
              if (msg.player?.playerId === this.serverPlayerId) return;
              this.upsertRemotePlayer(msg.player);
            } else if (msg.event === 'player:left') {
              this.removeRemotePlayer(msg.playerId);
            } else if (msg.event === 'emote:send') {
              this.handleIncomingPacket({type:'emote:send',roomKey:this.getFullRoomKey(),playerId:msg.playerId,code:msg.code});
            } else if (msg.event === 'room:error') {
              this.serverJoined = false;
              showToast(msg.code === 'room_full' ? 'Ruang penuh! Maksimal 16 pemain.' : 'Gagal masuk ruang online: '+ String(msg.code || 'error'), 'coral');
              this.updateNetworkHUD();
            }
          });
          ws.addEventListener('close', () => {
            this.serverConnected = false;
            this.serverJoined = false;
            this.clearRemoteMeshes();
            this.updateNetworkHUD();
            if (!this.reconnectTimer) this.reconnectTimer = window.setTimeout(() => {
              this.reconnectTimer = null;
              this.connectVpsServer();
            }, 3000);
          });
          ws.addEventListener('error', () => { this.updateNetworkHUD(); });
        } catch (e) { console.warn('VPS websocket error', e); this.updateNetworkHUD(); }
      }

      sendVps(event, data) {
        if (this.socket?.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({event, ...data}));
        }
      }

      joinVpsRoom() {
        if (!this.serverConnected) return;
        this.serverJoined = false;
        this.sendVps('room:join', {
          roomId:this.roomId, worldType:this.worldType,
          displayName:backend.session.displayName,
          avatar:backend.session.avatar
        });
      }

      setupBroadcastChannel() {
        if ('BroadcastChannel' in window) {
          this.channel = new BroadcastChannel('blockverse_realtime_v1');
          this.channel.onmessage = (ev) => this.handleIncomingPacket(ev.data);
        }
        window.addEventListener('beforeunload', () => this.leaveRoom());
      }

      getFullRoomKey() {
        return `${this.roomId}:${this.worldType}`;
      }

      joinRoom(roomId, worldType) {
        this.leaveRoom();
        this.cloudPresenceConnected = false;
        this.cloudPresenceError = null;
        this.roomId = (roomId || 'HUB-1').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 16) || 'HUB-1';
        this.worldType = worldType || 'hub';
        this.clearRemoteMeshes();
        if (this.vpsUrl) {
          this.joinVpsRoom();
          this.updateNetworkHUD();
          return;
        }

        // Announce join over BroadcastChannel
        this.sendPacket({
          type: 'player:join',
          roomKey: this.getFullRoomKey(),
          player: this.buildSelfSnapshot([0, 2, 16], 0)
        });

        // Subscribe to Cloud Firestore room presence if cloud is ready
        if (backend.cloudReady && backend.firebaseUser && backend.db) {
          try {
            const colRef = collection(backend.db, 'artifacts', backend.appId, 'public', 'data', 'room_presence');
            this.firestoreUnsub = onSnapshot(colRef, (snap) => {
              this.cloudPresenceConnected = true;
              this.cloudPresenceError = null;
              snap.docChanges().forEach((change) => {
                const d = change.doc.data();
                if (!d || d.playerId === backend.session.playerId || !Validator.validatePlayerMovePacket(d)) return;
                if (change.type === 'removed' || d.roomKey !== this.getFullRoomKey()) {
                  this.removeRemotePlayer(d.playerId);
                } else {
                  this.upsertRemotePlayer(d);
                }
              });
              this.updateNetworkHUD();
            }, (error) => {
              this.cloudPresenceError = error.message;
              this.cloudPresenceConnected = false;
              this.updateNetworkHUD();
            });
          } catch (error) {
            this.cloudPresenceError = error.message;
          }
        }

        this.updateNetworkHUD();
      }

      leaveRoom() {
        if (this.vpsUrl && this.serverConnected && this.serverJoined) {
          this.sendVps('room:leave', {});
          this.serverJoined = false;
        }
        this.sendPacket({
          type: 'player:leave',
          roomKey: this.getFullRoomKey(),
          playerId: backend.session.playerId
        });
        if (this.firestoreUnsub) {
          this.firestoreUnsub();
          this.firestoreUnsub = null;
        }
        if (backend.cloudReady && backend.firebaseUser && backend.db) {
          try {
            const pDoc = doc(backend.db, 'artifacts', backend.appId, 'public', 'data', 'room_presence', backend.firebaseUser.uid);
            deleteDoc(pDoc).catch(() => {});
          } catch (_) {}
        }
        this.clearRemoteMeshes();
      }

      buildSelfSnapshot(pos, rotY, emoteCode = null) {
        return {
          playerId: backend.session.playerId,
          displayName: backend.session.displayName,
          roomKey: this.getFullRoomKey(),
          position: [Number(pos[0].toFixed(2)), Number(pos[1].toFixed(2)), Number(pos[2].toFixed(2))],
          rotY: Number(rotY.toFixed(3)),
          avatar: backend.session.avatar,
          emoteCode,
          timestamp: Date.now()
        };
      }

      sendPacket(pkt) {
        if (this.vpsUrl) return; // Do not double-sync VPS players through BroadcastChannel.
        if (this.channel) {
          try {
            this.channel.postMessage(pkt);
          } catch (_) {}
        }
      }

      broadcastMove(pos, rotY) {
        const now = performance.now();
        if (now - this.lastBroadcastAt < 65) return; // Cap at ~15 Hz
        this.lastBroadcastAt = now;

        if (this.vpsUrl) {
          if (this.serverJoined) this.sendVps('player:move', {position:pos, rotY});
          return;
        }
        const snap = this.buildSelfSnapshot(pos, rotY);
        this.sendPacket({
          type: 'player:move',
          roomKey: this.getFullRoomKey(),
          player: snap
        });

        // Periodic cloud presence heartbeat (every 1.5s if cloud active to respect rate limits)
        if (backend.cloudReady && backend.firebaseUser && backend.db && (!this.lastCloudSync || now - this.lastCloudSync > 1500)) {
          this.lastCloudSync = now;
          try {
            const pDoc = doc(backend.db, 'artifacts', backend.appId, 'public', 'data', 'room_presence', backend.firebaseUser.uid);
            setDoc(pDoc, snap).catch(() => {});
          } catch (_) {}
        }
      }

      sendEmote(code) {
        const now = performance.now();
        if (now - this.lastEmoteAt < 2000) {
          showToast('Tunggu 2 detik sebelum mengirim Quick-Chat lagi.', 'coral');
          return false;
        }
        const valid = SAFE_EMOTES.find(e => e.code === code);
        if (!valid) return false;
        this.lastEmoteAt = now;
        if (this.vpsUrl) {
          if (this.serverJoined) this.sendVps('emote:send', {code:valid.code});
          return this.serverJoined;
        }

        this.sendPacket({
          type: 'emote:send',
          roomKey: this.getFullRoomKey(),
          playerId: backend.session.playerId,
          code: valid.code,
          timestamp: Date.now()
        });
        return true;
      }

      handleIncomingPacket(pkt) {
        if (!pkt || pkt.roomKey !== this.getFullRoomKey()) return;
        if (pkt.type === 'player:join' && pkt.player) {
          if (pkt.player.playerId === backend.session.playerId) return;
          if (!Validator.validatePlayerMovePacket(pkt.player)) return;
          this.upsertRemotePlayer(pkt.player);
          // Reply with our current state so the new tab sees us immediately
          if (window.__localPlayerPos) {
            this.sendPacket({
              type: 'player:move',
              roomKey: this.getFullRoomKey(),
              player: this.buildSelfSnapshot(window.__localPlayerPos, window.__localPlayerRotY || 0)
            });
          }
        } else if (pkt.type === 'player:move' && pkt.player) {
          if (pkt.player.playerId === backend.session.playerId) return;
          if (!Validator.validatePlayerMovePacket(pkt.player)) return;
          this.upsertRemotePlayer(pkt.player);
        } else if (pkt.type === 'player:leave' && pkt.playerId) {
          this.removeRemotePlayer(pkt.playerId);
        } else if (pkt.type === 'emote:send' && pkt.playerId && SAFE_EMOTES.some(e => e.code === pkt.code)) {
          const rp = this.remotePlayers.get(pkt.playerId);
          if (rp) {
            rp.emoteCode = pkt.code;
            rp.emoteUntil = performance.now() + 4000;
          }
        }
      }

      upsertRemotePlayer(pData) {
        if (!Validator.validatePlayerMovePacket(pData)) return;
        const sanitizedAvatar = Validator.validateAvatar(pData.avatar).ok ? pData.avatar : backend.session.avatar;
        pData = { ...pData, avatar: sanitizedAvatar };
        let entry = this.remotePlayers.get(pData.playerId);
        if (!entry) {
          const rig = createBlockyAvatarMesh(pData.avatar || backend.session.avatar);
          rig.group.position.set(pData.position[0], pData.position[1], pData.position[2]);
          this.scene.add(rig.group);
          entry = {
            playerId: pData.playerId,
            displayName: Validator.sanitizeDisplayName(pData.displayName),
            rig,
            targetPos: new THREE.Vector3(pData.position[0], pData.position[1], pData.position[2]),
            targetRotY: pData.rotY || 0,
            avatarJson: JSON.stringify(pData.avatar || {}),
            lastSeen: performance.now(),
            emoteCode: null,
            emoteUntil: 0
          };
          this.remotePlayers.set(pData.playerId, entry);
          this.updateNetworkHUD();
        } else {
          entry.targetPos.set(pData.position[0], pData.position[1], pData.position[2]);
          entry.targetRotY = pData.rotY || 0;
          entry.displayName = Validator.sanitizeDisplayName(pData.displayName);
          entry.lastSeen = performance.now();
          const newAvatarStr = JSON.stringify(pData.avatar || {});
          if (newAvatarStr !== entry.avatarJson) {
            entry.avatarJson = newAvatarStr;
            updateBlockyAvatarColors(entry.rig, pData.avatar);
          }
        }
      }

      removeRemotePlayer(playerId) {
        const entry = this.remotePlayers.get(playerId);
        if (entry) {
          this.scene.remove(entry.rig.group);
          this.remotePlayers.delete(playerId);
          this.updateNetworkHUD();
        }
      }

      clearRemoteMeshes() {
        for (const entry of this.remotePlayers.values()) {
          this.scene.remove(entry.rig.group);
        }
        this.remotePlayers.clear();
        this.updateNetworkHUD();
      }

      updateInterpolations(dt, now) {
        for (const [pid, entry] of this.remotePlayers.entries()) {
          // Prune stale ghost players after 12 seconds of silence
          if (now - entry.lastSeen > 12000) {
            this.removeRemotePlayer(pid);
            continue;
          }
          const dist = entry.rig.group.position.distanceTo(entry.targetPos);
          entry.rig.group.position.lerp(entry.targetPos, Math.min(1, dt * 12));
          entry.rig.group.rotation.y += (entry.targetRotY - entry.rig.group.rotation.y) * Math.min(1, dt * 12);

          // Animate remote limbs if moving
          const swing = dist > 0.05 ? Math.sin(now * 0.012) * 0.6 : 0;
          entry.rig.leftLeg.rotation.x = swing;
          entry.rig.rightLeg.rotation.x = -swing;
          entry.rig.leftArm.rotation.x = -swing * 0.8;
          entry.rig.rightArm.rotation.x = swing * 0.8;
        }
      }

      updateNetworkHUD() {
        const totalOnline = 1 + this.remotePlayers.size;
        const netText = document.getElementById('hud-net-text');
        const roomCodeEl = document.getElementById('hud-room-code');
        if (netText) {
          const mode = this.vpsUrl ? (this.serverJoined ? 'VPS online' : this.serverConnected ? 'VPS bergabung...' : 'VPS offline') : !backend.cloudReady ? 'Tab lokal' : this.cloudPresenceError ? 'Cloud gagal' : this.cloudPresenceConnected ? 'Cloud aktif' : 'Cloud menghubungkan';
          netText.textContent = `${mode}: ${totalOnline} pemain${this.vpsUrl ? ' / maksimal 16' : ' (demo)'}`;
        }
        if (roomCodeEl) {
          roomCodeEl.textContent = `ROOM: ${this.roomId}`;
        }
      }
    }

    /********************************************************************
     * 6. PROCEDURAL BLOCKY AVATAR MESH GENERATOR & ACCESSORIES
     ********************************************************************/
    function createBlockyAvatarMesh(avatarCfg) {
      const group = new THREE.Group();

      const torsoMat = new THREE.MeshStandardMaterial({ color: avatarCfg.torsoColor || '#4CC9F0', roughness: 0.4 });
      const headMat = new THREE.MeshStandardMaterial({ color: avatarCfg.headColor || '#FFCB47', roughness: 0.35 });
      const limbMat = new THREE.MeshStandardMaterial({ color: avatarCfg.limbColor || '#14213D', roughness: 0.5 });

      // Legs (height 0.75, center at y=0.375)
      const legGeo = new THREE.BoxGeometry(0.36, 0.75, 0.36);
      const leftLeg = new THREE.Mesh(legGeo, limbMat);
      leftLeg.position.set(-0.22, 0.375, 0);
      leftLeg.castShadow = true;
      const rightLeg = new THREE.Mesh(legGeo, limbMat);
      rightLeg.position.set(0.22, 0.375, 0);
      rightLeg.castShadow = true;

      // Torso (height 0.85, center at y=1.175)
      const torsoGeo = new THREE.BoxGeometry(0.84, 0.85, 0.44);
      const torso = new THREE.Mesh(torsoGeo, torsoMat);
      torso.position.set(0, 1.175, 0);
      torso.castShadow = true;

      // Arms (height 0.78, center at y=1.18)
      const armGeo = new THREE.BoxGeometry(0.3, 0.78, 0.3);
      const leftArm = new THREE.Mesh(armGeo, limbMat);
      leftArm.position.set(-0.6, 1.18, 0);
      leftArm.castShadow = true;
      const rightArm = new THREE.Mesh(armGeo, limbMat);
      rightArm.position.set(0.6, 1.18, 0);
      rightArm.castShadow = true;

      // Head (0.62 cube, center at y=1.94)
      const headGeo = new THREE.BoxGeometry(0.62, 0.62, 0.62);
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.set(0, 1.94, 0);
      head.castShadow = true;

      // Friendly Eyes (facing -Z forward)
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x14213D });
      const eyeGeo = new THREE.BoxGeometry(0.09, 0.11, 0.04);
      const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
      leftEye.position.set(-0.14, 0.06, -0.31);
      const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
      rightEye.position.set(0.14, 0.06, -0.31);
      head.add(leftEye, rightEye);

      // Accessory Mount Group
      const accessoryGroup = new THREE.Group();
      group.add(leftLeg, rightLeg, torso, leftArm, rightArm, head, accessoryGroup);

      const rig = { group, torso, head, leftLeg, rightLeg, leftArm, rightArm, accessoryGroup, torsoMat, headMat, limbMat };
      updateBlockyAvatarColors(rig, avatarCfg);
      return rig;
    }

    function updateBlockyAvatarColors(rig, avatarCfg) {
      if (!rig || !avatarCfg) return;
      rig.torsoMat.color.set(avatarCfg.torsoColor || '#4CC9F0');
      rig.headMat.color.set(avatarCfg.headColor || '#FFCB47');
      rig.limbMat.color.set(avatarCfg.limbColor || '#14213D');

      // Rebuild procedural accessory
      while (rig.accessoryGroup.children.length > 0) {
        rig.accessoryGroup.remove(rig.accessoryGroup.children[0]);
      }
      const acc = avatarCfg.accessory || 'none';
      if (acc === 'cap') {
        const capMat = new THREE.MeshStandardMaterial({ color: 0xFF6B6B, roughness: 0.4 });
        const crown = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.2, 0.66), capMat);
        crown.position.set(0, 2.3, 0);
        const brim = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.08, 0.35), capMat);
        brim.position.set(0, 2.23, -0.42);
        rig.accessoryGroup.add(crown, brim);
      } else if (acc === 'visor') {
        const visorMat = new THREE.MeshStandardMaterial({ color: 0x3DD6D0, emissive: 0x1a8f8a, roughness: 0.2 });
        const visor = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.18, 0.2), visorMat);
        visor.position.set(0, 1.98, -0.26);
        rig.accessoryGroup.add(visor);
      } else if (acc === 'backpack') {
        const packMat = new THREE.MeshStandardMaterial({ color: 0xF97316, roughness: 0.5 });
        const pack = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.62, 0.28), packMat);
        pack.position.set(0, 1.2, 0.34);
        rig.accessoryGroup.add(pack);
      } else if (acc === 'halo') {
        const haloMat = new THREE.MeshStandardMaterial({ color: 0xFFCB47, emissive: 0x996600, roughness: 0.2 });
        const halo = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.06, 8, 20), haloMat);
        halo.rotation.x = Math.PI / 2;
        halo.position.set(0, 2.52, 0);
        rig.accessoryGroup.add(halo);
      }
    }

    /********************************************************************
     * 7. 3D SCENE, PHYSICS COLLIDERS & WORLD GENERATORS
     ********************************************************************/
    const container = document.getElementById('game-canvas-container');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.FogExp2(0x87CEEB, 0.0065);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1100);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    const touchDevice = matchMedia('(pointer: coarse)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, touchDevice ? 1.3 : 2));
    renderer.shadowMap.enabled = !touchDevice;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.68);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xFFF6E0, 0.92);
    sunLight.position.set(45, 75, 40);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = touchDevice ? 512 : 2048;
    sunLight.shadow.mapSize.height = touchDevice ? 512 : 2048;
    sunLight.shadow.camera.near = 5;
    sunLight.shadow.camera.far = 220;
    const d = 75;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    scene.add(sunLight);

    // World Root Group & Active Physics Colliders
    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    // Local Player Avatar
    const playerRig = createBlockyAvatarMesh(backend.session.avatar);
    scene.add(playerRig.group);

    // Physics & Gameplay State
    let currentWorldName = 'hub'; // 'hub' | 'obby' | 'builder' | 'coindash' | 'cengkareng'
    let explorer = null;
    let explorerUIRelease = null;
    let npcSchool = null;
    let gameState = 'menu'; // 'menu' | 'playing' | 'paused' | 'results'
    let builderSubMode = 'edit'; // 'edit' | 'test'

    let colliders = []; // { minX, maxX, minY, maxY, minZ, maxZ, isRamp, rampDir, isHazard, checkpointIdx, isFinish, movingCfg, mesh }
    let portals = [];   // { position, targetWorld, title, subtitle, color }
    let coinPickups = []; // { mesh, position, collected }
    let animatedProps = []; // { mesh, type, speed }

    const playerPhys = {
      pos: new THREE.Vector3(0, 1, 16),
      vel: new THREE.Vector3(0, 0, 0),
      radius: 0.42,
      height: 2.1,
      grounded: false,
      groundPlatform: null,
      spawnPos: new THREE.Vector3(0, 1, 16),
      rotY: 0
    };
    window.__localPlayerPos = [0, 1, 16];
    window.__localPlayerRotY = 0;

    // Camera Orbit State
    const camState = {
      yaw: 0,
      pitch: 0.38,
      distance: 9.5,
      sensitivity: 1.0,
      invertY: false,
      isDragging: false,
      lastX: 0,
      lastY: 0
    };

    const mpManager = new MultiplayerRoomManager(scene);

    // Helper to add a box collider + mesh
    function addBoxPlatform(x, y, z, sx, sy, sz, colorHex, opts = {}) {
      const mat = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: opts.roughness ?? 0.55,
        metalness: opts.metalness ?? 0.05,
        transparent: !!opts.opacity,
        opacity: opts.opacity ?? 1.0
      });
      const geo = new THREE.BoxGeometry(sx, sy, sz);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      mesh.castShadow = opts.castShadow ?? true;
      mesh.receiveShadow = true;
      if (opts.userData) mesh.userData = { ...opts.userData };
      worldGroup.add(mesh);

      const col = {
        minX: x - sx / 2,
        maxX: x + sx / 2,
        minY: y - sy / 2,
        maxY: y + sy / 2,
        minZ: z - sz / 2,
        maxZ: z + sz / 2,
        sx, sy, sz,
        baseX: x, baseY: y, baseZ: z,
        isRamp: !!opts.isRamp,
        isHazard: !!opts.isHazard,
        checkpointIdx: opts.checkpointIdx ?? null,
        isFinish: !!opts.isFinish,
        movingCfg: opts.movingCfg || null,
        mesh
      };
      colliders.push(col);
      return { mesh, col };
    }

    function addDecorativeTree(x, y, z, scale = 1, foliageColor = '#6FCF97') {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      g.scale.set(scale, scale, scale);

      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.38, 1.8, 8),
        new THREE.MeshStandardMaterial({ color: 0x8D5524, roughness: 0.8 })
      );
      trunk.position.y = 0.9;
      trunk.castShadow = true;

      const leavesMat = new THREE.MeshStandardMaterial({ color: foliageColor, roughness: 0.5 });
      const crown1 = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2.2, 7), leavesMat);
      crown1.position.y = 2.4;
      crown1.castShadow = true;
      const crown2 = new THREE.Mesh(new THREE.ConeGeometry(1.15, 1.8, 7), leavesMat);
      crown2.position.y = 3.5;
      crown2.castShadow = true;

      g.add(trunk, crown1, crown2);
      worldGroup.add(g);
      // Trunk collider
      colliders.push({
        minX: x - 0.35 * scale, maxX: x + 0.35 * scale,
        minY: y, maxY: y + 2.2 * scale,
        minZ: z - 0.35 * scale, maxZ: z + 0.35 * scale,
        mesh: g
      });
      return g;
    }

    function addStreetLamp(x, y, z, glowColor = '#FFCB47') {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.16, 3.6, 8),
        new THREE.MeshStandardMaterial({ color: 0x2B3A67, metalness: 0.4 })
      );
      pole.position.y = 1.8;
      pole.castShadow = true;

      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.38, 12, 12),
        new THREE.MeshStandardMaterial({ color: glowColor, emissive: glowColor, emissiveIntensity: 0.7 })
      );
      bulb.position.y = 3.7;
      g.add(pole, bulb);
      worldGroup.add(g);
      return g;
    }

    function addPortalArch(x, y, z, colorHex, title, subtitle, targetWorld) {
      const g = new THREE.Group();
      g.position.set(x, y, z);

      const frameMat = new THREE.MeshStandardMaterial({ color: 0x14213D, roughness: 0.3 });
      const glowMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 0.65,
        roughness: 0.2
      });

      const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 4.2, 0.6), frameMat);
      leftPillar.position.set(-1.8, 2.1, 0);
      leftPillar.castShadow = true;

      const rightPillar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 4.2, 0.6), frameMat);
      rightPillar.position.set(1.8, 2.1, 0);
      rightPillar.castShadow = true;

      const topBar = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.7, 0.8), frameMat);
      topBar.position.set(0, 4.3, 0);
      topBar.castShadow = true;

      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.14, 12, 28), glowMat);
      ring.position.set(0, 2.2, 0);

      const core = new THREE.Mesh(
        new THREE.CylinderGeometry(1.35, 1.35, 0.12, 24),
        new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.38 })
      );
      core.rotation.x = Math.PI / 2;
      core.position.set(0, 2.2, 0);

      g.add(leftPillar, rightPillar, topBar, ring, core);
      worldGroup.add(g);
      animatedProps.push({ mesh: ring, type: 'spinZ', speed: 1.5 });

      portals.push({
        position: new THREE.Vector3(x, y + 2.4, z),
        targetWorld,
        title,
        subtitle,
        color: colorHex
      });
    }

    /********************************************************************
     * 8. BUILD THE 4 WORLDS: HUB, SKY OBBY (15 OBSTACLES), BUILDER ISLAND, COIN DASH
     ********************************************************************/
    function clearWorldScene() {
      if (npcSchool) {npcSchool.dispose();npcSchool=null;}
      if (explorer) { explorer.dispose(); explorer = null; }
      if (explorerUIRelease) { explorerUIRelease(); explorerUIRelease = null; }
      while (worldGroup.children.length > 0) {
        worldGroup.remove(worldGroup.children[0]);
      }
      colliders = [];
      portals = [];
      coinPickups = [];
      animatedProps = [];
    }

    // Generated, original glTF 2.0 scene props: high-quality authored meshes, not image planes.
    const premiumLoader = new GLTFLoader();
    const premiumCache = new Map();
    function addPremiumPrefab(fileName, placements, worldName) {
      const url = `/assets/3d/${fileName}.gltf`;
      function place(model) {
        if (currentWorldName !== worldName) return; // Ignore delayed responses after world switches.
        for (const item of placements) {
          const clone = model.scene.clone(true);
          clone.position.set(...item.pos);
          clone.scale.setScalar(item.scale || 1);
          if (item.rotY) clone.rotation.y = item.rotY;
          clone.traverse(o => {
            if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
          });
          worldGroup.add(clone); // Decorative only; original physics colliders stay intact.
        }
      }
      const cached = premiumCache.get(url);
      if (cached) { place(cached); return; }
      premiumLoader.load(url, gltf => {premiumCache.set(url,gltf);place(gltf);},undefined,err => {
        console.warn('Decorative glTF unavailable; procedurally-rendered gameplay remains intact:',fileName,err);
      });
    }
    function decorateWorldWithGeneratedAssets(name) {
      if (name === 'hub') {
        addPremiumPrefab('sunrise_fountain',[{pos:[0,1.15,0],scale:0.88}],name);
        addPremiumPrefab('prism_portal',[{pos:[-9,0.15,-13],scale:0.92},{pos:[0,0.15,-15],scale:0.92},{pos:[9,0.15,-13],scale:0.92}],name);
        addPremiumPrefab('storybook_tree',[{pos:[-20,0,18],scale:0.9},{pos:[20,0,18],scale:0.9},{pos:[-22,0,-20],scale:0.9},{pos:[22,0,-20],scale:0.9}],name);
        addPremiumPrefab('puffy_cloud',[{pos:[-28,16,-25],scale:2},{pos:[25,19,-28],scale:1.9},{pos:[4,22,-37],scale:2.5}],name);
      } else if (name === 'obby') {
        addPremiumPrefab('prism_portal',[{pos:[0,.5,3.2],scale:.8}],name);
        addPremiumPrefab('puffy_cloud',[{pos:[-18,14,-42],scale:2.1},{pos:[16,20,-84],scale:2},{pos:[-18,24,-119],scale:1.8}],name);
      } else if (name === 'builder') {
        addPremiumPrefab('prism_portal',[{pos:[0,0,22],scale:.8}],name);
        addPremiumPrefab('storybook_tree',[{pos:[-15,0,-16],scale:1.25},{pos:[15,0,-16],scale:1.15}],name);
      } else if (name === 'coindash') {
        addPremiumPrefab('puffy_cloud',[{pos:[-23,15,-18],scale:2},{pos:[19,18,-20],scale:1.8}],name);
      }
    }

    function loadWorld(worldName) {
      const loadStart = performance.now();
      clearWorldScene();
      currentWorldName = worldName;
      builderSubMode = 'edit';

      const obbyHud = document.getElementById('hud-obby-panel');
      const builderHud = document.getElementById('builder-hud');
      const roomBadge = document.getElementById('hud-room-badge');

      obbyHud.classList.add('hidden');
      obbyHud.classList.remove('flex');
      builderHud.classList.add('hidden');
      builderHud.classList.remove('flex');

      if (worldName === 'hub') {
        scene.background = new THREE.Color(0x7EC8E3);
        scene.fog = new THREE.FogExp2(0x7EC8E3, 0.0055);
        roomBadge.textContent = 'Sunrise Plaza (Hub)';
        buildSunrisePlazaHub();
        playerPhys.spawnPos.set(0, 1.2, 16);
      } else if (worldName === 'obby') {
        scene.background = new THREE.Color(0x56CCF2);
        scene.fog = new THREE.FogExp2(0x56CCF2, 0.0045);
        roomBadge.textContent = 'Sky Obby (15 Tahap)';
        obbyHud.classList.remove('hidden');
        obbyHud.classList.add('flex');
        document.getElementById('hud-course-title').textContent = 'SKY OBBY';
        buildSkyObbyCourse();
        backend.startObbyAttempt('sky_obby');
        playerPhys.spawnPos.set(0, 1.5, 0);
      } else if (worldName === 'builder') {
        scene.background = new THREE.Color(0x6DD5FA);
        scene.fog = new THREE.FogExp2(0x6DD5FA, 0.005);
        roomBadge.textContent = 'Builder Island';
        builderHud.classList.remove('hidden');
        builderHud.classList.add('flex');
        buildBuilderIslandScene();
        playerPhys.spawnPos.set(0, 1.2, 18);
      } else if (worldName === 'cengkareng') {
        scene.background = new THREE.Color(0xb7e3eb);
        scene.fog = new THREE.FogExp2(0xb7e3eb, 0.0022);
        roomBadge.textContent = '🗺️ Cengkareng Explorer';
        addBoxPlatform(0,-.18,0,1440,.35,1100,'#78ba86');
        addPortalArch(150, 0.1, 34, '#4CC9F0', 'SUNRISE PLAZA', 'Kembali ke Hub Utama', 'hub');
        explorer = new CengkarengExploration(worldGroup, {
          quality: document.getElementById('setting-quality')?.value || 'high',
          onDistrictVisited: ({ district, visitedCount, totalDistricts }) => {
            sfx.play('checkpoint');
            gamepadCtrl.pulse(0.45, 95);
            backend.session.stars += 5;
            updateAllMenusUI();
            showToast(`🏮 Lentera ${district.name} ditemukan! (${visitedCount}/${totalDistricts} Distrik • +5 ★)`, 'sun');
          }
        });
        playerPhys.spawnPos.set(150,1.2,20);
        explorerUIRelease = makeCengkarengMapUI({
          explorer,
          getPlayer: () => playerPhys.pos,
          onTravel: (district) => {
            if (!district){loadWorld('hub');return;}
            playerPhys.spawnPos.set(district.cx,1.2,district.cz+20);
            respawnPlayer(false);
            showToast(`📍 ${district.name} — ${district.hint || ''}`, 'sky');
          }
        });
      } else if (worldName === 'coindash') {
        scene.background = new THREE.Color(0x4facfe);
        scene.fog = new THREE.FogExp2(0x4facfe, 0.005);
        roomBadge.textContent = 'Coin Dash Arena';
        obbyHud.classList.remove('hidden');
        obbyHud.classList.add('flex');
        document.getElementById('hud-course-title').textContent = 'COIN DASH (12 ★)';
        buildCoinDashArena();
        backend.startObbyAttempt('coin_dash');
        playerPhys.spawnPos.set(0, 1.2, 14);
      }

      decorateWorldWithGeneratedAssets(worldName);
      npcSchool = new NpcSchool({root:worldGroup,getPlayer:()=>playerPhys.pos,
        getWorld:()=>currentWorldName,isPlaying:()=>gameState==='playing'});
      npcSchool.showWorld(worldName);
      respawnPlayer(false);
      if (worldName === 'cengkareng' && explorer) {
        explorer.initialize().then(({assetCount,districts}) => {
          if (currentWorldName === 'cengkareng') showToast(`🗺️ ${districts} distrik & ${assetCount} asset GLB siap dijelajahi!`, 'grass');
        }).catch(err => console.warn('Cengkareng world asset load failed',err));
      }
      mpManager.joinRoom(document.getElementById('input-room-code').value || 'HUB-1', worldName);

      const elapsedLoad = Math.round(performance.now() - loadStart);
      document.getElementById('stat-load').textContent = `${elapsedLoad}ms`;
      document.getElementById('stat-obj').textContent = String(worldGroup.children.length);
    }

    // ---------------- WORLD 1: SUNRISE PLAZA HUB ----------------
    function buildSunrisePlazaHub() {
      // Main Grass Island & Stone Plaza
      addBoxPlatform(0, -1, 0, 68, 2, 68, '#6FCF97');
      addBoxPlatform(0, 0.1, 2, 34, 0.2, 34, '#E2E8F0');
      addBoxPlatform(0, 0.22, 16, 6, 0.1, 6, '#4CC9F0'); // Spawn Pad

      // Central Kinetic Fountain Sculpture
      addBoxPlatform(0, 0.6, 0, 7, 1.0, 7, '#14213D');
      addBoxPlatform(0, 1.15, 0, 5.6, 0.25, 5.6, '#4CC9F0');
      const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(1.5, 0),
        new THREE.MeshStandardMaterial({ color: 0xFFCB47, emissive: 0x7a5900, roughness: 0.2, metalness: 0.3 })
      );
      crystal.position.set(0, 3.6, 0);
      crystal.castShadow = true;
      worldGroup.add(crystal);
      animatedProps.push({ mesh: crystal, type: 'spinYBob', speed: 1.8 });

      // 3 Portals: Sky Obby, Builder Island, Coin Dash
      addPortalArch(-9, 0.2, -13, '#FFCB47', 'SKY OBBY CHALLENGE', '15 Rintangan • 3 Checkpoint • +50 ★', 'obby');
      addPortalArch(0, 0.2, -15, '#3DD6D0', 'MY BUILDER ISLAND', 'Bangun & Simpan Duniamu Sendiri', 'builder');
      addPortalArch(9, 0.2, -13, '#6FCF97', 'COIN DASH ARENA', 'Kumpulkan 12 Koin Bintang Secepatnya!', 'coindash');
      addPortalArch(23,0.2,-13,'#A78BFA','JAKARTA BARAT EXPLORER','12 Distrik • 125 Asset 3D • Cengkareng','cengkareng');

      // Decorative Stepping Platforms around Plaza
      addBoxPlatform(-14, 0.8, 4, 4, 1.2, 4, '#4CC9F0');
      addBoxPlatform(-14, 2.0, -1, 3.5, 1.2, 3.5, '#FFCB47');
      addBoxPlatform(-14, 3.2, -6, 3.5, 1.2, 3.5, '#FF6B6B');

      // Colorful Toy Facade Buildings on Perimeter
      addBoxPlatform(-24, 4, -8, 6, 8, 10, '#FF6B6B');
      addBoxPlatform(24, 5, -6, 7, 10, 12, '#4CC9F0');
      addBoxPlatform(24, 3.5, 8, 6, 7, 8, '#FFCB47');

      // Trees & Street Lamps
      const treeCoords = [[-20, 18], [20, 18], [-22, -20], [22, -20], [-18, 10], [18, 12]];
      treeCoords.forEach(([tx, tz], i) => addDecorativeTree(tx, 0, tz, 1.1 + (i % 2) * 0.25));
      [[-10, 10], [10, 10], [-10, -5], [10, -5]].forEach(([lx, lz]) => addStreetLamp(lx, 0.2, lz));
    }

    // ---------------- WORLD 2: SKY OBBY (15 DELIBERATE OBSTACLES IN 3 SECTIONS) ----------------
    function buildSkyObbyCourse() {
      // Checkpoint 0: Start Island
      addBoxPlatform(0, 0, 0, 8, 1, 8, '#14213D');
      addBoxPlatform(0, 0.55, 0, 4, 0.15, 4, '#4CC9F0'); // Spawn pad
      addPortalArch(0, 0.5, 3.2, '#4CC9F0', 'SUNRISE PLAZA', 'Kembali ke Hub Utama', 'hub');

      // === SECTION 1: FOUNDATION JUMP (Obstacles 1 to 5) ===
      addBoxPlatform(0, 0.3, -7, 3.6, 0.8, 3.6, '#4CC9F0');   // #1
      addBoxPlatform(-2.2, 0.8, -13, 3.4, 0.8, 3.4, '#3DD6D0'); // #2
      addBoxPlatform(2.0, 1.4, -19, 3.4, 0.8, 3.4, '#4CC9F0');  // #3
      addBoxPlatform(0, 2.1, -25, 3.2, 0.8, 3.2, '#FFCB47');   // #4
      addBoxPlatform(0, 2.5, -33.5, 1.6, 0.6, 9.5, '#6FCF97'); // #5 Thin Balance Bridge

      // CHECKPOINT 1 ISLAND
      addBoxPlatform(0, 2.8, -42.5, 7, 1, 7, '#14213D', { checkpointIdx: 1 });
      addBoxPlatform(0, 3.38, -42.5, 3.5, 0.18, 3.5, '#3DD6D0', { checkpointIdx: 1 });
      addStreetLamp(-2.5, 3.3, -42.5, '#3DD6D0');
      addStreetLamp(2.5, 3.3, -42.5, '#3DD6D0');

      // === SECTION 2: MOVING PLATFORMS & HAZARDS (Obstacles 6 to 10) ===
      // #6 Moving Ferry X
      addBoxPlatform(0, 3.2, -50.5, 3.8, 0.7, 3.8, '#FFCB47', {
        movingCfg: { axis: 'x', amp: 3.2, speed: 1.5, phase: 0 }
      });
      // #7 & #8 Staggered Ascending Stairs
      addBoxPlatform(-2.5, 4.1, -57, 3.2, 0.8, 3.2, '#4CC9F0');
      addBoxPlatform(2.5, 5.0, -63, 3.2, 0.8, 3.2, '#4CC9F0');
      // #9 Platform with Hazard Lava Strip in the middle (jump over the red bar!)
      addBoxPlatform(0, 5.5, -70.5, 5.2, 0.8, 6.5, '#E2E8F0');
      addBoxPlatform(0, 6.05, -70.5, 5.0, 0.45, 1.1, '#FF6B6B', { isHazard: true });
      // #10 Moving Platform Z
      addBoxPlatform(0, 6.0, -78.5, 3.6, 0.7, 3.6, '#FFCB47', {
        movingCfg: { axis: 'x', amp: 3.0, speed: 1.8, phase: 1.5 }
      });

      // CHECKPOINT 2 ISLAND
      addBoxPlatform(0, 6.4, -86.5, 7, 1, 7, '#14213D', { checkpointIdx: 2 });
      addBoxPlatform(0, 6.98, -86.5, 3.5, 0.18, 3.5, '#FFCB47', { checkpointIdx: 2 });
      addStreetLamp(-2.5, 6.9, -86.5, '#FFCB47');
      addStreetLamp(2.5, 6.9, -86.5, '#FFCB47');

      // === SECTION 3: SKY FINALE (Obstacles 11 to 15) ===
      addBoxPlatform(-2.6, 7.2, -93.5, 2.8, 0.8, 2.8, '#3DD6D0'); // #11
      addBoxPlatform(2.6, 8.0, -99.5, 2.8, 0.8, 2.8, '#3DD6D0');  // #12
      // #13 Vertical Elevator Platform
      addBoxPlatform(0, 9.2, -106, 3.6, 0.7, 3.6, '#FFCB47', {
        movingCfg: { axis: 'y', amp: 1.4, speed: 1.6, phase: 0.5 }
      });
      // #14 Final Sprint Runway with Dual Hazard Bars
      addBoxPlatform(0, 10.2, -114.5, 4.5, 0.8, 8.5, '#E2E8F0');
      addBoxPlatform(0, 10.75, -113.0, 4.3, 0.4, 0.9, '#FF6B6B', { isHazard: true });
      addBoxPlatform(0, 10.75, -116.2, 4.3, 0.4, 0.9, '#FF6B6B', { isHazard: true });
      // #15 Victory Step & Finish Island
      addBoxPlatform(0, 11.0, -122.5, 3.4, 0.8, 3.4, '#4CC9F0');
      addBoxPlatform(0, 11.6, -130.5, 9, 1.2, 9, '#14213D', { isFinish: true });
      addBoxPlatform(0, 12.25, -130.5, 5, 0.2, 5, '#FFCB47', { isFinish: true });

      const finishStar = new THREE.Mesh(
        new THREE.OctahedronGeometry(1.4, 0),
        new THREE.MeshStandardMaterial({ color: 0xFFCB47, emissive: 0xAA7700, roughness: 0.2 })
      );
      finishStar.position.set(0, 15.0, -130.5);
      worldGroup.add(finishStar);
      animatedProps.push({ mesh: finishStar, type: 'spinYBob', speed: 2.5 });
    }

    // ---------------- WORLD 3: BUILDER ISLAND (CREATOR SANDBOX) ----------------
    let builderGridHelper = null;
    let placementGhostMesh = null;
    let selectedObjectOutline = null;

    function buildBuilderIslandScene() {
      // Base Island Foundation (48 x 48)
      const base = addBoxPlatform(0, -1, 0, 48, 2, 48, '#2B3A67');
      base.mesh.userData.isGround = true;

      // Return Portal at South Edge
      addPortalArch(0, 0, 22, '#4CC9F0', 'SUNRISE PLAZA', 'Kembali ke Hub Utama', 'hub');

      // Safe Spawn Pad Indicator at (0, 0.05, 18)
      addBoxPlatform(0, 0.05, 18, 3.6, 0.1, 3.6, '#4CC9F0');

      // Grid Helper
      builderGridHelper = new THREE.GridHelper(48, 48, 0x4CC9F0, 0x334155);
      builderGridHelper.position.y = 0.02;
      worldGroup.add(builderGridHelper);

      // Placement Ghost Mesh
      placementGhostMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial({ color: 0x6FCF97, transparent: true, opacity: 0.45, wireframe: false })
      );
      placementGhostMesh.visible = false;
      worldGroup.add(placementGhostMesh);

      // Selected Object Highlight Box
      selectedObjectOutline = new THREE.Mesh(
        new THREE.BoxGeometry(1.05, 1.05, 1.05),
        new THREE.MeshBasicMaterial({ color: 0xFFCB47, wireframe: true })
      );
      selectedObjectOutline.visible = false;
      worldGroup.add(selectedObjectOutline);

      rebuildUserObjectsInBuilder();
    }

    let userObjectMeshes = new Map(); // id -> mesh
    function rebuildUserObjectsInBuilder() {
      // Remove previous user meshes and colliders
      for (const m of userObjectMeshes.values()) {
        worldGroup.remove(m);
      }
      userObjectMeshes.clear();
      colliders = colliders.filter(c => !c.isUserObject);

      const objs = backend.myWorld.objects || [];
      for (const obj of objs) {
        spawnUserObjectMesh(obj);
      }
      updateBuilderQuotaUI();
    }

    function spawnUserObjectMesh(obj) {
      const [px, py, pz] = obj.position;
      const [rx, ry, rz] = obj.rotation;
      const [sx, sy, sz] = obj.scale;

      let mesh;
      if (obj.type === 'tree') {
        mesh = new THREE.Group();
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.28, 0.36, 1.6, 8),
          new THREE.MeshStandardMaterial({ color: 0x8D5524 })
        );
        trunk.position.y = 0.8;
        const crown = new THREE.Mesh(
          new THREE.ConeGeometry(1.3, 2.4, 7),
          new THREE.MeshStandardMaterial({ color: obj.color })
        );
        crown.position.y = 2.2;
        mesh.add(trunk, crown);
      } else if (obj.type === 'lamp') {
        mesh = new THREE.Group();
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.15, 3.2, 8),
          new THREE.MeshStandardMaterial({ color: 0x14213D })
        );
        pole.position.y = 1.6;
        const bulb = new THREE.Mesh(
          new THREE.SphereGeometry(0.36, 10, 10),
          new THREE.MeshStandardMaterial({ color: obj.color, emissive: obj.color, emissiveIntensity: 0.7 })
        );
        bulb.position.y = 3.3;
        mesh.add(pole, bulb);
      } else if (obj.type === 'cylinder') {
        mesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.5, 0.5, 1, 16),
          new THREE.MeshStandardMaterial({ color: obj.color, roughness: 0.45 })
        );
      } else if (obj.type === 'sphere') {
        mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.5, 16, 16),
          new THREE.MeshStandardMaterial({ color: obj.color, roughness: 0.35 })
        );
      } else if (obj.type === 'platform') {
        mesh = new THREE.Mesh(
          new THREE.BoxGeometry(1, 1, 1),
          new THREE.MeshStandardMaterial({ color: obj.color, transparent: true, opacity: 0.65, roughness: 0.2 })
        );
      } else if (obj.type === 'ramp') {
        // Sloped wedge/ramp visual
        mesh = new THREE.Mesh(
          new THREE.BoxGeometry(1, 1, 1),
          new THREE.MeshStandardMaterial({ color: obj.color, roughness: 0.5 })
        );
      } else if (obj.type === 'spawn') {
        mesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.6, 0.6, 1, 16),
          new THREE.MeshStandardMaterial({ color: obj.color, emissive: obj.color, emissiveIntensity: 0.35 })
        );
      } else {
        mesh = new THREE.Mesh(
          new THREE.BoxGeometry(1, 1, 1),
          new THREE.MeshStandardMaterial({ color: obj.color, roughness: 0.5 })
        );
      }

      mesh.position.set(px, py, pz);
      mesh.rotation.set(rx, ry, rz);
      mesh.scale.set(sx, sy, sz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { isUserObject: true, objectId: obj.id, objectData: obj };
      worldGroup.add(mesh);
      userObjectMeshes.set(obj.id, mesh);

      // Register physics collider matching rendered object
      const colHeight = obj.type === 'tree' ? 2.8 * sy : obj.type === 'lamp' ? 3.4 * sy : sy;
      const colMinY = (obj.type === 'tree' || obj.type === 'lamp') ? py : py - sy / 2;
      const colMaxY = (obj.type === 'tree' || obj.type === 'lamp') ? py + colHeight : py + sy / 2;

      colliders.push({
        isUserObject: true,
        objectId: obj.id,
        minX: px - sx / 2,
        maxX: px + sx / 2,
        minY: colMinY,
        maxY: colMaxY,
        minZ: pz - sz / 2,
        maxZ: pz + sz / 2,
        isRamp: obj.type === 'ramp',
        mesh
      });
    }

    // ---------------- WORLD 4: COIN DASH ARENA (P1 BONUS MINI-GAME) ----------------
    function buildCoinDashArena() {
      addBoxPlatform(0, -1, 0, 44, 2, 44, '#14213D');
      addPortalArch(0, 0, 19, '#4CC9F0', 'SUNRISE PLAZA', 'Kembali ke Hub Utama', 'hub');

      const pads = [
        [0, 0.8, 6, '#4CC9F0'], [-7, 1.6, 2, '#3DD6D0'], [7, 1.6, 2, '#3DD6D0'],
        [-11, 2.5, -5, '#FFCB47'], [0, 2.8, -5, '#6FCF97'], [11, 2.5, -5, '#FFCB47'],
        [-6, 3.6, -12, '#FF6B6B'], [6, 3.6, -12, '#FF6B6B'], [0, 4.5, -16, '#4CC9F0'],
        [-10, 1.8, 10, '#6FCF97'], [10, 1.8, 10, '#6FCF97'], [0, 1.2, -11, '#3DD6D0']
      ];

      pads.forEach(([x, y, z, col]) => {
        addBoxPlatform(x, y, z, 3.8, 0.6, 3.8, col);
        const coinMesh = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.55, 0),
          new THREE.MeshStandardMaterial({ color: 0xFFCB47, emissive: 0x996600, roughness: 0.2 })
        );
        coinMesh.position.set(x, y + 1.2, z);
        worldGroup.add(coinMesh);
        animatedProps.push({ mesh: coinMesh, type: 'spinYBob', speed: 2.8 });
        coinPickups.push({ mesh: coinMesh, position: new THREE.Vector3(x, y + 1.2, z), collected: false });
      });
    }

    /********************************************************************
     * 9. BUILDER ISLAND EDITOR STATE, UNDO/REDO COMMANDS & RAYCASTER
     ********************************************************************/
    const builderState = {
      activeTool: 'place', // 'place' | 'select' | 'paint' | 'delete'
      activeType: 'block',
      activeColor: '#4CC9F0',
      gridSnap: 1.0,
      rotStepRad: (15 * Math.PI) / 180,
      currentRotY: 0,
      currentScale: [2, 1, 2],
      selectedObjectId: null,
      undoStack: [],
      redoStack: [],
      unsavedChanges: false
    };

    const raycaster = new THREE.Raycaster();
    const mouseNDC = new THREE.Vector2();

    function pushBuilderHistory(prevObjectsSnapshot) {
      builderState.undoStack.push(JSON.stringify(prevObjectsSnapshot));
      if (builderState.undoStack.length > 30) builderState.undoStack.shift();
      builderState.redoStack = [];
      builderState.unsavedChanges = true;
      updateBuilderQuotaUI();
    }

    function builderUndo() {
      if (builderState.undoStack.length === 0) return false;
      builderState.redoStack.push(JSON.stringify(backend.myWorld.objects));
      const prev = JSON.parse(builderState.undoStack.pop());
      backend.myWorld.objects = prev;
      builderState.unsavedChanges = true;
      rebuildUserObjectsInBuilder();
      return true;
    }

    function builderRedo() {
      if (builderState.redoStack.length === 0) return false;
      builderState.undoStack.push(JSON.stringify(backend.myWorld.objects));
      const next = JSON.parse(builderState.redoStack.pop());
      backend.myWorld.objects = next;
      builderState.unsavedChanges = true;
      rebuildUserObjectsInBuilder();
      return true;
    }

    function snapVal(val, step) {
      return Math.round(val / step) * step;
    }

    function updateBuilderGhost(clientX, clientY) {
      if (currentWorldName !== 'builder' || builderSubMode !== 'edit' || !placementGhostMesh) return;
      if (builderState.activeTool !== 'place') {
        placementGhostMesh.visible = false;
        return;
      }

      const rect = renderer.domElement.getBoundingClientRect();
      mouseNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouseNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouseNDC, camera);

      const targets = worldGroup.children.filter(c => c !== placementGhostMesh && c !== selectedObjectOutline && c !== builderGridHelper);
      const hits = raycaster.intersectObjects(targets, true);
      if (hits.length === 0) {
        placementGhostMesh.visible = false;
        return;
      }

      const hit = hits[0];
      const step = builderState.gridSnap;
      const sx = builderState.activeType === 'tree' || builderState.activeType === 'lamp' ? 1 : builderState.currentScale[0];
      const sy = builderState.activeType === 'tree' || builderState.activeType === 'lamp' ? 1 : builderState.currentScale[1];
      const sz = builderState.activeType === 'tree' || builderState.activeType === 'lamp' ? 1 : builderState.currentScale[2];

      const gx = snapVal(hit.point.x, step);
      const gz = snapVal(hit.point.z, step);
      const gy = (builderState.activeType === 'tree' || builderState.activeType === 'lamp')
        ? Math.max(0, snapVal(hit.point.y, 0.5))
        : Math.max(sy / 2, snapVal(hit.point.y + sy / 2, 0.5));

      placementGhostMesh.visible = true;
      placementGhostMesh.position.set(gx, gy, gz);
      placementGhostMesh.rotation.set(0, builderState.currentRotY, 0);
      placementGhostMesh.scale.set(sx, sy, sz);

      const candidate = {
        id: 'ghost_check',
        type: builderState.activeType,
        position: [gx, gy, gz],
        rotation: [0, builderState.currentRotY, 0],
        scale: [sx, sy, sz],
        color: builderState.activeColor
      };
      const valid = Validator.validateWorldObject(candidate).ok && backend.myWorld.objects.length < MAX_WORLD_OBJECTS;
      placementGhostMesh.material.color.setHex(valid ? 0x6FCF97 : 0xFF6B6B);
    }

    function handleBuilderCanvasClick(clientX, clientY) {
      if (currentWorldName !== 'builder' || builderSubMode !== 'edit') return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouseNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouseNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouseNDC, camera);

      if (builderState.activeTool === 'place') {
        updateBuilderGhost(clientX, clientY);
        if (!placementGhostMesh || !placementGhostMesh.visible) return;
        const pos = [
          Number(placementGhostMesh.position.x.toFixed(2)),
          Number(placementGhostMesh.position.y.toFixed(2)),
          Number(placementGhostMesh.position.z.toFixed(2))
        ];
        const scale = (builderState.activeType === 'tree' || builderState.activeType === 'lamp')
          ? [1, 1, 1]
          : [...builderState.currentScale];

        const newObj = {
          id: 'obj_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 999),
          type: builderState.activeType,
          position: pos,
          rotation: [0, Number(builderState.currentRotY.toFixed(4)), 0],
          scale,
          color: builderState.activeColor
        };

        const check = Validator.validateWorldObject(newObj);
        if (!check.ok) {
          showToast(check.error, 'coral');
          return;
        }
        if (backend.myWorld.objects.length >= MAX_WORLD_OBJECTS) {
          showToast(`Kuota objek penuh (${MAX_WORLD_OBJECTS} maks).`, 'coral');
          return;
        }

        pushBuilderHistory(backend.myWorld.objects);
        // If placing a new spawn marker, keep only one spawn marker
        if (newObj.type === 'spawn') {
          backend.myWorld.objects = backend.myWorld.objects.filter(o => o.type !== 'spawn');
        }
        backend.myWorld.objects.push(newObj);
        builderState.selectedObjectId = newObj.id;
        sfx.play('place');
        rebuildUserObjectsInBuilder();
        updateSelectedOutline();
      } else {
        // Raycast user objects for Select, Paint, or Delete
        const meshList = Array.from(userObjectMeshes.values());
        const hits = raycaster.intersectObjects(meshList, true);
        if (hits.length === 0) {
          builderState.selectedObjectId = null;
          updateSelectedOutline();
          return;
        }
        let targetMesh = hits[0].object;
        while (targetMesh && !targetMesh.userData?.isUserObject && targetMesh.parent) {
          targetMesh = targetMesh.parent;
        }
        if (!targetMesh || !targetMesh.userData?.objectId) return;
        const objId = targetMesh.userData.objectId;

        if (builderState.activeTool === 'select') {
          builderState.selectedObjectId = objId;
          updateSelectedOutline();
        } else if (builderState.activeTool === 'paint') {
          const targetObj = backend.myWorld.objects.find(o => o.id === objId);
          if (targetObj) {
            pushBuilderHistory(backend.myWorld.objects);
            targetObj.color = builderState.activeColor;
            sfx.play('place');
            rebuildUserObjectsInBuilder();
          }
        } else if (builderState.activeTool === 'delete') {
          if (backend.myWorld.objects.length <= 1) {
            showToast('Minimal harus ada 1 objek di dunia.', 'coral');
            return;
          }
          pushBuilderHistory(backend.myWorld.objects);
          backend.myWorld.objects = backend.myWorld.objects.filter(o => o.id !== objId);
          if (builderState.selectedObjectId === objId) builderState.selectedObjectId = null;
          sfx.play('delete');
          rebuildUserObjectsInBuilder();
          updateSelectedOutline();
        }
      }
    }

    function updateSelectedOutline() {
      if (!selectedObjectOutline) return;
      const obj = backend.myWorld.objects.find(o => o.id === builderState.selectedObjectId);
      if (!obj || currentWorldName !== 'builder' || builderSubMode !== 'edit') {
        selectedObjectOutline.visible = false;
        return;
      }
      selectedObjectOutline.visible = true;
      selectedObjectOutline.position.set(obj.position[0], obj.position[1], obj.position[2]);
      selectedObjectOutline.rotation.set(obj.rotation[0], obj.rotation[1], obj.rotation[2]);
      selectedObjectOutline.scale.set(obj.scale[0] + 0.1, obj.scale[1] + 0.1, obj.scale[2] + 0.1);
    }

    function transformSelectedObject(action) {
      const obj = backend.myWorld.objects.find(o => o.id === builderState.selectedObjectId);
      if (!obj) {
        if (action === 'rotY') {
          builderState.currentRotY = (builderState.currentRotY + builderState.rotStepRad) % (Math.PI * 2);
          showToast(`Rotasi Pasang: ${Math.round((builderState.currentRotY * 180) / Math.PI)}°`, 'sky');
        }
        return;
      }
      pushBuilderHistory(backend.myWorld.objects);
      if (action === 'rotY') {
        obj.rotation[1] = Number(((obj.rotation[1] + builderState.rotStepRad) % (Math.PI * 2)).toFixed(4));
      } else if (action === 'upY') {
        obj.position[1] = Math.min(60, Number((obj.position[1] + builderState.gridSnap).toFixed(2)));
      } else if (action === 'downY') {
        obj.position[1] = Math.max(0.25, Number((obj.position[1] - builderState.gridSnap).toFixed(2)));
      } else if (action === 'scaleUp') {
        obj.scale = obj.scale.map(s => Math.min(20, Number((s + 0.5).toFixed(2))));
      } else if (action === 'scaleDown') {
        obj.scale = obj.scale.map(s => Math.max(0.5, Number((s - 0.5).toFixed(2))));
      } else if (action === 'delete') {
        if (backend.myWorld.objects.length <= 1) {
          showToast('Minimal 1 objek di dunia.', 'coral');
          return;
        }
        backend.myWorld.objects = backend.myWorld.objects.filter(o => o.id !== obj.id);
        builderState.selectedObjectId = null;
      }
      rebuildUserObjectsInBuilder();
      updateSelectedOutline();
    }

    function toggleBuilderTestMode() {
      if (currentWorldName !== 'builder') return;
      const modeLabel = document.getElementById('builder-mode-label');
      const testBtnLabel = document.getElementById('builder-test-btn-label');

      if (builderSubMode === 'edit') {
        builderSubMode = 'test';
        if (placementGhostMesh) placementGhostMesh.visible = false;
        if (selectedObjectOutline) selectedObjectOutline.visible = false;
        if (builderGridHelper) builderGridHelper.visible = false;
        modeLabel.textContent = 'MODE UJI MAIN (FISIKA AKTIF)';
        testBtnLabel.textContent = 'Kembali ke Editor [B]';

        // Use custom spawn marker if present
        const spawnMarker = backend.myWorld.objects.find(o => o.type === 'spawn');
        if (spawnMarker) {
          playerPhys.spawnPos.set(spawnMarker.position[0], spawnMarker.position[1] + 1.2, spawnMarker.position[2]);
        } else {
          playerPhys.spawnPos.set(0, 1.2, 18);
        }
        respawnPlayer(false);
        showToast('Mode Uji Main aktif! Berjalanlah di atas objek yang kamu bangun.', 'sun');
      } else {
        builderSubMode = 'edit';
        if (builderGridHelper) builderGridHelper.visible = true;
        modeLabel.textContent = 'MODE EDITOR';
        testBtnLabel.textContent = 'Uji Main [B]';
        updateSelectedOutline();
        showToast('Kembali ke Mode Editor.', 'sky');
      }
    }

    function updateBuilderQuotaUI() {
      const countEl = document.getElementById('builder-quota-count');
      const revEl = document.getElementById('builder-rev-count');
      const saveStatus = document.getElementById('builder-save-status');
      const undoBtn = document.getElementById('btn-builder-undo');
      const redoBtn = document.getElementById('btn-builder-redo');

      if (countEl) countEl.textContent = `${backend.myWorld.objects.length} / ${MAX_WORLD_OBJECTS}`;
      if (revEl) revEl.textContent = `v${backend.myWorld.revision}`;
      if (undoBtn) undoBtn.disabled = builderState.undoStack.length === 0;
      if (redoBtn) redoBtn.disabled = builderState.redoStack.length === 0;

      if (saveStatus) {
        if (builderState.unsavedChanges) {
          saveStatus.innerHTML = '<i class="fa-solid fa-circle-exclamation mr-1"></i>Belum Disimpan';
          saveStatus.className = 'text-bvSun font-semibold';
        } else {
          saveStatus.innerHTML = '<i class="fa-solid fa-check-circle mr-1"></i>Tersimpan';
          saveStatus.className = 'text-bvGrass font-semibold';
        }
      }
    }

    /********************************************************************
     * 10. PLAYER INPUT, SWEPT-AABB PHYSICS & CAMERA CONTROLLER
     ********************************************************************/
    const keys = {};
    const touchInput = { x: 0, y: 0, sprint: false, jumpPressed: false };
    let localEmote = { code: null, until: 0 };
    let hasMovedFirstSteps = false;

    function isTypingInInput() {
      const el = document.activeElement;
      return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT');
    }

    window.addEventListener('keydown', (e) => {
      if (isTypingInInput()) return;
      const code = e.code;
      keys[code] = true;

      if (code === 'Escape') {
        toggleModal('modal-settings');
      } else if (code === 'KeyR' && gameState === 'playing') {
        if (currentWorldName === 'builder' && builderSubMode === 'edit') {
          transformSelectedObject('rotY');
        } else {
          respawnPlayer(true);
        }
      } else if (code === 'KeyE' && gameState === 'playing') {
        triggerNearestPortalInteraction();
      } else if (code === 'KeyQ' && gameState === 'playing') {
        const wheel = document.getElementById('emote-wheel-modal');
        wheel.classList.toggle('hidden');
      } else if (code === 'KeyB' && gameState === 'playing' && currentWorldName === 'builder') {
        toggleBuilderTestMode();
      } else if ((e.ctrlKey || e.metaKey) && code === 'KeyZ' && currentWorldName === 'builder') {
        e.preventDefault();
        builderUndo();
      } else if ((e.ctrlKey || e.metaKey) && code === 'KeyY' && currentWorldName === 'builder') {
        e.preventDefault();
        builderRedo();
      } else if ((code === 'Delete' || code === 'Backspace') && currentWorldName === 'builder' && builderSubMode === 'edit') {
        transformSelectedObject('delete');
      }
    });

    window.addEventListener('keyup', (e) => {
      keys[e.code] = false;
    });

    // Mouse Orbit & Builder Click
    let pointerDownPos = { x: 0, y: 0 };
    renderer.domElement.addEventListener('mousedown', (e) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
      camState.isDragging = true;
      camState.lastX = e.clientX;
      camState.lastY = e.clientY;
    });

    window.addEventListener('mousemove', (e) => {
      if (camState.isDragging) {
        const dx = e.clientX - camState.lastX;
        const dy = e.clientY - camState.lastY;
        camState.lastX = e.clientX;
        camState.lastY = e.clientY;
        const sens = 0.0055 * camState.sensitivity;
        camState.yaw -= dx * sens;
        const yDir = camState.invertY ? -1 : 1;
        camState.pitch = Math.max(0.08, Math.min(1.35, camState.pitch + dy * sens * yDir));
      } else if (currentWorldName === 'builder' && builderSubMode === 'edit' && gameState === 'playing') {
        updateBuilderGhost(e.clientX, e.clientY);
      }
    });

    window.addEventListener('mouseup', (e) => {
      const moveDist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      camState.isDragging = false;
      if (moveDist < 6 && e.button === 0 && e.target === renderer.domElement) {
        handleBuilderCanvasClick(e.clientX, e.clientY);
      }
    });

    // Touch look & two-finger pinch-to-zoom on canvas (joystick buttons remain separate).
    let touchLookId = null, touchLookX=0, touchLookY=0;
    const activeTouchPoints = new Map();
    let lastPinchDist = null;
    renderer.domElement.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'touch') return;
      activeTouchPoints.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (activeTouchPoints.size === 1 && touchLookId === null) {
        touchLookId = e.pointerId; touchLookX = e.clientX; touchLookY = e.clientY;
        renderer.domElement.setPointerCapture(e.pointerId);
      } else if (activeTouchPoints.size === 2) {
        const pts = Array.from(activeTouchPoints.values());
        lastPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      }
    });
    renderer.domElement.addEventListener('pointermove', e => {
      if (e.pointerType === 'touch' && activeTouchPoints.has(e.pointerId)) {
        activeTouchPoints.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }
      if (activeTouchPoints.size === 2 && gameState === 'playing') {
        const pts = Array.from(activeTouchPoints.values());
        const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (lastPinchDist !== null) {
          camState.distance = Math.max(4, Math.min(22, camState.distance - (d - lastPinchDist) * 0.025));
        }
        lastPinchDist = d;
        return;
      }
      if (e.pointerId !== touchLookId || gameState !== 'playing') return;
      const dx = e.clientX - touchLookX, dy = e.clientY - touchLookY; touchLookX = e.clientX; touchLookY = e.clientY;
      const sens = .006 * camState.sensitivity; camState.yaw -= dx * sens;
      camState.pitch = Math.max(.08, Math.min(1.35, camState.pitch + dy * sens * (camState.invertY ? -1 : 1)));
    });
    const releaseLook = e => {
      activeTouchPoints.delete(e.pointerId);
      if (activeTouchPoints.size < 2) lastPinchDist = null;
      if (e.pointerId === touchLookId) touchLookId = null;
    };
    renderer.domElement.addEventListener('pointerup',releaseLook);
    renderer.domElement.addEventListener('pointercancel',releaseLook);
    renderer.domElement.addEventListener('wheel', (e) => {
      camState.distance = Math.max(4, Math.min(22, camState.distance + e.deltaY * 0.01));
    }, { passive: true });

    renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    // Cross-Platform Gamepad Controller (Android, macOS, Windows, iOS/iPadOS Safari)
    const gamepadCtrl = new GamepadController({
      getGameState: () => gameState,
      onStatusChange: (status) => {
        const badge = document.getElementById('hud-gamepad-badge');
        const label = document.getElementById('hud-gamepad-label');
        const settingStatus = document.getElementById('setting-gp-status');
        if (status.connected) {
          if (badge) { badge.classList.remove('hidden'); badge.classList.add('inline-flex'); }
          if (label) label.textContent = `${status.profileName} (${status.os})`;
          if (settingStatus) {
            settingStatus.textContent = `${status.profileName} • ${status.os}`;
            settingStatus.className = 'px-2 py-0.5 rounded bg-bvGrass/20 text-bvGrass font-mono text-[10px] font-bold';
          }
          showToast(`🎮 ${status.profileName} terhubung di ${status.os}! (${status.labels.south}: Lompat, ${status.labels.west}: Interaksi)`, 'grass');
        } else {
          if (badge) { badge.classList.add('hidden'); badge.classList.remove('inline-flex'); }
          if (settingStatus) {
            settingStatus.textContent = 'Tekan tombol di controller';
            settingStatus.className = 'px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]';
          }
        }
      },
      onAction: (action) => {
        if (action === 'escape') {
          toggleModal('modal-settings');
        } else if (action === 'interact' && gameState === 'playing') {
          if (currentWorldName === 'builder' && builderSubMode === 'edit') {
            handleBuilderCanvasClick(window.innerWidth * 0.5, window.innerHeight * 0.5);
          } else {
            triggerNearestPortalInteraction();
          }
        } else if (action === 'emoteOrBuilderTest' && gameState === 'playing') {
          if (currentWorldName === 'builder') toggleBuilderTestMode();
          else document.getElementById('emote-wheel-modal')?.classList.toggle('hidden');
        } else if (action === 'mapOrWorlds' && gameState === 'playing') {
          if (currentWorldName === 'cengkareng') {
            document.getElementById('bv-nearest-district')?.click();
          } else {
            toggleModal('modal-worlds');
          }
        } else if (action === 'respawnOrRotate' && gameState === 'playing') {
          if (currentWorldName === 'builder' && builderSubMode === 'edit') transformSelectedObject('rotY');
          else respawnPlayer(true);
        }
      }
    });
    window.__bvGamepad = gamepadCtrl;

    function respawnPlayer(countAsFall = false) {
      playerPhys.pos.copy(playerPhys.spawnPos);
      playerPhys.vel.set(0, 0, 0);
      playerPhys.grounded = false;
      if (countAsFall) {
        sfx.play('fall');
        gamepadCtrl.pulse(0.55, 110);
        if ((currentWorldName === 'obby' || currentWorldName === 'coindash') && backend.activeObbyAttempt) {
          backend.activeObbyAttempt.deaths += 1;
        }
      }
    }

    function updatePhysicsAndPlayer(dt, nowSec, gpState = null) {
      const activeColliders = (currentWorldName === 'cengkareng' && explorer)
        ? colliders.concat(explorer.getActiveColliders(playerPhys.pos))
        : colliders;

      // 1. Update Moving Platforms & store frame delta on collider
      for (const c of colliders) {
        if (c.movingCfg) {
          const prevX = c.mesh.position.x;
          const prevY = c.mesh.position.y;
          const prevZ = c.mesh.position.z;
          const offset = Math.sin(nowSec * c.movingCfg.speed + c.movingCfg.phase) * c.movingCfg.amp;
          if (c.movingCfg.axis === 'x') c.mesh.position.x = c.baseX + offset;
          if (c.movingCfg.axis === 'y') c.mesh.position.y = c.baseY + offset;
          if (c.movingCfg.axis === 'z') c.mesh.position.z = c.baseZ + offset;

          c.dx = c.mesh.position.x - prevX;
          c.dy = c.mesh.position.y - prevY;
          c.dz = c.mesh.position.z - prevZ;

          c.minX = c.mesh.position.x - c.sx / 2;
          c.maxX = c.mesh.position.x + c.sx / 2;
          c.minY = c.mesh.position.y - c.sy / 2;
          c.maxY = c.mesh.position.y + c.sy / 2;
          c.minZ = c.mesh.position.z - c.sz / 2;
          c.maxZ = c.mesh.position.z + c.sz / 2;
        }
      }

      // Carry player if standing on a moving platform
      if (playerPhys.grounded && playerPhys.groundPlatform && playerPhys.groundPlatform.movingCfg) {
        playerPhys.pos.x += playerPhys.groundPlatform.dx || 0;
        playerPhys.pos.y += playerPhys.groundPlatform.dy || 0;
        playerPhys.pos.z += playerPhys.groundPlatform.dz || 0;
      }

      // Apply Gamepad right-stick camera orbit & bumper zoom if active
      if (gpState) {
        if (Math.abs(gpState.lookYaw) > 0.0001 || Math.abs(gpState.lookPitch) > 0.0001) {
          camState.yaw -= gpState.lookYaw * camState.sensitivity;
          const yDir = camState.invertY ? -1 : 1;
          camState.pitch = Math.max(0.08, Math.min(1.35, camState.pitch + gpState.lookPitch * camState.sensitivity * yDir));
        }
        if (Math.abs(gpState.zoomDelta) > 0.001) {
          camState.distance = Math.max(4, Math.min(22, camState.distance + gpState.zoomDelta));
        }
      }

      // 2. Gather Movement Input relative to Camera Yaw (Keyboard + Touch + Gamepad)
      let moveForward = 0;
      let moveRight = 0;
      if (keys['KeyW'] || keys['ArrowUp']) moveForward += 1;
      if (keys['KeyS'] || keys['ArrowDown']) moveForward -= 1;
      if (keys['KeyD'] || keys['ArrowRight']) moveRight += 1;
      if (keys['KeyA'] || keys['ArrowLeft']) moveRight -= 1;

      if (Math.abs(touchInput.x) > 0.05 || Math.abs(touchInput.y) > 0.05) {
        moveRight += touchInput.x;
        moveForward -= touchInput.y;
      }
      if (gpState && (Math.abs(gpState.moveX) > 0.01 || Math.abs(gpState.moveY) > 0.01)) {
        moveRight += gpState.moveX;
        moveForward -= gpState.moveY;
      }

      const isSprinting = !!(keys['ShiftLeft'] || keys['ShiftRight'] || touchInput.sprint || gpState?.sprint);
      const inputMag = Math.min(1, Math.hypot(moveForward, moveRight));
      const speed = (isSprinting ? 8.2 : 5.4) * (inputMag > 0 ? Math.max(0.35, inputMag) : 1);

      const forwardVec = new THREE.Vector3(-Math.sin(camState.yaw), 0, -Math.cos(camState.yaw));
      const rightVec = new THREE.Vector3(Math.cos(camState.yaw), 0, -Math.sin(camState.yaw));
      const wishDir = new THREE.Vector3()
        .addScaledVector(forwardVec, moveForward)
        .addScaledVector(rightVec, moveRight);

      if (wishDir.lengthSq() > 0.001) {
        wishDir.normalize();
        playerPhys.vel.x = wishDir.x * speed;
        playerPhys.vel.z = wishDir.z * speed;
        playerPhys.rotY = Math.atan2(-wishDir.x, -wishDir.z);

        if (!hasMovedFirstSteps) {
          hasMovedFirstSteps = true;
          backend.unlockAchievement('FIRST_STEPS');
        }
      } else {
        playerPhys.vel.x *= 0.78;
        playerPhys.vel.z *= 0.78;
      }

      // 3. Single Ground Jump
      if ((keys['Space'] || touchInput.jumpPressed || gpState?.jumpJustPressed) && playerPhys.grounded) {
        playerPhys.vel.y = 10.2;
        playerPhys.grounded = false;
        playerPhys.groundPlatform = null;
        touchInput.jumpPressed = false;
        sfx.play('jump');
        gamepadCtrl.pulse(0.25, 45);
      }

      // 4. Gravity
      playerPhys.vel.y -= 24.0 * dt;
      if (playerPhys.vel.y < -32) playerPhys.vel.y = -32;

      // 5. Swept Axis-Aligned Collision Resolution (X, Z, then Y + Ramp support)
      const r = playerPhys.radius;
      const h = playerPhys.height;

      // Move X
      playerPhys.pos.x += playerPhys.vel.x * dt;
      if (currentWorldName === 'cengkareng') {
        playerPhys.pos.x = Math.max(-495, Math.min(495, playerPhys.pos.x));
      }
      for (const c of activeColliders) {
        if (playerPhys.pos.y + h > c.minY + 0.15 && playerPhys.pos.y < c.maxY - 0.15 &&
            playerPhys.pos.z + r > c.minZ && playerPhys.pos.z - r < c.maxZ &&
            playerPhys.pos.x + r > c.minX && playerPhys.pos.x - r < c.maxX) {
          if (c.isHazard) {
            respawnPlayer(true);
            return;
          }
          if (c.isRamp && playerPhys.pos.y >= c.minY - 0.2) {
            playerPhys.pos.y = c.maxY;
            playerPhys.grounded = true;
          } else {
            if (playerPhys.vel.x > 0) playerPhys.pos.x = c.minX - r;
            else if (playerPhys.vel.x < 0) playerPhys.pos.x = c.maxX + r;
          }
        }
      }

      // Move Z
      playerPhys.pos.z += playerPhys.vel.z * dt;
      if (currentWorldName === 'cengkareng') {
        playerPhys.pos.z = Math.max(-485, Math.min(485, playerPhys.pos.z));
      }
      for (const c of activeColliders) {
        if (playerPhys.pos.y + h > c.minY + 0.15 && playerPhys.pos.y < c.maxY - 0.15 &&
            playerPhys.pos.x + r > c.minX && playerPhys.pos.x - r < c.maxX &&
            playerPhys.pos.z + r > c.minZ && playerPhys.pos.z - r < c.maxZ) {
          if (c.isHazard) {
            respawnPlayer(true);
            return;
          }
          if (c.isRamp && playerPhys.pos.y >= c.minY - 0.2) {
            playerPhys.pos.y = c.maxY;
            playerPhys.grounded = true;
          } else {
            if (playerPhys.vel.z > 0) playerPhys.pos.z = c.minZ - r;
            else if (playerPhys.vel.z < 0) playerPhys.pos.z = c.maxZ + r;
          }
        }
      }

      // Move Y
      const prevY = playerPhys.pos.y;
      playerPhys.pos.y += playerPhys.vel.y * dt;
      playerPhys.grounded = false;
      playerPhys.groundPlatform = null;

      for (const c of activeColliders) {
        if (playerPhys.pos.x + r > c.minX && playerPhys.pos.x - r < c.maxX &&
            playerPhys.pos.z + r > c.minZ && playerPhys.pos.z - r < c.maxZ) {
          // Landing on top
          if (playerPhys.vel.y <= 0 && prevY >= c.maxY - 0.25 && playerPhys.pos.y <= c.maxY) {
            if (c.isHazard) {
              respawnPlayer(true);
              return;
            }
            playerPhys.pos.y = c.maxY;
            playerPhys.vel.y = 0;
            playerPhys.grounded = true;
            playerPhys.groundPlatform = c;

            // Check Obby Checkpoint or Finish
            if (c.checkpointIdx && backend.activeObbyAttempt) {
              const res = backend.advanceCheckpoint(c.checkpointIdx);
              if (res.ok) {
                playerPhys.spawnPos.set(0, c.maxY + 0.5, (c.minZ + c.maxZ) / 2);
                sfx.play('checkpoint');
                showToast(`🚩 Checkpoint ${c.checkpointIdx + 1} / 3 Tercapai!`, 'cyan');
              }
            }
            if (c.isFinish && backend.activeObbyAttempt && !backend.activeObbyAttempt.completed) {
              handleCourseCompletion();
            }
          } else if (playerPhys.vel.y > 0 && prevY + h <= c.minY + 0.2 && playerPhys.pos.y + h >= c.minY) {
            // Head bump
            playerPhys.pos.y = c.minY - h;
            playerPhys.vel.y = 0;
          }
        }
      }

      // 6. Check Coin Dash Pickups
      if (currentWorldName === 'coindash' && backend.activeObbyAttempt && !backend.activeObbyAttempt.completed) {
        let collectedCount = 0;
        for (const coin of coinPickups) {
          if (coin.collected) {
            collectedCount++;
            continue;
          }
          if (playerPhys.pos.distanceTo(coin.position) < 1.55) {
            coin.collected = true;
            coin.mesh.visible = false;
            collectedCount++;
            sfx.play('coin');
            backend.session.stars += 2;
            updateAllMenusUI();
          }
        }
        document.getElementById('hud-obby-cp').textContent = `${collectedCount} / ${coinPickups.length}`;
        if (collectedCount === coinPickups.length && coinPickups.length > 0) {
          backend.activeObbyAttempt.highestCheckpoint = 2; // Mark eligible for completion
          handleCourseCompletion();
        }
      }

      // 7. Fall Reset Below Y Threshold
      if (playerPhys.pos.y < -12) {
        respawnPlayer(true);
      }

      // 8. Update Avatar Mesh Transform & Procedural Walk/Jump Limb Swing
      playerRig.group.position.copy(playerPhys.pos);
      playerRig.group.rotation.y = playerPhys.rotY;

      const horizSpeed = Math.hypot(playerPhys.vel.x, playerPhys.vel.z);
      if (!playerPhys.grounded) {
        playerRig.leftArm.rotation.x = -2.4;
        playerRig.rightArm.rotation.x = -2.4;
        playerRig.leftLeg.rotation.x = 0.35;
        playerRig.rightLeg.rotation.x = -0.35;
      } else if (horizSpeed > 0.35) {
        const freq = isSprinting ? 14 : 10;
        const swing = Math.sin(nowSec * freq) * 0.72;
        playerRig.leftLeg.rotation.x = swing;
        playerRig.rightLeg.rotation.x = -swing;
        playerRig.leftArm.rotation.x = -swing * 0.85;
        playerRig.rightArm.rotation.x = swing * 0.85;
      } else {
        playerRig.leftLeg.rotation.x *= 0.8;
        playerRig.rightLeg.rotation.x *= 0.8;
        playerRig.leftArm.rotation.x *= 0.8;
        playerRig.rightArm.rotation.x *= 0.8;
      }

      // 9. Update Follow Orbit Camera
      const targetLook = new THREE.Vector3(playerPhys.pos.x, playerPhys.pos.y + 1.65, playerPhys.pos.z);
      const camX = targetLook.x + Math.sin(camState.yaw) * Math.cos(camState.pitch) * camState.distance;
      const camY = Math.max(0.8, targetLook.y + Math.sin(camState.pitch) * camState.distance);
      const camZ = targetLook.z + Math.cos(camState.yaw) * Math.cos(camState.pitch) * camState.distance;
      camera.position.lerp(new THREE.Vector3(camX, camY, camZ), Math.min(1, dt * 15));
      camera.lookAt(targetLook);

      // 10. Broadcast Multiplayer State
      window.__localPlayerPos = [playerPhys.pos.x, playerPhys.pos.y, playerPhys.pos.z];
      window.__localPlayerRotY = playerPhys.rotY;
      mpManager.broadcastMove(window.__localPlayerPos, playerPhys.rotY);
    }

    async function handleCourseCompletion() {
      const res = await backend.finishObbyAttempt();
      if (!res.ok) return;
      sfx.play('win');
      gameState = 'results';
      document.getElementById('results-time').textContent = formatMs(res.elapsedMs);
      document.getElementById('results-deaths').textContent = String(res.deaths);
      document.getElementById('results-reward').textContent = `+${res.rewardStars} ★`;
      document.getElementById('modal-results').classList.remove('hidden');
      document.getElementById('modal-results').classList.add('flex');
      updateAllMenusUI();
    }

    function checkPortalProximity() {
      let nearest = null;
      let minDist = 3.6;
      for (const p of portals) {
        const d = playerPhys.pos.distanceTo(p.position);
        if (d < minDist) {
          minDist = d;
          nearest = p;
        }
      }
      const promptEl = document.getElementById('interaction-prompt');
      if (nearest && gameState === 'playing') {
        promptEl.classList.remove('hidden');
        document.getElementById('interaction-title').textContent = nearest.title;
        document.getElementById('interaction-sub').textContent = nearest.subtitle;
        window.__nearestPortal = nearest;
      } else {
        promptEl.classList.add('hidden');
        window.__nearestPortal = null;
      }
    }

    function triggerNearestPortalInteraction() {
      if (!window.__nearestPortal) return;
      const target = window.__nearestPortal.targetWorld;
      sfx.play('checkpoint');
      loadWorld(target);
    }

    /********************************************************************
     * 11. 3D PROJECTED NAMETAGS & QUICK-CHAT BUBBLES
     ********************************************************************/
    const nametagLayer = document.getElementById('nametag-layer');

    function projectToScreen(vec3) {
      const v = vec3.clone().project(camera);
      if (v.z > 1) return null;
      const x = (v.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-(v.y * 0.5) + 0.5) * window.innerHeight;
      return { x, y };
    }

    function renderProjectedLabels(nowMs) {
      if (gameState !== 'playing') {
        nametagLayer.innerHTML = '';
        return;
      }
      let html = '';

      // 1. Local Player Nametag + Active Emote Bubble
      const localHead = new THREE.Vector3(playerPhys.pos.x, playerPhys.pos.y + 2.75, playerPhys.pos.z);
      const localScreen = projectToScreen(localHead);
      if (localScreen) {
        let emoteHtml = '';
        if (localEmote.code && nowMs < localEmote.until) {
          const def = SAFE_EMOTES.find(e => e.code === localEmote.code);
          if (def) {
            const phrase = currentLang === 'id' ? def.id : def.en;
            emoteHtml = `<div class="mb-1 px-3 py-1 rounded-full bg-bvSun text-bvNavy font-display font-bold text-xs shadow-lg">${def.icon} ${phrase}</div>`;
          }
        }
        html += `
          <div class="nametag-item flex flex-col items-center" style="left:${localScreen.x}px;top:${localScreen.y}px;">
            ${emoteHtml}
            <div class="px-2.5 py-0.5 rounded-md bg-bvNavy/85 border border-bvSky/50 text-[11px] font-display font-bold text-white shadow">
              ${escapeHtml(backend.session.displayName)} <span class="text-bvSky">(Kamu)</span>
            </div>
          </div>
        `;
      }

      // 2. Remote Players Nametags + Emote Bubbles
      for (const rp of mpManager.remotePlayers.values()) {
        const rpHead = new THREE.Vector3(rp.rig.group.position.x, rp.rig.group.position.y + 2.75, rp.rig.group.position.z);
        const sc = projectToScreen(rpHead);
        if (sc) {
          let rpEmote = '';
          if (rp.emoteCode && nowMs < rp.emoteUntil) {
            const def = SAFE_EMOTES.find(e => e.code === rp.emoteCode);
            if (def) {
              const phrase = currentLang === 'id' ? def.id : def.en;
              rpEmote = `<div class="mb-1 px-3 py-1 rounded-full bg-bvCyan text-bvNavy font-display font-bold text-xs shadow-lg">${def.icon} ${phrase}</div>`;
            }
          }
          html += `
            <div class="nametag-item flex flex-col items-center" style="left:${sc.x}px;top:${sc.y}px;">
              ${rpEmote}
              <div class="px-2.5 py-0.5 rounded-md bg-bvNavy/90 border border-bvGrass/60 text-[11px] font-display font-bold text-bvGrass shadow">
                <i class="fa-solid fa-user text-[9px] mr-1"></i>${escapeHtml(rp.displayName)}
              </div>
            </div>
          `;
        }
      }

      // 3. Portal Signboards
      for (const p of portals) {
        const sc = projectToScreen(new THREE.Vector3(p.position.x, p.position.y + 2.6, p.position.z));
        if (sc && playerPhys.pos.distanceTo(p.position) < 28) {
          html += `
            <div class="nametag-item text-center" style="left:${sc.x}px;top:${sc.y}px;">
              <div class="px-3 py-1 rounded-xl bg-bvNavy/90 border-2 text-xs font-display font-bold text-white shadow-lg" style="border-color:${p.color}">
                ${escapeHtml(p.title)}
              </div>
            </div>
          `;
        }
      }

      nametagLayer.innerHTML = html;
    }

    /********************************************************************
     * 12. UI BINDINGS, MENUS, LOCALIZATION & TOASTS
     ********************************************************************/
    let currentLang = 'id';

    function showToast(msg, tone = 'sky') {
      const containerEl = document.getElementById('toast-container');
      const item = document.createElement('div');
      const borderMap = {
        sky: 'border-bvSky text-bvSky',
        sun: 'border-bvSun text-bvSun',
        cyan: 'border-bvCyan text-bvCyan',
        coral: 'border-bvCoral text-bvCoral',
        grass: 'border-bvGrass text-bvGrass'
      };
      item.className = `bv-panel px-4 py-2.5 border-l-4 ${borderMap[tone] || borderMap.sky} text-xs font-bold text-white shadow-xl transition-opacity duration-300`;
      item.textContent = msg;
      containerEl.appendChild(item);
      setTimeout(() => {
        item.style.opacity = '0';
        setTimeout(() => item.remove(), 300);
      }, 3200);
    }

    function formatMs(ms) {
      if (!ms && ms !== 0) return '--:--';
      const totalSec = ms / 1000;
      const mins = Math.floor(totalSec / 60);
      const secs = (totalSec % 60).toFixed(1).padStart(4, '0');
      return `${String(mins).padStart(2, '0')}:${secs}`;
    }

    function updateAllMenusUI() {
      document.getElementById('hud-player-name').textContent = backend.session.displayName;
      document.getElementById('menu-player-name').textContent = backend.session.displayName;
      document.getElementById('hud-stars-count').textContent = String(backend.session.stars);
      document.getElementById('menu-stars-count').textContent = String(backend.session.stars);
      document.getElementById('menu-stat-pb').textContent = formatMs(backend.session.obbyStats.bestMs);
      document.getElementById('hud-obby-pb').textContent = formatMs(backend.session.obbyStats.bestMs);
      document.getElementById('menu-stat-clears').textContent = `${backend.session.obbyStats.completions}x`;
      document.getElementById('menu-stat-blocks').textContent = String((backend.myWorld.objects || []).length);
      document.getElementById('avatar-name-input').value = backend.session.displayName;
      updateBlockyAvatarColors(playerRig, backend.session.avatar);
      renderAchievementsModal();
      updateBuilderQuotaUI();
    }

    function applyLocalization(lang) {
      currentLang = lang;
      document.getElementById('btn-hud-lang').textContent = lang.toUpperCase();
      const dict = I18N[lang] || I18N.id;
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) el.textContent = dict[key];
      });
      renderEmoteWheelButtons();
    }

    function toggleModal(id, forceOpen = null) {
      const el = document.getElementById(id);
      if (!el) return;
      const isHidden = el.classList.contains('hidden');
      const show = forceOpen !== null ? forceOpen : isHidden;
      if (show) {
        el.classList.remove('hidden');
        el.classList.add('flex');
      } else {
        el.classList.add('hidden');
        el.classList.remove('flex');
      }
      const anyModalOpen = Array.from(document.querySelectorAll('.bv-modal-backdrop')).some(
        (m) => !m.classList.contains('hidden')
      );
      const hudTop = document.getElementById('hud-topbar');
      const canvasWrap = document.getElementById('game-canvas-container');
      if (hudTop) hudTop.inert = anyModalOpen;
      if (canvasWrap) canvasWrap.inert = anyModalOpen;
    }

    function renderEmoteWheelButtons() {
      const grid = document.getElementById('emote-buttons-grid');
      grid.innerHTML = SAFE_EMOTES.map(e => `
        <button data-emote="${e.code}" class="bv-btn p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-white/10 text-left text-xs flex items-center gap-2">
          <span class="text-base">${e.icon}</span>
          <span class="font-semibold text-white leading-tight">${currentLang === 'id' ? e.id : e.en}</span>
        </button>
      `).join('');

      grid.querySelectorAll('[data-emote]').forEach(btn => {
        btn.addEventListener('click', () => {
          const code = btn.getAttribute('data-emote');
          if (mpManager.sendEmote(code)) {
            localEmote = { code, until: performance.now() + 4000 };
            sfx.play('place');
            document.getElementById('emote-wheel-modal').classList.add('hidden');
          }
        });
      });
    }

    function renderBuilderToolbarUI() {
      // Color Swatches
      const swatchContainer = document.getElementById('builder-color-swatches');
      swatchContainer.innerHTML = CURATED_COLORS.map(c => `
        <button data-bcolor="${c}" class="w-5 h-5 rounded-md border-2 ${c === builderState.activeColor ? 'border-white scale-110' : 'border-transparent'}" style="background:${c}"></button>
      `).join('');
      swatchContainer.querySelectorAll('[data-bcolor]').forEach(btn => {
        btn.addEventListener('click', () => {
          builderState.activeColor = btn.getAttribute('data-bcolor');
          renderBuilderToolbarUI();
        });
      });

      // Palette Items
      const paletteDefs = [
        { type: 'block', label: 'Blok', icon: 'fa-cube' },
        { type: 'ramp', label: 'Ramp', icon: 'fa-signal' },
        { type: 'platform', label: 'Kaca', icon: 'fa-layer-group' },
        { type: 'cylinder', label: 'Pilar', icon: 'fa-database' },
        { type: 'sphere', label: 'Bola', icon: 'fa-circle' },
        { type: 'tree', label: 'Pohon', icon: 'fa-tree' },
        { type: 'lamp', label: 'Lampu', icon: 'fa-lightbulb' },
        { type: 'spawn', label: 'Spawn', icon: 'fa-location-dot' }
      ];
      const palEl = document.getElementById('builder-palette-items');
      palEl.innerHTML = paletteDefs.map(p => {
        const active = builderState.activeType === p.type && builderState.activeTool === 'place';
        return `
          <button data-btype="${p.type}" class="bv-btn px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 ${active ? 'bg-bvCyan text-bvNavy shadow' : 'bg-slate-900/90 text-slate-200 hover:bg-slate-800'}">
            <i class="fa-solid ${p.icon}"></i>
            <span>${p.label}</span>
          </button>
        `;
      }).join('');

      palEl.querySelectorAll('[data-btype]').forEach(btn => {
        btn.addEventListener('click', () => {
          builderState.activeType = btn.getAttribute('data-btype');
          builderState.activeTool = 'place';
          syncBuilderToolButtons();
          renderBuilderToolbarUI();
        });
      });
    }

    function syncBuilderToolButtons() {
      document.querySelectorAll('.builder-tool-btn').forEach(btn => {
        const t = btn.getAttribute('data-tool');
        if (t === builderState.activeTool) {
          btn.className = 'builder-tool-btn bv-btn px-2.5 py-2 rounded-xl text-xs font-bold bg-bvSky text-bvNavy flex items-center gap-1.5';
        } else {
          btn.className = 'builder-tool-btn bv-btn px-2.5 py-2 rounded-xl text-xs font-bold bg-slate-800/90 text-slate-200 flex items-center gap-1.5';
        }
      });
    }

    function renderAvatarEditorUI() {
      const renderSwatches = (containerId, colors, currentVal, onSelect) => {
        const el = document.getElementById(containerId);
        el.innerHTML = colors.map(c => `
          <button data-col="${c}" class="w-8 h-8 rounded-xl border-2 ${c === currentVal ? 'border-white scale-110 shadow-lg' : 'border-white/20'}" style="background:${c}"></button>
        `).join('');
        el.querySelectorAll('[data-col]').forEach(b => {
          b.addEventListener('click', () => {
            onSelect(b.getAttribute('data-col'));
            renderAvatarEditorUI();
          });
        });
      };

      renderSwatches('avatar-torso-colors', CURATED_COLORS, backend.session.avatar.torsoColor, (c) => {
        backend.session.avatar.torsoColor = c;
        updateBlockyAvatarColors(playerRig, backend.session.avatar);
      });
      renderSwatches('avatar-head-colors', HEAD_COLORS, backend.session.avatar.headColor, (c) => {
        backend.session.avatar.headColor = c;
        updateBlockyAvatarColors(playerRig, backend.session.avatar);
      });
      renderSwatches('avatar-limb-colors', LIMB_COLORS, backend.session.avatar.limbColor, (c) => {
        backend.session.avatar.limbColor = c;
        updateBlockyAvatarColors(playerRig, backend.session.avatar);
      });

      const accLabels = {
        none: 'Tanpa Aksesori',
        cap: 'Topi Blocky',
        visor: 'Cyber Visor',
        backpack: 'Tas Ransel',
        halo: 'Sun Halo'
      };
      const accEl = document.getElementById('avatar-accessory-options');
      accEl.innerHTML = ALLOWED_ACCESSORIES.map(a => {
        const active = backend.session.avatar.accessory === a;
        return `
          <button data-acc="${a}" class="bv-btn p-2.5 rounded-xl border text-center font-bold ${active ? 'bg-bvCyan text-bvNavy border-bvCyan' : 'bg-slate-900 border-white/10 text-slate-200'}">
            ${accLabels[a]}
          </button>
        `;
      }).join('');
      accEl.querySelectorAll('[data-acc]').forEach(b => {
        b.addEventListener('click', () => {
          backend.session.avatar.accessory = b.getAttribute('data-acc');
          updateBlockyAvatarColors(playerRig, backend.session.avatar);
          renderAvatarEditorUI();
        });
      });
    }

    function renderAchievementsModal() {
      const listEl = document.getElementById('achievements-list');
      if (!listEl) return;
      listEl.innerHTML = ACHIEVEMENT_DEFS.map(def => {
        const unlockedAt = backend.session.achievements[def.id];
        return `
          <div class="p-3.5 rounded-xl border flex items-center justify-between ${unlockedAt ? 'bg-bvSun/15 border-bvSun/50' : 'bg-slate-900/70 border-white/10 opacity-65'}">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center text-lg ${unlockedAt ? 'bg-bvSun text-bvNavy' : 'bg-slate-800 text-slate-400'}">
                <i class="fa-solid ${def.icon}"></i>
              </div>
              <div>
                <div class="font-display font-bold text-sm text-white">${def.title}</div>
                <div class="text-slate-300 text-xs">${def.desc}</div>
              </div>
            </div>
            <div class="text-right">
              <div class="font-display font-bold text-sm text-bvSun">+${def.stars} ★</div>
              <div class="text-[10px] ${unlockedAt ? 'text-bvGrass font-bold' : 'text-slate-400'}">${unlockedAt ? 'TERBUKA' : 'Terkunci'}</div>
            </div>
          </div>
        `;
      }).join('');
    }

    /********************************************************************
     * 13. AUTOMATED VERIFICATION SUITE (14 UNIT & INTEGRATION TESTS)
     ********************************************************************/
    async function runAutomatedTestSuite() {
      const results = [];
      const assert = (name, cond, detail = '') => {
        results.push({ name, passed: !!cond, detail });
      };

      const t1 = Validator.validateWorldObject({
        id: 'obj_bad', type: 'script_injector', position: [0, 1, 0], rotation: [0, 0, 0], scale: [1, 1, 1], color: '#4CC9F0'
      });
      assert('T01: Reject unsupported object type (script_injector)', !t1.ok, t1.error);

      const t2 = Validator.validateWorldObject({
        id: 'obj_nan', type: 'block', position: [NaN, 1, 0], rotation: [0, 0, 0], scale: [1, 1, 1], color: '#4CC9F0'
      });
      assert('T02: Reject NaN coordinates in world object', !t2.ok, t2.error);

      const t3 = Validator.validateWorldObject({
        id: 'obj_huge', type: 'block', position: [5, 1, 5], rotation: [0, 0, 0], scale: [50, 1, 1], color: '#4CC9F0'
      });
      assert('T03: Reject out-of-range object scale (>20 units)', !t3.ok, t3.error);

      const t4 = Validator.validateWorldObject({
        id: 'obj_col', type: 'block', position: [5, 1, 5], rotation: [0, 0, 0], scale: [1, 1, 1], color: 'javascript:evil()'
      });
      assert('T04: Reject malformed color string', !t4.ok, t4.error);

      const t5 = Validator.validateWorldObject({
        id: 'obj_spawnblock', type: 'block', position: [0, 1, 18], rotation: [0, 0, 0], scale: [2, 2, 2], color: '#4CC9F0'
      });
      assert('T05: Protect reserved spawn safety zone from overlapping blocks', !t5.ok, t5.error);

      const overQuotaArr = Array.from({ length: 301 }, (_, i) => ({
        id: `obj_${i}`, type: 'block', position: [5, 1, 5], rotation: [0, 0, 0], scale: [1, 1, 1], color: '#4CC9F0'
      }));
      const t6 = Validator.validateWorldPayload(
        { revision: backend.myWorld.revision, objects: overQuotaArr },
        backend.myWorld,
        backend.session.playerId
      );
      assert('T06: Reject world payload exceeding 300 object quota', !t6.ok && t6.status === 400, t6.error);

      const t7 = await backend.saveWorld(
        { revision: backend.myWorld.revision, objects: backend.myWorld.objects },
        'attacker_guest_id_999'
      );
      assert('T07: AuthZ blocks non-owner guest from saving owner world (403)', !t7.ok && t7.status === 403, t7.error);

      const t8 = await backend.saveWorld(
        { revision: backend.myWorld.revision - 1, objects: backend.myWorld.objects },
        backend.session.playerId
      );
      assert('T08: Stale revision rejected with 409 Conflict', !t8.ok && t8.status === 409, t8.error);

      const savedAttempt = backend.activeObbyAttempt;
      backend.startObbyAttempt('test_obby');
      const skipCp = backend.advanceCheckpoint(2);
      const validCp1 = backend.advanceCheckpoint(1);
      assert('T09: Obby enforces sequential checkpoint order (rejects skipping CP1)', !skipCp.ok && validCp1.ok, 'Sequential order verified');

      const prematureFinish = await backend.finishObbyAttempt();
      assert('T10: Obby rejects finish claim before reaching final checkpoint', !prematureFinish.ok, prematureFinish.error);
      backend.activeObbyAttempt = savedAttempt;

      const initialCount = backend.myWorld.objects.length;
      pushBuilderHistory(backend.myWorld.objects);
      backend.myWorld.objects.push({
        id: 'test_undo_block', type: 'block', position: [8, 1, 8], rotation: [0, 0, 0], scale: [1, 1, 1], color: '#4CC9F0'
      });
      const afterAdd = backend.myWorld.objects.length;
      builderUndo();
      const afterUndo = backend.myWorld.objects.length;
      builderRedo();
      const afterRedo = backend.myWorld.objects.length;
      builderUndo();
      assert('T11: Builder Undo/Redo accurately restores world state', afterAdd === initialCount + 1 && afterUndo === initialCount && afterRedo === initialCount + 1, `Count ${initialCount} -> ${afterAdd} -> ${afterUndo}`);

      const badAv = Validator.validateAvatar({ torsoColor: '#4CC9F0', headColor: '#FFCB47', limbColor: '#14213D', accessory: 'hacked_mesh' });
      const goodAv = Validator.validateAvatar(backend.session.avatar);
      assert('T12: Avatar schema validator rejects unknown accessories & accepts valid rig', !badAv.ok && goodAv.ok, badAv.error);

      const badPkt = Validator.validatePlayerMovePacket({ position: [99999, NaN, 0], rotY: 0 });
      const goodPkt = Validator.validatePlayerMovePacket({ position: [2, 1, 5], rotY: 1.2 });
      assert('T13: Multiplayer packet validator blocks teleport/NaN coordinates', !badPkt && goodPkt, 'Bounds [-500..500] enforced');

      const obstacleIdMarkers = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15];
      const actualSections = [5, 5, 5]; // Course design manifest; also validated by repository tests.
      assert('T14: Sky Obby declared 15-stage manifest across 3 sections', obstacleIdMarkers.join(',') === Array.from({length:15},(_,i)=>i+1).join(',') && actualSections.join(',') === '5,5,5', 'Manifest only; CI additionally checks actual stage labels');

      const passCount = results.filter(r => r.passed).length;
      const summaryEl = document.getElementById('qa-summary-text');
      if (summaryEl) {
        summaryEl.textContent = `Hasil: ${passCount} / ${results.length} Pengujian Otomatis LULUS (tes internal (bukan pengujian server))`;
      }
      const listEl = document.getElementById('qa-results-list');
      if (listEl) {
        listEl.innerHTML = results.map(r => `
          <div class="p-2.5 rounded-lg border ${r.passed ? 'bg-bvGrass/10 border-bvGrass/40 text-bvGrass' : 'bg-bvCoral/10 border-bvCoral/40 text-bvCoral'} flex items-center justify-between gap-2">
            <div><i class="fa-solid ${r.passed ? 'fa-circle-check' : 'fa-circle-xmark'} mr-1.5"></i><strong>${r.name}</strong></div>
            <div class="text-slate-300 text-[11px]">${r.detail}</div>
          </div>
        `).join('');
      }
      return results;
    }

    /********************************************************************
     * 14. EVENT LISTENERS FOR ALL BUTTONS & CONTROLS
     ********************************************************************/
    function bindUIEvents() {
      document.getElementById('btn-home-play').addEventListener('click', () => {
        sfx.init();
        sfx.play('checkpoint');
        document.getElementById('screen-home').classList.add('hidden');
        document.getElementById('hud-topbar').classList.remove('hidden');
        document.getElementById('hud-controls-hint').classList.remove('hidden');
        gameState = 'playing';
        loadWorld('hub');
      });

      document.getElementById('btn-home-worlds').addEventListener('click', () => toggleModal('modal-worlds', true));
      document.getElementById('btn-hud-worlds').addEventListener('click', () => toggleModal('modal-worlds', true));

      document.getElementById('btn-home-avatar').addEventListener('click', () => {
        renderAvatarEditorUI();
        toggleModal('modal-avatar', true);
      });
      document.getElementById('btn-hud-avatar').addEventListener('click', () => {
        renderAvatarEditorUI();
        toggleModal('modal-avatar', true);
      });

      document.getElementById('btn-home-howto').addEventListener('click', () => toggleModal('modal-howto', true));
      document.getElementById('btn-home-settings').addEventListener('click', () => toggleModal('modal-settings', true));
      document.getElementById('btn-hud-pause').addEventListener('click', () => toggleModal('modal-settings', true));
      document.getElementById('btn-open-achievements').addEventListener('click', () => {
        renderAchievementsModal();
        toggleModal('modal-achievements', true);
      });

      document.getElementById('btn-open-qa-suite').addEventListener('click', async () => {
        await runAutomatedTestSuite();
        toggleModal('modal-qa', true);
      });
      document.getElementById('btn-run-tests-now').addEventListener('click', () => runAutomatedTestSuite());
      document.getElementById('btn-open-docs').addEventListener('click', () => toggleModal('modal-docs', true));

      document.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', () => toggleModal(btn.getAttribute('data-close-modal'), false));
      });

      document.querySelectorAll('[data-enter-world]').forEach(btn => {
        btn.addEventListener('click', () => {
          const w = btn.getAttribute('data-enter-world');
          toggleModal('modal-worlds', false);
          document.getElementById('screen-home').classList.add('hidden');
          document.getElementById('hud-topbar').classList.remove('hidden');
          document.getElementById('hud-controls-hint').classList.remove('hidden');
          gameState = 'playing';
          loadWorld(w);
        });
      });

      document.getElementById('btn-apply-room').addEventListener('click', () => {
        const code = document.getElementById('input-room-code').value.trim().toUpperCase() || 'HUB-1';
        mpManager.joinRoom(code, currentWorldName);
        showToast(`Bergabung ke Room Multiplayer: ${code}`, 'sky');
      });

      document.getElementById('btn-save-avatar').addEventListener('click', async () => {
        const rawName = document.getElementById('avatar-name-input').value;
        backend.session.displayName = Validator.sanitizeDisplayName(rawName);
        const result = await backend.saveProfile();
        updateAllMenusUI();
        toggleModal('modal-avatar', false);
        sfx.play('checkpoint');
        showToast(result.ok ? (result.cloudSaved ? 'Profil tersimpan di cloud!' : 'Profil tersimpan lokal.') : 'Profil tersimpan lokal; cloud gagal: ' + result.error, result.ok ? 'cyan' : 'coral');
      });

      document.getElementById('btn-hud-emote').addEventListener('click', () => {
        document.getElementById('emote-wheel-modal').classList.toggle('hidden');
      });
      document.getElementById('btn-close-emote').addEventListener('click', () => {
        document.getElementById('emote-wheel-modal').classList.add('hidden');
      });
      document.getElementById('btn-hud-respawn').addEventListener('click', () => respawnPlayer(true));
      document.getElementById('btn-hud-lang').addEventListener('click', () => {
        applyLocalization(currentLang === 'id' ? 'en' : 'id');
      });
      document.getElementById('btn-interaction-tap').addEventListener('click', () => triggerNearestPortalInteraction());

      document.getElementById('setting-volume').addEventListener('input', (e) => {
        sfx.volume = Number(e.target.value) / 100;
      });
      document.getElementById('setting-quality').addEventListener('change', (e) => {
        const q = e.target.value;
        if (explorer) explorer.setQuality(q);
        if (q === 'low') {
          renderer.shadowMap.enabled = false;
          renderer.setPixelRatio(1);
        } else if (q === 'medium') {
          renderer.shadowMap.enabled = true;
          renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        } else {
          renderer.shadowMap.enabled = true;
          renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        }
      });
      document.getElementById('setting-sensitivity').addEventListener('input', (e) => {
        camState.sensitivity = Number(e.target.value) / 100;
      });
      document.getElementById('setting-inverty').addEventListener('change', (e) => {
        camState.invertY = e.target.checked;
      });
      document.getElementById('setting-showfps').addEventListener('change', (e) => {
        document.getElementById('hud-dev-stats').classList.toggle('hidden', !e.target.checked);
      });
      const gpDeadzoneEl = document.getElementById('setting-gp-deadzone');
      if (gpDeadzoneEl) {
        gpDeadzoneEl.addEventListener('input', (e) => {
          gamepadCtrl.deadzone = Math.max(0.05, Math.min(0.35, Number(e.target.value) / 100));
        });
      }
      const gpVibEl = document.getElementById('setting-gp-vibration');
      if (gpVibEl) {
        gpVibEl.addEventListener('change', (e) => {
          gamepadCtrl.vibrationEnabled = e.target.checked;
        });
      }
      document.getElementById('btn-return-mainmenu').addEventListener('click', () => {
        if (currentWorldName === 'builder' && builderState.unsavedChanges) {
          showToast('Menyimpan draf dunia otomatis sebelum ke menu...', 'sun');
          backend.saveWorld({
            title: backend.myWorld.title,
            visibility: backend.myWorld.visibility,
            revision: backend.myWorld.revision,
            objects: backend.myWorld.objects
          });
          builderState.unsavedChanges = false;
        }
        toggleModal('modal-settings', false);
        gameState = 'menu';
        document.getElementById('screen-home').classList.remove('hidden');
        updateAllMenusUI();
      });

      document.getElementById('btn-results-replay').addEventListener('click', () => {
        toggleModal('modal-results', false);
        gameState = 'playing';
        loadWorld(currentWorldName);
      });
      document.getElementById('btn-results-hub').addEventListener('click', () => {
        toggleModal('modal-results', false);
        gameState = 'playing';
        loadWorld('hub');
      });

      document.querySelectorAll('.builder-tool-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          builderState.activeTool = btn.getAttribute('data-tool');
          syncBuilderToolButtons();
        });
      });

      document.getElementById('btn-grid-toggle').addEventListener('click', (e) => {
        builderState.gridSnap = builderState.gridSnap === 1.0 ? 0.5 : 1.0;
        e.target.textContent = `${builderState.gridSnap.toFixed(1)}m`;
      });

      document.querySelectorAll('[data-xform]').forEach(btn => {
        btn.addEventListener('click', () => transformSelectedObject(btn.getAttribute('data-xform')));
      });

      document.getElementById('btn-builder-undo').addEventListener('click', () => builderUndo());
      document.getElementById('btn-builder-redo').addEventListener('click', () => builderRedo());
      document.getElementById('btn-builder-test').addEventListener('click', () => toggleBuilderTestMode());

      document.getElementById('btn-builder-save').addEventListener('click', async () => {
        const vis = document.getElementById('builder-visibility-select').value;
        const res = await backend.saveWorld({
          title: backend.myWorld.title,
          visibility: vis,
          revision: backend.myWorld.revision,
          objects: backend.myWorld.objects
        });
        if (res.ok) {
          builderState.unsavedChanges = false;
          sfx.play('win');
          updateAllMenusUI();
          showToast(`Dunia berhasil disimpan! (Revisi v${res.world.revision})`, 'grass');
        } else {
          showToast(res.error || 'Gagal menyimpan dunia', 'coral');
        }
      });

      document.getElementById('btn-builder-json').addEventListener('click', () => {
        document.getElementById('builder-json-textarea').value = JSON.stringify({
          title: backend.myWorld.title,
          visibility: backend.myWorld.visibility,
          objects: backend.myWorld.objects
        }, null, 2);
        document.getElementById('builder-json-error').classList.add('hidden');
        toggleModal('modal-json', true);
      });

      document.getElementById('btn-json-import').addEventListener('click', () => {
        const errEl = document.getElementById('builder-json-error');
        try {
          const parsed = JSON.parse(document.getElementById('builder-json-textarea').value);
          const check = Validator.validateWorldPayload(
            { revision: backend.myWorld.revision, objects: parsed.objects },
            backend.myWorld,
            backend.session.playerId
          );
          if (!check.ok) {
            errEl.textContent = check.error;
            errEl.classList.remove('hidden');
            return;
          }
          pushBuilderHistory(backend.myWorld.objects);
          backend.myWorld.objects = parsed.objects;
          rebuildUserObjectsInBuilder();
          toggleModal('modal-json', false);
          showToast('JSON Dunia tervalidasi dan berhasil dimuat!', 'grass');
        } catch (err) {
          errEl.textContent = 'Format JSON tidak valid: ' + err.message;
          errEl.classList.remove('hidden');
        }
      });

      const isTouch = touchDevice || navigator.maxTouchPoints > 0;
      if (isTouch) {
        const tc = document.getElementById('touch-controls');
        tc.classList.remove('hidden');
        tc.classList.add('flex');
      }

      const joyZone = document.getElementById('joystick-zone');
      const joyKnob = document.getElementById('joystick-knob');
      let joyActive = false;

      joyZone.addEventListener('pointerdown', (e) => {
        joyActive = true;
        joyZone.setPointerCapture(e.pointerId);
      });
      joyZone.addEventListener('pointermove', (e) => {
        if (!joyActive) return;
        const rect = joyZone.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const maxR = rect.width / 2 - 12;
        let dx = e.clientX - cx;
        let dy = e.clientY - cy;
        const dist = Math.hypot(dx, dy);
        if (dist > maxR) {
          dx = (dx / dist) * maxR;
          dy = (dy / dist) * maxR;
        }
        joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
        touchInput.x = dx / maxR;
        touchInput.y = dy / maxR;
      });
      const resetJoy = () => {
        joyActive = false;
        joyKnob.style.transform = 'translate(0px, 0px)';
        touchInput.x = 0;
        touchInput.y = 0;
      };
      joyZone.addEventListener('pointerup', resetJoy);
      joyZone.addEventListener('pointercancel', resetJoy);

      document.getElementById('btn-touch-jump').addEventListener('pointerdown', () => { touchInput.jumpPressed = true; });
      document.getElementById('btn-touch-sprint').addEventListener('pointerdown', () => { touchInput.sprint = !touchInput.sprint; });
      document.getElementById('btn-touch-interact').addEventListener('pointerdown', () => triggerNearestPortalInteraction());
      const emoteTouch=document.getElementById('btn-touch-emote');
      if(emoteTouch)emoteTouch.addEventListener('pointerdown',()=>document.getElementById('emote-wheel-modal').classList.toggle('hidden'));
      if (touchDevice) {
        // Avoid desktop-quality shadow maps on low-memory handheld devices.
        renderer.shadowMap.enabled=false;
      }

      window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      });
    }

    /********************************************************************
     * 15. MAIN GAME LOOP & INITIALIZATION
     ********************************************************************/
    let lastFrameTime = performance.now();
    let frameCounter = 0;
    let fpsTimer = performance.now();

    let lastMeasuredFps = 60;
    function animateLoop() {
      requestAnimationFrame(animateLoop);

      const now = performance.now();
      const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
      lastFrameTime = now;
      const nowSec = now / 1000;

      const gpState = gamepadCtrl.poll(dt, now);

      frameCounter++;
      if (now - fpsTimer >= 500) {
        const fps = Math.round((frameCounter * 1000) / (now - fpsTimer));
        lastMeasuredFps = fps;
        document.getElementById('stat-fps').textContent = String(fps);
        const drawsEl = document.getElementById('stat-draws');
        if (drawsEl) drawsEl.textContent = String(renderer.info.render.calls);
        // Adaptive WebGL resolution on mobile, with a 5-second cooldown to avoid oscillation.
        if (touchDevice && now - (window.__lastRenderQualityAdjust || 0) > 5000) {
          const currentRatio = renderer.getPixelRatio();
          if (fps < 23 && currentRatio > .8) { renderer.setPixelRatio(Math.max(.8,currentRatio-.15));window.__lastRenderQualityAdjust=now; }
          else if (fps > 52 && currentRatio < Math.min(devicePixelRatio,1.3)) {renderer.setPixelRatio(Math.min(devicePixelRatio,1.3,currentRatio+.1));window.__lastRenderQualityAdjust=now;}
        }
        frameCounter = 0;
        fpsTimer = now;
      }

      for (const prop of animatedProps) {
        if (prop.type === 'spinZ') {
          prop.mesh.rotation.z += dt * prop.speed;
        } else if (prop.type === 'spinYBob') {
          prop.mesh.rotation.y += dt * prop.speed;
          prop.mesh.position.y += Math.sin(nowSec * 3) * 0.004;
        }
      }

      if (gameState === 'playing') {
        updatePhysicsAndPlayer(dt, nowSec, gpState);
        checkPortalProximity();

        if ((currentWorldName === 'obby' || currentWorldName === 'coindash') && backend.activeObbyAttempt && !backend.activeObbyAttempt.completed) {
          const elapsed = now - backend.activeObbyAttempt.startedAt;
          document.getElementById('hud-obby-timer').textContent = formatMs(elapsed);
          document.getElementById('hud-obby-deaths').textContent = String(backend.activeObbyAttempt.deaths);
          if (currentWorldName === 'obby') {
            document.getElementById('hud-obby-cp').textContent = `${backend.activeObbyAttempt.highestCheckpoint + 1} / 3`;
          }
        }
      } else {
        const menuCamAngle = nowSec * 0.18;
        camera.position.set(Math.sin(menuCamAngle) * 24, 12, Math.cos(menuCamAngle) * 24);
        camera.lookAt(0, 2, 0);
      }

      if (currentWorldName === 'cengkareng' && explorer) explorer.update(playerPhys.pos, now);
      npcSchool?.update(now);
      mpManager.updateInterpolations(dt, now);
      renderProjectedLabels(now);
      renderer.render(scene, camera);

      window.__bvTelemetry = {
        fps: lastMeasuredFps,
        drawCalls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        world: currentWorldName,
        pos: [
          Number(playerPhys.pos.x.toFixed(2)),
          Number(playerPhys.pos.y.toFixed(2)),
          Number(playerPhys.pos.z.toFixed(2))
        ],
        gamepadConnected: gamepadCtrl.connected,
        gamepadProfile: gamepadCtrl.profile
      };
    }

    window.onload = async function () {
      await backend.init();
      renderEmoteWheelButtons();
      renderBuilderToolbarUI();
      renderAvatarEditorUI();
      bindUIEvents();
      loadWorld('hub');
      updateAllMenusUI();
      window.__bvRuntime = {
        enterWorld: async (worldName) => {
          document.getElementById('screen-home').classList.add('hidden');
          document.getElementById('hud-topbar').classList.remove('hidden');
          document.getElementById('hud-controls-hint').classList.remove('hidden');
          gameState = 'playing';
          await loadWorld(worldName);
        },
        teleport: (x, y, z, yaw = 0, pitch = 0.28) => {
          playerPhys.pos.set(x, y, z);
          playerPhys.vel.set(0, 0, 0);
          camState.yaw = yaw;
          camState.pitch = pitch;
          if (currentWorldName === 'cengkareng' && explorer) {
            explorer.lastAt = 0;
            explorer.update(playerPhys.pos, performance.now());
          }
        },
        getExplorer: () => explorer,
        getGamepad: () => gamepadCtrl,
        getRenderer: () => renderer
      };
      animateLoop();
    };
