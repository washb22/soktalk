// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

// AuthProvider 임포트
import { AuthProvider, useAuth } from './contexts/AuthContext';

// 화면 컴포넌트들 임포트
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import WritePostScreen from './screens/WritePostScreen';
import PostDetailScreen from './screens/PostDetailScreen';
import EditPostScreen from './screens/EditPostScreen';

function BoardScreen({ navigation }) {
  return <HomeScreen navigation={navigation} category="연애상담" />;
}

function ChatScreen({ navigation }) {
  return <HomeScreen navigation={navigation} category="잡담" />;
}


function CompatibilityScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>오늘의 궁합</Text>
      <Text>1일 1회 궁합보기</Text>
    </View>
  );
}

function ProfileScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Ionicons name="person-circle" size={80} color="#FF6B6B" />
      <Text style={styles.title}>마이페이지</Text>

      {user && (
        <View style={styles.userInfo}>
          <Text style={styles.infoText}>닉네임: {user.nickname || '익명'}</Text>
          <Text style={styles.infoText}>이메일: {user.email || '-'}</Text>
        </View>
      )}

      <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
        <Text style={styles.logoutText}>로그아웃</Text>
      </TouchableOpacity>
    </View>
  );
}

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === '인기글') {
            iconName = focused ? 'flame' : 'flame-outline';
          } else if (route.name === '연애상담') {
            iconName = focused ? 'heart' : 'heart-outline';
          } else if (route.name === '잡담') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === '궁합') {
            iconName = focused ? 'sparkles' : 'sparkles-outline';
          } else if (route.name === 'MY') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#FF6B6B',
        tabBarInactiveTintColor: 'gray',
        headerStyle: {
          backgroundColor: '#FF6B6B',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen name="인기글" component={HomeScreen} />
      <Tab.Screen name="연애상담" component={BoardScreen} />
      <Tab.Screen name="잡담" component={ChatScreen} />
      <Tab.Screen name="궁합" component={CompatibilityScreen} />
      <Tab.Screen name="MY" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { user, isLoading } = useAuth();

  console.log('User logged in:', user ? 'Yes' : 'No');
  console.log('Loading:', isLoading);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text>로딩중...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen
            name="WritePost"
            component={WritePostScreen}
            options={{
              presentation: 'modal',
              headerShown: false
            }}
          />
          <Stack.Screen
            name="PostDetail"
            component={PostDetailScreen}
          />
          {/* ← 여기에 추가 */}
          <Stack.Screen
            name="EditPost"
            component={EditPostScreen}
            options={{
              presentation: 'modal',
              headerShown: false
            }}
          />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthScreen} />
      )}
    </Stack.Navigator>
  );
}

  export default function App() {
    return (
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    );
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#fff',
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 20,
      marginTop: 16,
    },
    userInfo: {
      backgroundColor: '#f8f8f8',
      padding: 20,
      borderRadius: 10,
      marginVertical: 20,
      width: '80%',
    },
    infoText: {
      fontSize: 16,
      marginVertical: 5,
      color: '#333',
    },
    logoutBtn: {
      marginTop: 20,
      padding: 15,
      paddingHorizontal: 40,
      backgroundColor: '#FF6B6B',
      borderRadius: 10,
    },
    logoutText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
    },
  });