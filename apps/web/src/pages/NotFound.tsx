import { Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { useI18n } from "../i18n/useI18n";
import styles from "./NotFound.module.css";

/**
 * 渲染 404 页面，并提供返回首页的导航入口。
 */
const NotFoundPage = () => {
  const { t } = useI18n();

  return (
    <AuthLayout
      pageName="not-found"
      cardTitle={t("notFound.title")}
      cardDescription={t("notFound.description")}
    >
      <div className={styles.notFoundPage} data-ui="not-found-content">
        <div className={styles.notFoundContent} data-slot="not-found-body">
          <div className={styles.statusCode}>404</div>
          <p className={styles.suggestionText}>{t("notFound.description")}</p>
        </div>

        <Link to="/" className="form-button" data-ui="not-found-home-link">
          {t("notFound.backHome")}
        </Link>
      </div>
    </AuthLayout>
  );
};

export default NotFoundPage;
