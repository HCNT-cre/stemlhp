import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
// import Dashboard from './pages/dashboard';
import BaiGiang from './pages/baiGiang';
import TrongTruong from './pages/trongTruong';
import Upload from './pages/upload';

const router = createBrowserRouter([
  { path: '/', element: <BaiGiang /> },
  { path: '/baigiang', element: <BaiGiang /> },
  { path: '/upload', element: <Upload /> },
  { path: '/trongtruong', element: <TrongTruong /> },
  { path: '*', element: <div>404 - Not Found</div> },
]);

const App: React.FC = () => {
  return (
    <I18nextProvider i18n={i18n}>
      <RouterProvider router={router} />
    </I18nextProvider>
  );
};

export default App;
