import { useAuth } from "react-oidc-context";

function ProtectedRoute({ children }) {
  const auth = useAuth();

  if (auth.isLoading) {
    return (
      <div className="flex items-center justify-center h-screen text-xl">
        Loading...
      </div>
    );
  }

  if (auth.error) {
    return (
      <div className="text-red-500 text-center mt-20">
        {auth.error.message}
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    auth.signinRedirect();
    return null;
  }

  return children;
}

export default ProtectedRoute;