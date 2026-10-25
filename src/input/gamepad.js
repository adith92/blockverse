// Cross-Platform Gamepad Subsystem for BLOCKVERSE V2
// Supports Android (Chrome/Samsung/Firefox), macOS (Safari/Chrome/Firefox),
// Windows (Chrome/Edge/Firefox XInput & DirectInput), and iOS/iPadOS (Safari 16+ MFi/DualSense/Xbox/Switch).

export const CONTROLLER_PROFILES = Object.freeze({
  xbox: {
    name: 'Xbox Controller',
    south: 'A', east: 'B', west: 'X', north: 'Y',
    lb: 'LB', rb: 'RB', lt: 'LT', rt: 'RT',
    select: 'View', start: 'Menu'
  },
  playstation: {
    name: 'PlayStation DualSense/DS4',
    south: '✕', east: '○', west: '□', north: '△',
    lb: 'L1', rb: 'R1', lt: 'L2', rt: 'R2',
    select: 'Share', start: 'Options'
  },
  nintendo: {
    name: 'Nintendo Switch Controller',
    south: 'B', east: 'A', west: 'Y', north: 'X',
    lb: 'L', rb: 'R', lt: 'ZL', rt: 'ZR',
    select: '−', start: '+'
  },
  mfi: {
    name: 'Apple MFi / iOS Gamepad',
    south: 'A', east: 'B', west: 'X', north: 'Y',
    lb: 'L1', rb: 'R1', lt: 'L2', rt: 'R2',
    select: 'Select', start: 'Menu'
  },
  generic: {
    name: 'Gamepad',
    south: 'A/✕', east: 'B/○', west: 'X/□', north: 'Y/△',
    lb: 'L1', rb: 'R1', lt: 'L2', rt: 'R2',
    select: 'Select', start: 'Start'
  }
});

export function detectControllerFamily(idString = '') {
  const s = String(idString).toLowerCase();
  if (s.includes('xbox') || s.includes('xinput') || s.includes('045e')) {
    return 'xbox';
  }
  if (s.includes('dualsense') || s.includes('dualshock') || s.includes('054c') || s.includes('playstation') || s.includes('wireless controller')) {
    return 'playstation';
  }
  if (s.includes('nintendo') || s.includes('pro controller') || s.includes('joy-con') || s.includes('057e')) {
    return 'nintendo';
  }
  if (s.includes('mfi') || s.includes('extended gamepad') || s.includes('nimbus') || s.includes('backbone')) {
    return 'mfi';
  }
  return 'generic';
}

export function detectPlatformBrowser() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  const platform = typeof navigator !== 'undefined' ? navigator.platform || '' : '';
  const maxTouch = typeof navigator !== 'undefined' ? navigator.maxTouchPoints || 0 : 0;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (platform === 'MacIntel' && maxTouch > 1);
  const isAndroid = /Android/i.test(ua);
  const isMac = !isIOS && /Mac/i.test(platform || ua);
  const isWindows = /Win/i.test(platform || ua);
  return {
    os: isIOS ? 'iOS/iPadOS' : isAndroid ? 'Android' : isMac ? 'macOS' : isWindows ? 'Windows' : 'Browser',
    isMobileOrTablet: isIOS || isAndroid || maxTouch > 1
  };
}

export class GamepadController {
  constructor({
    onStatusChange,
    onAction,
    getGameState
  } = {}) {
    this.onStatusChange = onStatusChange || (() => {});
    this.onAction = onAction || (() => {});
    this.getGameState = getGameState || (() => 'menu');

    this.platformInfo = detectPlatformBrowser();
    this.connected = false;
    this.activeIndex = -1;
    this.controllerId = '';
    this.family = 'generic';
    this.profile = CONTROLLER_PROFILES.generic;
    this.deadzone = 0.16;
    this.lookSpeed = 2.6;
    this.vibrationEnabled = true;

    this.prevButtons = new Array(20).fill(false);
    this.lastNavAt = 0;
    this.usingGamepadNow = false;
    this.sprintToggled = false;

    this.state = {
      moveX: 0,
      moveY: 0,
      lookYaw: 0,
      lookPitch: 0,
      zoomDelta: 0,
      sprint: false,
      jumpJustPressed: false
    };

    this._bindEvents();
  }

  _bindEvents() {
    if (typeof window === 'undefined') return;
    window.addEventListener('gamepadconnected', (e) => {
      this._adoptGamepad(e.gamepad);
    });
    window.addEventListener('gamepaddisconnected', (e) => {
      if (e.gamepad && e.gamepad.index === this.activeIndex) {
        this.connected = false;
        this.activeIndex = -1;
        this.usingGamepadNow = false;
        this._restoreTouchControls();
        this.onStatusChange(this.getStatusSummary());
      }
    });
    // Restore touch controls immediately if player touches screen on Android/iOS
    window.addEventListener('touchstart', () => {
      if (this.usingGamepadNow) {
        this.usingGamepadNow = false;
        this._restoreTouchControls();
      }
    }, { passive: true });
  }

  _adoptGamepad(gp) {
    if (!gp) return;
    const prevConnected = this.connected;
    const prevId = this.controllerId;
    this.connected = true;
    this.activeIndex = gp.index;
    this.controllerId = gp.id || 'Standard Gamepad';
    this.family = detectControllerFamily(this.controllerId);
    this.profile = CONTROLLER_PROFILES[this.family] || CONTROLLER_PROFILES.generic;
    if (!prevConnected || prevId !== this.controllerId) {
      this.onStatusChange(this.getStatusSummary());
    }
  }

  getStatusSummary() {
    return {
      connected: this.connected,
      os: this.platformInfo.os,
      family: this.family,
      profileName: this.profile.name,
      rawId: this.controllerId,
      labels: this.profile
    };
  }

  _applyRadialDeadzone(x, y) {
    const mag = Math.hypot(x, y);
    if (mag < this.deadzone) return [0, 0];
    const norm = Math.min(1, (mag - this.deadzone) / (1 - this.deadzone));
    // Smooth response curve (70% linear + 30% cubic) for accurate Obby control
    const curved = norm * (0.7 + 0.3 * norm * norm);
    return [(x / mag) * curved, (y / mag) * curved];
  }

  _readButton(gp, idx) {
    const b = gp.buttons?.[idx];
    if (!b) return { pressed: false, value: 0 };
    if (typeof b === 'object') {
      const val = typeof b.value === 'number' ? b.value : (b.pressed ? 1 : 0);
      return { pressed: Boolean(b.pressed || val > 0.55), value: val };
    }
    return { pressed: Boolean(b), value: b ? 1 : 0 };
  }

  _hideTouchControlsOnGamepadActivity() {
    if (!this.platformInfo.isMobileOrTablet) return;
    const tc = document.getElementById('touch-controls');
    if (tc && !tc.classList.contains('bv-gamepad-autohide')) {
      tc.classList.add('bv-gamepad-autohide');
    }
  }

  _restoreTouchControls() {
    const tc = document.getElementById('touch-controls');
    if (tc) tc.classList.remove('bv-gamepad-autohide');
  }

  /**
   * Poll navigator.getGamepads() every frame (required by iOS Safari 16+, macOS WebKit, and Chrome on Android/Windows).
   */
  poll(dt, nowMs) {
    this.state.moveX = 0;
    this.state.moveY = 0;
    this.state.lookYaw = 0;
    this.state.lookPitch = 0;
    this.state.zoomDelta = 0;
    this.state.jumpJustPressed = false;

    if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') {
      return this.state;
    }

    let pads;
    try {
      pads = navigator.getGamepads();
    } catch {
      return this.state;
    }
    if (!pads) return this.state;

    let gp = (this.activeIndex >= 0 && pads[this.activeIndex]?.connected) ? pads[this.activeIndex] : null;
    if (!gp) {
      for (let i = 0; i < pads.length; i++) {
        if (pads[i] && pads[i].connected) {
          gp = pads[i];
          break;
        }
      }
    }

    if (!gp) {
      if (this.connected) {
        this.connected = false;
        this.activeIndex = -1;
        this.onStatusChange(this.getStatusSummary());
      }
      return this.state;
    }

    if (!this.connected || this.activeIndex !== gp.index || this.controllerId !== gp.id) {
      this._adoptGamepad(gp);
    }

    const axes = gp.axes || [];
    const isStandard = gp.mapping === 'standard' || axes.length <= 4;

    // 1. Left Stick + D-pad (including Android DirectInput hat-switch axes[6]/axes[7] fallback)
    const rawLX = Number.isFinite(axes[0]) ? axes[0] : 0;
    const rawLY = Number.isFinite(axes[1]) ? axes[1] : 0;
    let [lx, ly] = this._applyRadialDeadzone(rawLX, rawLY);

    const dUp = this._readButton(gp, 12).pressed || (!isStandard && Number.isFinite(axes[7]) && axes[7] < -0.5);
    const dDown = this._readButton(gp, 13).pressed || (!isStandard && Number.isFinite(axes[7]) && axes[7] > 0.5);
    const dLeft = this._readButton(gp, 14).pressed || (!isStandard && Number.isFinite(axes[6]) && axes[6] < -0.5);
    const dRight = this._readButton(gp, 15).pressed || (!isStandard && Number.isFinite(axes[6]) && axes[6] > 0.5);

    const dpadX = (dRight ? 1 : 0) - (dLeft ? 1 : 0);
    const dpadY = (dDown ? 1 : 0) - (dUp ? 1 : 0);

    // 2. Right Stick (Standard: axes[2], axes[3]; some Android/DirectInput pads use axes[2], axes[5])
    const rawRX = Number.isFinite(axes[2]) ? axes[2] : 0;
    let rawRY = Number.isFinite(axes[3]) ? axes[3] : 0;
    if (!isStandard && Math.abs(rawRY) < 0.05 && Number.isFinite(axes[5])) {
      rawRY = axes[5];
    }
    const [rx, ry] = this._applyRadialDeadzone(rawRX, rawRY);

    // 3. Edge-detected button presses
    const pressedNow = [];
    const justPressed = [];
    for (let i = 0; i < 17; i++) {
      const p = this._readButton(gp, i).pressed;
      pressedNow[i] = p;
      justPressed[i] = p && !this.prevButtons[i];
      this.prevButtons[i] = p;
    }

    const anyActivity =
      Math.hypot(lx, ly) > 0.05 ||
      Math.hypot(rx, ry) > 0.05 ||
      dpadX !== 0 ||
      dpadY !== 0 ||
      pressedNow.some(Boolean);

    if (anyActivity) {
      this.usingGamepadNow = true;
      this._hideTouchControlsOnGamepadActivity();
    }

    // 4. Check if a Modal / Menu is currently open for D-pad UI navigation
    const openModal = this._getActiveOverlay();
    if (openModal) {
      const navX = dpadX !== 0 ? dpadX : (Math.abs(lx) > 0.65 ? Math.sign(lx) : 0);
      const navY = dpadY !== 0 ? dpadY : (Math.abs(ly) > 0.65 ? Math.sign(ly) : 0);
      if ((navX !== 0 || navY !== 0) && nowMs - this.lastNavAt > 210) {
        this.lastNavAt = nowMs;
        this._moveFocusInContainer(openModal, navX + navY);
      }
      if (justPressed[0]) {
        // South button (A / Cross) activates focused element in open modal/home screen
        const activeEl = document.activeElement;
        if (activeEl && openModal.contains(activeEl) && typeof activeEl.click === 'function') {
          activeEl.click();
        } else {
          const primaryBtn = openModal.querySelector('button:not([disabled])');
          if (primaryBtn) primaryBtn.click();
        }
        this.pulse(0.25, 45);
      }
      if (justPressed[1]) {
        // East button (B / Circle) closes active modal
        const closeBtn = openModal.querySelector('[data-close-modal], #btn-close-emote');
        if (closeBtn) closeBtn.click();
        else this.onAction('escape');
      }
      if (justPressed[9]) {
        this.onAction('escape');
      }
      return this.state;
    }

    // 5. Gameplay Analog Movement & Camera
    this.state.moveX = Math.max(-1, Math.min(1, lx + dpadX));
    this.state.moveY = Math.max(-1, Math.min(1, ly + dpadY));
    this.state.lookYaw = rx * this.lookSpeed * dt;
    this.state.lookPitch = ry * this.lookSpeed * 0.78 * dt;

    // Bumpers & Triggers
    const lb = this._readButton(gp, 4);
    const rb = this._readButton(gp, 5);
    const lt = this._readButton(gp, 6);
    const rt = this._readButton(gp, 7);

    if (lb.pressed) this.state.zoomDelta += 9.5 * dt;
    if (rb.pressed) this.state.zoomDelta -= 9.5 * dt;

    if (justPressed[10] || justPressed[1]) {
      this.sprintToggled = !this.sprintToggled;
    }
    if (Math.hypot(this.state.moveX, this.state.moveY) < 0.1) {
      this.sprintToggled = false;
    }
    this.state.sprint = this.sprintToggled || lt.value > 0.35 || rt.value > 0.35;

    // Gameplay Actions
    if (justPressed[0]) {
      this.state.jumpJustPressed = true;
    }
    if (justPressed[2]) {
      this.onAction('interact'); // [E] Portal / Waypoint / Builder action
    }
    if (justPressed[3]) {
      this.onAction('emoteOrBuilderTest'); // [Q] Emote wheel or [B] Builder Test
    }
    if (justPressed[8]) {
      this.onAction('mapOrWorlds'); // Toggle Cengkareng Map or World Switcher
    }
    if (justPressed[9]) {
      this.onAction('escape'); // [Esc] Pause / Settings
    }
    if (justPressed[11]) {
      this.onAction('respawnOrRotate'); // [R] Respawn or Rotate object
    }
    if (justPressed[4]) {
      this.onAction('cyclePrev');
    }
    if (justPressed[5]) {
      this.onAction('cycleNext');
    }

    return this.state;
  }

  _getActiveOverlay() {
    if (typeof document === 'undefined') return null;
    const modalIds = [
      'modal-qa', 'modal-docs', 'modal-json', 'modal-results',
      'modal-settings', 'modal-howto', 'modal-achievements',
      'modal-avatar', 'modal-worlds', 'emote-wheel-modal', 'screen-home'
    ];
    for (const id of modalIds) {
      const el = document.getElementById(id);
      if (el && !el.classList.contains('hidden')) return el;
    }
    return null;
  }

  _moveFocusInContainer(container, stepDir) {
    const focusables = Array.from(
      container.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])')
    ).filter(el => el.offsetParent !== null);
    if (!focusables.length) return;
    const curIdx = focusables.indexOf(document.activeElement);
    const nextIdx = curIdx === -1
      ? 0
      : (curIdx + (stepDir >= 0 ? 1 : -1) + focusables.length) % focusables.length;
    focusables[nextIdx].focus({ preventScroll: false });
  }

  pulse(intensity = 0.35, durationMs = 70) {
    if (!this.vibrationEnabled || !this.connected || typeof navigator === 'undefined') return;
    try {
      const pads = navigator.getGamepads?.();
      const gp = pads?.[this.activeIndex];
      if (!gp) return;
      if (gp.vibrationActuator?.playEffect) {
        gp.vibrationActuator.playEffect('dual-rumble', {
          startDelay: 0,
          duration: durationMs,
          weakMagnitude: Math.min(1, intensity),
          strongMagnitude: Math.min(1, intensity * 0.85)
        }).catch(() => {});
      } else if (gp.hapticActuators?.[0]?.pulse) {
        gp.hapticActuators[0].pulse(Math.min(1, intensity), durationMs).catch(() => {});
      }
    } catch {
      // Safe no-op on browsers/OSes without vibrationActuator (e.g., iOS Safari)
    }
  }
}
