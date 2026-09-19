import type { PlantTraining as Training, Position } from '../types';

export function PlantTraining({ position, progress, failed, onTrain }: { position: Position; progress: number; failed: boolean; onTrain: (id: string, training: Training) => void }) {
  const locked = position.trainedAt !== undefined || progress >= .52 || failed;
  return <section className="plant-training"><strong>Shape this cycle</strong><p>{locked ? `This cycle keeps its ${position.training ?? 'natural'} shape.` : 'Choose once before canopy filling. The branches develop toward your choice.'}</p><div>{(['natural', 'wide', 'tall'] as const).map(value => <button type="button" key={value} disabled={locked} aria-pressed={(position.training ?? 'natural') === value} onClick={() => onTrain(position.id, value)}>{value === 'natural' ? 'Natural' : value === 'wide' ? 'Wide canopy' : 'Tall canopy'}</button>)}</div><small>Appearance only · no cost or yield bonus. Water care still affects crop output.</small></section>;
}
