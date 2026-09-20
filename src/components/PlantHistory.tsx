import { useState } from 'react';
import { STRAINS } from '../data/economy';
import type { PlantRecord } from '../types';
import { LivingPlant } from './LivingPlant';

export function PlantHistory({ records, onPlant, availableSeedIds, hasBed }: { records: PlantRecord[]; onPlant: (seed: number) => void; availableSeedIds: number[]; hasBed: boolean }) {
  const [selected, setSelected] = useState('');
  const record = records.find(item => item.id === selected) ?? records[0];
  return <section className="plant-history"><h3>Your seed stories</h3><p>Finished cycles stay here while the same seed grows again. Saved in this browser.</p>{record ? <>
    <label>Saved cycle<select value={record.id} onChange={event => setSelected(event.target.value)}>{records.map(item => <option value={item.id} key={item.id}>Seed #{item.nftId} · Cycle {item.cycle} · {item.outcome === 'harvested' ? 'Harvested' : item.outcome === 'early' ? 'Early harvest' : 'Failed'} · {new Date(item.harvestedAt).toLocaleDateString()}</option>)}</select></label>
    <LivingPlant seed={record.nftId} progress={record.progress} water={record.water} damage={record.damage} training={record.training} failed={record.outcome === 'failed'} rendererVersion={record.rendererVersion} name={STRAINS.find(strain => strain.id === record.strainId)?.name} archived/>
    <p><strong>{record.grams.toFixed(2)}g</strong> harvested · {record.training} shape · Cycle {record.cycle}</p><button className="farm-primary" disabled={!hasBed || !availableSeedIds.includes(record.nftId)} onClick={() => onPlant(record.nftId)}>Start next cycle with seed #{record.nftId}</button>{(!hasBed || !availableSeedIds.includes(record.nftId)) && <p>Requires an empty bed and this seed active and available.</p>}
  </> : <p>Your first finished crop will appear here, including its final look and harvest result.</p>}</section>;
}
