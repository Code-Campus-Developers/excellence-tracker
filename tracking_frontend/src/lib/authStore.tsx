import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

export type Role = "ADMIN" | "MENTOR" | "STUDENT";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  track?: string | null;
  profilePicture?: string | null;
  createdAt?: string | null;
}

export interface AuthStudent {
  id: string;
  studentCode: string;
  name: string;
  track: string;
  avatarColor: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  student: AuthStudent | null;
  isLoading: boolean;
  login: (token: string, user: AuthUser, student?: AuthStudent | null) => void;
  logout: () => void;
  updateUser: (updates: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthState | null>(null);

const STORAGE_KEY = "excellence_auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [student, setStudent] = useState<AuthStudent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          token: string;
          user: AuthUser;
          student?: AuthStudent | null;
        };
        setToken(parsed.token);
        setUser(parsed.user);
        setStudent(parsed.student ?? null);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (
    newToken: string,
    newUser: AuthUser,
    newStudent?: AuthStudent | null
  ) => {
    setToken(newToken);
    setUser(newUser);
    setStudent(newStudent ?? null);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ token: newToken, user: newUser, student: newStudent ?? null })
    );
  };

  const updateUser = (updates: Partial<AuthUser>) => {
    const updated = { ...user, ...updates } as AuthUser;
    setUser(updated);
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...parsed, user: updated }));
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setStudent(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, token, student, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
