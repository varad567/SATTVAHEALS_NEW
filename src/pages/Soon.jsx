/**
 * FILE: src/pages/Soon.jsx
 * PURPOSE: Placeholder for routes not built yet, and the 404 page.
 * PROPS: title, notFound (bool), back (where the button goes, default '/')
 */
import { Link } from 'react-router-dom';
import Prana from '../components/Prana.jsx';

export default function Soon({ title, notFound = false, back = '/' }) {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
      <div style={{ display: 'grid', justifyItems: 'center', gap: 18 }}>
        <Prana size={150} />
        <h1 style={{ fontSize: 40 }}>{title}</h1>
        <p>{notFound ? "Prana couldn't find this page." : 'Prana is still getting this ready.'}</p>
        <Link to={back} className="btn">{back === '/' ? 'Back to home' : 'Back'} <span aria-hidden="true">→</span></Link>
      </div>
    </main>
  );
}
