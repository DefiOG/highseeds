import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import solc from 'solc';

const projectRoot = process.cwd();
const sourceRoot = path.join(projectRoot, 'contracts', 'src');
const artifactRoot = path.join(projectRoot, 'contracts', 'artifacts');
const frontendAbiRoot = path.join(projectRoot, 'src', 'chain', 'generated');
const targets = ['LoudAccess', 'LoudPlot', 'LoudPositions'];

const sources = Object.fromEntries(
  fs.readdirSync(sourceRoot)
    .filter((file) => file.endsWith('.sol'))
    .map((file) => [`contracts/src/${file}`, { content: fs.readFileSync(path.join(sourceRoot, file), 'utf8') }]),
);

function findImport(importPath) {
  const candidates = [
    path.join(projectRoot, importPath),
    path.join(projectRoot, 'node_modules', importPath),
    path.join(sourceRoot, importPath),
  ];
  const match = candidates.find((candidate) => fs.existsSync(candidate));
  return match ? { contents: fs.readFileSync(match, 'utf8') } : { error: `Import not found: ${importPath}` };
}

const input = {
  language: 'Solidity',
  sources,
  settings: {
    evmVersion: 'shanghai',
    optimizer: { enabled: true, runs: 200 },
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object', 'metadata'],
      },
    },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImport }));
const errors = (output.errors ?? []).filter((entry) => entry.severity === 'error');
if (errors.length) {
  for (const error of errors) console.error(error.formattedMessage);
  process.exit(1);
}

fs.mkdirSync(artifactRoot, { recursive: true });
fs.mkdirSync(frontendAbiRoot, { recursive: true });

for (const target of targets) {
  const sourceName = `contracts/src/${target}.sol`;
  const compiled = output.contracts?.[sourceName]?.[target];
  if (!compiled) throw new Error(`Missing compiled target ${target}`);

  const artifact = {
    contractName: target,
    sourceName,
    abi: compiled.abi,
    bytecode: `0x${compiled.evm.bytecode.object}`,
    deployedBytecode: `0x${compiled.evm.deployedBytecode.object}`,
  };
  fs.writeFileSync(path.join(artifactRoot, `${target}.json`), `${JSON.stringify(artifact, null, 2)}\n`);
  fs.writeFileSync(
    path.join(frontendAbiRoot, `${target}.json`),
    `${JSON.stringify({ contractName: target, abi: compiled.abi }, null, 2)}\n`,
  );
}

console.log(`Compiled ${targets.join(', ')} with solc ${solc.version()}.`);
