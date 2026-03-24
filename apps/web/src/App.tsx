import { AppRoutes } from "./router";
import Footer from "./components/Footer";
import "./App.css";

/**
 * 应用程序的根组件，负责渲染路由和全局组件
 */
function App() {
  return (
    <div className="app-frame">
      <div className="app-background" aria-hidden="true">
        <div className="app-backgroundGlow app-backgroundGlowLeft" />
        <div className="app-backgroundGlow app-backgroundGlowRight" />
        <div className="app-backgroundNoise" />
      </div>
      <div className="app-content">
        <AppRoutes />
        <Footer />
      </div>
    </div>
  );
}

export default App;
