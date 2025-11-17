import { Link } from 'react-router-dom';
import './Landing.css';

function Landing() {
  return (
    <div className="landing-container">
      <div className="landing-content">
        <h1>Sam Speak</h1>
        <div className="button-container">
          <Link to="/controller" className="mode-button controller">
            <span className="material-symbols-outlined icon">grid_view</span>
            <span className="label">Voice Pads</span>
            <span className="description">Display and tap pads</span>
          </Link>
          <Link to="/editor" className="mode-button editor">
            <span className="material-symbols-outlined icon">keyboard</span>
            <span className="label">Pad Editor</span>
            <span className="description">Edit pad text</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Landing;
