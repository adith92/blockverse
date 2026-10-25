// BLOCKVERSE validators shared by browser runtime and Node test suite.
export const MAX_WORLD_OBJECTS = 300;
export const ALLOWED_OBJECT_TYPES = Object.freeze(['block', 'ramp', 'platform', 'cylinder', 'sphere', 'tree', 'lamp', 'spawn']);
export const ALLOWED_ACCESSORIES = Object.freeze(['none', 'cap', 'visor', 'backpack', 'halo']);
export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
}

export const Validator = {
      isFiniteNumber(n, min, max) {
        return typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
      },
      isValidHexColor(c) {
        return typeof c === 'string' && /^#[0-9A-Fa-f]{6}$/.test(c);
      },
      sanitizeDisplayName(raw) {
        if (typeof raw !== 'string') return 'Builder0000';
        const cleaned = raw.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 16);
        return cleaned.length >= 3 ? cleaned : 'Builder' + Math.floor(1000 + Math.random() * 9000);
      },
      validateAvatar(avatar) {
        if (!avatar || typeof avatar !== 'object') return { ok: false, error: 'Invalid avatar object' };
        if (!this.isValidHexColor(avatar.torsoColor)) return { ok: false, error: 'Invalid torsoColor' };
        if (!this.isValidHexColor(avatar.headColor)) return { ok: false, error: 'Invalid headColor' };
        if (!this.isValidHexColor(avatar.limbColor)) return { ok: false, error: 'Invalid limbColor' };
        if (!ALLOWED_ACCESSORIES.includes(avatar.accessory)) return { ok: false, error: 'Unsupported accessory' };
        return { ok: true };
      },
      validateWorldObject(obj) {
        if (!obj || typeof obj !== 'object') return { ok: false, error: 'Object must be a record' };
        if (typeof obj.id !== 'string' || obj.id.length < 2 || obj.id.length > 48) {
          return { ok: false, error: 'Invalid object ID' };
        }
        if (!ALLOWED_OBJECT_TYPES.includes(obj.type)) {
          return { ok: false, error: `Unsupported object type: ${obj.type}` };
        }
        if (!Array.isArray(obj.position) || obj.position.length !== 3 ||
            !this.isFiniteNumber(obj.position[0], -120, 120) ||
            !this.isFiniteNumber(obj.position[1], -10, 80) ||
            !this.isFiniteNumber(obj.position[2], -120, 120)) {
          return { ok: false, error: 'Invalid or out-of-bounds object position' };
        }
        // Check reserved spawn protection area (0, y, 18) radius 2.2 unless type is spawn
        if (obj.type !== 'spawn') {
          const dx = obj.position[0] - 0;
          const dz = obj.position[2] - 18;
          if (Math.hypot(dx, dz) < 2.0 && obj.position[1] < 4) {
            return { ok: false, error: 'Cannot block reserved player spawn safety zone' };
          }
        }
        if (!Array.isArray(obj.rotation) || obj.rotation.length !== 3 ||
            !this.rotationEveryFinite(obj.rotation)) {
          return { ok: false, error: 'Invalid rotation vector' };
        }
        if (!Array.isArray(obj.scale) || obj.scale.length !== 3 ||
            !obj.scale.every(s => this.isFiniteNumber(s, 0.5, 20))) {
          return { ok: false, error: 'Scale must be finite between 0.5 and 20 units' };
        }
        if (!this.isValidHexColor(obj.color)) {
          return { ok: false, error: 'Invalid hex color format' };
        }
        return { ok: true };
      },
      rotationEveryFinite(rot) {
        return rot.every(r => this.isFiniteNumber(r, -Math.PI * 4, Math.PI * 4));
      },
      validateWorldPayload(payload, currentServerWorld, sessionPlayerId) {
        if (!payload || typeof payload !== 'object') return { status: 400, ok: false, error: 'Missing world payload' };
        if (currentServerWorld && currentServerWorld.ownerPlayerId !== sessionPlayerId) {
          return { status: 403, ok: false, error: 'Forbidden: Only the world owner can modify this world' };
        }
        if (currentServerWorld && payload.revision !== currentServerWorld.revision) {
          return { status: 409, ok: false, error: `Revision conflict: expected v${currentServerWorld.revision}, got v${payload.revision}` };
        }
        if (!Array.isArray(payload.objects) || payload.objects.length < 1 || payload.objects.length > MAX_WORLD_OBJECTS) {
          return { status: 400, ok: false, error: `World must contain between 1 and ${MAX_WORLD_OBJECTS} objects` };
        }
        for (const obj of payload.objects) {
          const check = this.validateWorldObject(obj);
          if (!check.ok) return { status: 400, ok: false, error: check.error };
        }
        return { status: 200, ok: true };
      },
      validatePlayerMovePacket(pkt) {
        if (!pkt || typeof pkt !== 'object') return false;
        if (!Array.isArray(pkt.position) || pkt.position.length !== 3) return false;
        if (!pkt.position.every(n => this.isFiniteNumber(n, -500, 500))) return false;
        if (!this.isFiniteNumber(pkt.rotY, -Math.PI * 4, Math.PI * 4)) return false;
        return true;
      }
};
