import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Controller from './pages/Controller';
import Editor from './pages/Editor';

function App() {
  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/controller" element={<Controller />} />
          <Route path="/editor" element={<Editor />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
