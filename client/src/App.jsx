import { Outlet } from 'react-router-dom';
import Header from './components/Header.jsx';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-indigo-50">
      <Header />
      <main className="container mx-auto px-2 md:px-8 py-6">
        <Outlet /> {/* This will render the current page component */}
      </main>
    </div>
  );
}

export default App;