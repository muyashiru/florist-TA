import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Outlet } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import FloatingWA from './components/FloatingWA';
import Home from './pages/Home';
import AboutPage from './pages/AboutPage';
import CatalogPage from './pages/CatalogPage';
import ContactPage from './pages/ContactPage';
import Dashboard from './pages/Dashboard';
import Overview from './pages/Overview';
import LoginAdmin from './pages/LoginAdmin';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Instant scroll ke top (tidak smooth)
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function MainLayout() {
  return (
    <>
      <Navbar />
      <main className="pt-16">
        <Outlet />
      </main>
      <Footer />
      <FloatingWA />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* Halaman Publik (dengan Navbar, Footer, WA) */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/contact" element={<ContactPage />} />
        </Route>

        {/* Halaman Admin (Murni, tanpa Navbar/Footer publik) */}
        <Route path="/admin/login" element={<LoginAdmin />} />
        <Route path="/admin/overview" element={<Overview />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

