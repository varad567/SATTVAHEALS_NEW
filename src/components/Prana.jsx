/**
 * FILE: src/components/Prana.jsx
 * PURPOSE: The guide character — three morphing blobs with a face (docs/DESIGN.md §2).
 * PROPS:
 *   size   — width in px (height is 0.957 × size). Omit it to size from CSS via --prana-s (1 = 230px).
 *   colors — [backTop, backBottom, front]; front = dominant dosha. Default = all three doshas.
 *   mood   — 'idle' | 'happy' | 'humming'
 *   popKey — change it to replay the bounce (e.g. after a user action)
 * USED BY: landing sections, every app screen.
 */
import './prana.css';

export const DOSHA_COLORS = { vata: '#C4B1D8', pitta: '#EAA459', kapha: '#765387' };
const ALL = [DOSHA_COLORS.pitta, DOSHA_COLORS.kapha, DOSHA_COLORS.vata];

export default function Prana({ size, colors = ALL, mood = 'idle', popKey = 0 }) {
  const [top, bottom, front] = colors;
  return (
    <div className="prana" aria-hidden="true" style={size ? { '--prana-s': size / 230 } : undefined}>
      {/* Drawn at 230px and scaled, so every size keeps identical proportions. */}
      <div className="prana__stage">
        <div key={popKey} className="prana__pop">
          <div className="prana__body">
            <span className="prana__l1" style={{ background: top }} />
            <span className="prana__l2" style={{ background: bottom }} />
            <span className="prana__l3" style={{ background: front }}>
              <span className={`prana__face prana__face--${mood}`}>
                <span className="prana__eyes"><i /><i /></span>
                <span className="prana__mouth" />
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
