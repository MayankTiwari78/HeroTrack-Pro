import { Navigate } from 'react-router-dom';

const activeRoles = ["admin", "manager", "staff"];

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch (_error) {
    return null;
  }
};

function UnauthorizedAccess() {
  return (
    <section className="enterprise-page">
      <div className="alert-strip">
        <strong>403 Unauthorized</strong>
        <span> Your role does not have access to this workspace area.</span>
      </div>
    </section>
  );
}

const ProtectedRoute = ({ element, allowedRoles = [] }) => {
  const user = getStoredUser();

  if (!user) return <Navigate to="/LoginPage" replace />;
  if (!activeRoles.includes(user.role)) return <UnauthorizedAccess />;
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <UnauthorizedAccess />;
  }

  return element;
};

export default ProtectedRoute;
