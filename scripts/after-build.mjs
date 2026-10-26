// After tsup: writes dist/styles.css (the base rules and the five chat states, what /styles.css promises),
// marks the React entry as a client module, and checks Blobatar's notice survived in the bundles.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIST = path.join(ROOT, 'dist');
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map(l => l.trim()).filter(Boolean).join('\n');
const read = p => fs.readFileSync(path.join(ROOT, 'data', p), 'utf8');
const chat = JSON.parse(read('events.json')).states.filter(k => JSON.parse(read('states/' + k + '.json')).group === 'chat');
const notice = '/*! wobbli styles. Built on Blobatar 2.7.0 by Alain (MIT), see THIRD_PARTY_NOTICES.md. */\n';
fs.writeFileSync(path.join(DIST, 'styles.css'), notice + [strip(read('runtime.css')), strip(read('base.css')), ...chat.map(k => strip(read('states/' + k + '.css')))].join('\n') + '\n');

const react = path.join(DIST, 'react.js');
const src = fs.readFileSync(react, 'utf8');
if (!src.startsWith("'use client'") && !src.startsWith('"use client"')) fs.writeFileSync(react, "'use client';\n" + src);

const js = fs.readdirSync(DIST).filter(f => f.endsWith('.js'));
const withBlob = js.filter(f => fs.readFileSync(path.join(DIST, f), 'utf8').includes('Copyright (c) 2026 Alain'));
if (!withBlob.length) throw new Error('Blobatar licence notice missing from the bundles');
console.log('styles.css written; Blobatar notice kept in', withBlob.join(', '));
