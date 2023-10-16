import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, StyleSheet, Image} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { RFValue } from 'react-native-responsive-fontsize';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import Home from './components/Home';
import Manage from './components/Manages';
import Setting from './components/Setting';

const getIcon = (route, focused, color) => {
  let IconComponent = Ionicons;
  let iconName;

  if (route.name === '홈') {
    iconName = focused ? 'home' : 'home-outline';
  } else if (route.name === '관리') {
    IconComponent = MaterialCommunityIcons;
    iconName = focused ? 'file-document' : 'file-document-outline';
  } else if (route.name === '설정') {
    iconName = focused ? 'settings' : 'settings-outline';
  }

  return (
    <View style={{ alignItems: 'center' }}>
      <IconComponent name={iconName} color={color} size={24} style={{ marginTop: Platform.OS === 'ios' ? 0 : 10 }} />
      <Text style={{ color }}>{route.name}</Text>
    </View>
  );
};

const Tab = createBottomTabNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);  // 예를 들어, 3초 후에 로딩 상태를 false로 설정합니다.
  }, []);

  if (isLoading) {
    return (
      <View style={styles.splashScreenContainer}>
        <Image source={require('./assets/splashicon.png')} style={styles.logo} />
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider style={{ flex: 1 }}>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color }) => {
              return getIcon(route, focused, color);
            },
            tabBarLabel: () => undefined,
            tabBarLabelStyle: {
              marginBottom: 10,
            },
            tabBarIconStyle: {
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            },
          })}
        >

          <Tab.Screen
            name="홈"
            component={Home}
            options={{
              headerTitleAlign: 'left',
              headerTitleStyle: {
                fontSize: Platform.OS === 'ios' ? RFValue(20) : RFValue(20),
              },
            }}
          />
          <Tab.Screen
            name="관리"
            component={Manage}
            options={{
              headerTitleAlign: 'left',
              headerTitleStyle: {
                fontSize: Platform.OS === 'ios' ? RFValue(20) : RFValue(20),
              },
            }}
          />
          <Tab.Screen
            name="설정"
            component={Setting}
            options={{
              headerTitleAlign: 'left',
              headerTitleStyle: {
                fontSize: Platform.OS === 'ios' ? RFValue(20) : RFValue(20),
              },
            }}
          />

        </Tab.Navigator>

      </NavigationContainer>
      <Toast />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#ecf0f1',
    padding: 8,
  },
  paragraph: {
    margin: 24,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  splashScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',  // 배경색
  },
  logo: {
    margin: 20,
    resizeMode: 'contain',  // 이미지의 원래 비율을 유지하면서 가능한 한 많은 공간을 채우도록 크기를 조절합니다.
  },
});
