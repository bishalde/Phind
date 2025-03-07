import { createContext, useContext } from "react";

interface UserContextProps {
  userData: object;
}

const UserContext = createContext<UserContextProps | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

export const UserProvider = ({
  userData,
  children,
}: {
  userData: object;
  children: React.ReactNode;
}) => {
  return (
    <UserContext.Provider value={{ userData }}>
      {children}
    </UserContext.Provider>
  );
};