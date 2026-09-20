import { BotanicalPortrait } from './BotanicalPortrait';
import { GROWTH_MILESTONES, growthMilestone, plantMarks, type PlantAppearance } from '../lib/plantGrowth';
import './livingPlant.css';

export function LivingPlant(props: PlantAppearance & { name?: string; preview?: boolean; archived?: boolean; rendererVersion?: 1 | 2 }) {
  const current = growthMilestone(props.progress);
  return <figure className="living-plant">
    <div className="living-plant-portrait">
      {props.rendererVersion === 1 ? <svg viewBox="0 0 160 180" role="img" aria-label={`${props.name ?? 'Seed'}: ${props.failed ? 'failed crop' : current.name}, water ${Math.round(props.water ?? 100)} percent`}>
        <ellipse cx="80" cy="149" rx="58" ry="10" fill="#172e25"/>
        <path d="M22 149 Q80 162 138 149 L138 174 Q80 184 22 174Z" fill="#513d30"/>
        <path d="M25 157 H47 M110 166 H130 M39 172 H56" stroke="#9a775344"/>
        <g>{plantMarks(props).map((mark, index) => <path key={index} d={mark.d} fill={mark.fill} stroke={mark.stroke} strokeWidth={mark.width} opacity={mark.opacity} strokeLinecap="round" strokeLinejoin="round"/>)}</g>
      </svg> : <BotanicalPortrait appearance={props} archived={props.archived} label={`${props.name ?? 'Seed'}: ${props.failed ? 'failed crop' : current.name}, water ${Math.round(props.water ?? 100)} percent`}/>}
      <span className="living-plant-id">SEED #{props.seed} · {props.archived ? 'SAVED CYCLE' : props.preview ? 'GROWTH PREVIEW' : 'LIVING PORTRAIT'}</span>
    </div>
    <figcaption><strong>{props.failed ? 'Crop failed' : current.name}</strong><p>{props.archived ? 'This cycle is finished. Its final appearance is preserved here.' : props.failed ? 'This cycle has ended. Clear the bed to grow again.' : current.detail}</p></figcaption>
    <ol className="living-plant-milestones" aria-label="Growth milestones">{GROWTH_MILESTONES.map(stage => <li key={stage.at} className={props.progress >= stage.at ? 'reached' : ''} aria-current={!props.failed && current.at === stage.at ? 'step' : undefined}><i/><span>{stage.name}</span></li>)}</ol>
    <small className="living-plant-note">{props.archived ? 'Final appearance saved at the end of this cycle.' : <>{props.preview ? 'Illustrative mature portrait. ' : ''}Appearance grows between milestones. Late flower is visible when auto-harvest is off; it adds no yield bonus.</>}{(props.damage ?? 0) > 0 && ' Older leaves retain marks from missed care.'}</small>
  </figure>;
}
