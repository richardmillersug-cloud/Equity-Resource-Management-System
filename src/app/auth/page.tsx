import AuthContainer from '../../components/auth/AuthContainer';

export default function AuthPage() {
  return (
    <AuthContainer 
      defaultMode="login"
      onAuthSuccess={(user) => {
        // Redirect to dashboard after successful authentication
        window.location.href = '/';
      }}
    />
  );
} 