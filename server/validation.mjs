/** Server-owned canonical input validation: never trust playerId, roomKey or rewards from clients. */
export const MAX_PLAYERS = 16;
export const ALLOWED_WORLDS = new Set(['hub', 'obby', 'builder', 'coindash']);
export const ALLOWED_EMOTES = new Set(['WAVE', 'GG', 'FOLLOW', 'JUMP', 'BUILD', 'CHEER']);
export const COLORS = new Set(['#4CC9F0','#3DD6D0','#FFCB47','#FF6B6B','#6FCF97','#F7FBFF','#A78BFA','#F97316','#FFE0BD','#F1C27D','#E0AC69','#C68642','#8D5524','#14213D','#2B3A67']);
export const ACCESSORIES = new Set(['none','cap','visor','backpack','halo']);
export function roomId(value) { const r = typeof value === 'string' ? value.trim().toUpperCase() : ''; return /^[A-Z0-9_-]{1,16}$/.test(r) ? r : null; }
export function displayName(value) { const s = typeof value === 'string' ? value.trim() : '';return /^[a-zA-Z0-9_-]{3,16}$/.test(s) ? s : null; }
export function avatar(value) {if(!value || typeof value !== 'object' || Array.isArray(value))return null;const {torsoColor,headColor,limbColor,accessory}=value;if (![torsoColor,headColor,limbColor].every(x=>COLORS.has(x)) || !ACCESSORIES.has(accessory))return null;return {torsoColor,headColor,limbColor,accessory};}
export function position(value){if(!Array.isArray(value)||value.length!==3||!value.every(n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=1000))return null;return value.map(n=>Math.round(n*100)/100);}
export function rotation(value){return typeof value==='number'&&Number.isFinite(value)&&Math.abs(value)<=100 ? value : null;}
export function json(data){try{const s=JSON.stringify(data);return s && s.length<=2048?s:null;}catch{return null;}}
export function originAllowed(origin,allowed){return !origin ? false : allowed.includes(origin);}
