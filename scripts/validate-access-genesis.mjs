import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const projectRoot = process.cwd();
const catalog = JSON.parse(fs.readFileSync(path.join(projectRoot, 'src', 'data', 'catalog_420_v2.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(projectRoot, 'src', 'data', 'catalog_manifest.json'), 'utf8'));
const expectedRarities = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];

function assert(condition, message) {
  if (!condition) throw new Error(`Access Genesis validation failed: ${message}`);
}

assert(manifest.total_strains === 420, 'manifest total must be 420');
assert(catalog.length === 420, 'catalog must contain 420 entries');
assert(new Set(catalog.map((entry) => entry.id)).size === 420, 'token ids must be unique');
assert(new Set(catalog.map((entry) => entry.name)).size === 420, 'catalog names must be unique');
assert(new Set(catalog.map((entry) => entry.slug)).size === 420, 'catalog slugs must be unique');

for (let index = 0; index < catalog.length; index += 1) {
  const entry = catalog[index];
  assert(entry.id === index + 1, `catalog row ${index + 1} must map to token id ${index + 1}`);
  assert(expectedRarities.includes(entry.rarity), `token ${entry.id} has invalid rarity ${entry.rarity}`);
  assert(entry.data_provenance && Object.values(entry.data_provenance).every((value) => value.includes('generated_estimate')), `token ${entry.id} is missing estimate labels`);
}

for (const rarity of expectedRarities) {
  const count = catalog.filter((entry) => entry.rarity === rarity).length;
  assert(count === manifest.rarity_tiers[rarity], `${rarity} count ${count} does not match manifest ${manifest.rarity_tiers[rarity]}`);
}

console.log('Validated 420 one-to-one Access Genesis identities and five-tier rarity manifest.');
