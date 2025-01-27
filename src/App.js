import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Homepage from "./components/Homepage";
import ARBookScanner from "./components/ARBookScanner";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/scanner" element={<ARBookScanner />} />
      </Routes>
    </Router>
  );
};

export default App;