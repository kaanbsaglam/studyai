import { createContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const isTokenExpired = (decoded) => {
    if (!decoded?.exp) return true;
    const nowSeconds = Math.floor(Date.now() / 1000);
    return decoded.exp <= nowSeconds;
  };

  // Initialize user *synchronously* from localStorage
  const initialUser = (() => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    try {
      const decoded = jwtDecode(token);
      if (isTokenExpired(decoded)) {
        localStorage.removeItem("token");
        return null;
      }
      return decoded;
    } catch {
      localStorage.removeItem("token");
      return null;
    }
  })();

  const [user, setUser] = useState(initialUser);

  const login = (token) => {
    localStorage.setItem("token", token);
    const decoded = jwtDecode(token);
    if (isTokenExpired(decoded)) {
      localStorage.removeItem("token");
      setUser(null);
      return;
    }
    setUser(decoded);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
