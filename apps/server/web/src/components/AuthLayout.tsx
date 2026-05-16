import type { ReactNode } from "react";
import { useI18n } from "../i18n/useI18n";

type AuthLayoutProps = {
  pageName?: string;
  cardTitle: string;
  cardDescription: string;
  children: ReactNode;
};

/**
 * 渲染认证类页面的统一展示布局，承载品牌展示区和表单卡片内容。
 */
const AuthLayout = ({
  pageName,
  cardTitle,
  cardDescription,
  children,
}: AuthLayoutProps) => {
  const { t } = useI18n();

  return (
    <div
      className="auth-page auth-layout"
      data-page={pageName}
      data-ui="auth-layout"
    >
      <section
        className="auth-showcase auth-layout-showcase"
        data-slot="auth-showcase"
      >
        <p className="auth-eyebrow">{t("auth.brandEyebrow")}</p>
        <div className="auth-wordmark" aria-label="NAVIX">
          <span className="auth-wordmarkCore">NAVIX</span>
          <span className="auth-wordmarkShadow" aria-hidden="true">
            NAVIX
          </span>
          <span className="auth-wordmarkGlow" aria-hidden="true">
            NX
          </span>
        </div>
        <p className="auth-heroBody">{t("auth.brandTitle")}</p>
      </section>

      <section
        className="auth-container auth-layout-card"
        data-slot="auth-card"
      >
        <div
          className="auth-card-header auth-layout-card-header"
          data-slot="auth-card-header"
        >
          <h2 className="auth-card-title">{cardTitle}</h2>
          {cardDescription ? (
            <p className="auth-card-description">{cardDescription}</p>
          ) : null}
        </div>
        {children}
      </section>
    </div>
  );
};

export default AuthLayout;
