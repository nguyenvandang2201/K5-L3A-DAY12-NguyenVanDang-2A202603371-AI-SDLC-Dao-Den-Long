import { readFileSync, writeFileSync } from 'node:fs';
writeFileSync('THIRD_PARTY_LICENSES.txt', `Third-party code included in the browser distribution\n\nThree.js\nhttps://github.com/mrdoob/three.js\n\n${readFileSync('node_modules/three/LICENSE', 'utf8')}\n`);
