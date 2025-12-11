import { createContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  // Initialize user *synchronously* from localStorage
  const initialUser = (() => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    try {
      return jwtDecode(token);
    } catch {
      localStorage.removeItem("token");
      return null;
    }
  })();

  const [user, setUser] = useState(initialUser);

  const login = (token) => {
    localStorage.setItem("token", token);
    setUser(jwtDecode(token));
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
