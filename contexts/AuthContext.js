// contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);  // true에서 false로 변경
  const [isNewUser, setIsNewUser] = useState(false);

  // 임시 로그인 함수
  const testLogin = () => {
    setUser({ 
      uid: 'test123', 
      email: 'test@test.com',
      nickname: '테스트유저' 
    });
  };

  // 로그아웃 함수
  const logout = () => {
    setUser(null);
  };

  const value = {
    user,
    isLoading,
    isNewUser,
    setIsNewUser,
    testLogin,
    logout,
    googleSignIn: () => console.log('Google 로그인'),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};