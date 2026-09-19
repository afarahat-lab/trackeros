import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../modules/auth/index';

export function LogoutButton() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/login', { replace: true }); };
  return <button type="button" onClick={handleLogout}>Log out</button>;
}
