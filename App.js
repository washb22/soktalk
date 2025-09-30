// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet } from 'react-native';
import LoginScreen from './screens/LoginScreen';

// AuthProvider 임포트
import { AuthProvider, useAuth } from './contexts/AuthContext';

// 화면 컴포넌트들 임포트
import AuthScreen from './screens/AuthScreen';
import SignUpScreen from './screens/SignUpScreen';
import HomeScreen from './screens/HomeScreen';
import WritePostScreen from './screens/WritePostScreen';
import PostDetailScreen from './screens/PostDetailScreen';
import EditPostScreen from './screens/EditPostScreen';
import ProfileScreen from './screens/ProfileScreen';

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
            options={{
              headerShown: false
            }}
          />
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
        <>
          <Stack.Screen name="Auth" component={AuthScreen} />
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="SignUp"
            component={SignUpScreen}
            options={{
              headerShown: false
            }}
          />
        </>
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
});