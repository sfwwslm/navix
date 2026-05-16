import { AppRoutes } from "./router";
import Footer from "./components/Footer";
import "./App.css";

/**
 * 渲染 Web 应用根组件，负责挂载路由、页脚和全局视觉背景。
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
