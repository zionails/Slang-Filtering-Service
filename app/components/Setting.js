import React, { useState, useEffect } from "react";
import { Modal, View, StyleSheet, Platform, StatusBar, TouchableOpacity, Alert, ScrollView } from "react-native";
import { Switch, Text, Title, Divider } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Icons from "react-native-vector-icons/Ionicons";
import Login from './Login';

export default function Setting() {
    const [showLogoutTab, setshowLogoutTab] = useState(false);
    const [LoginComponent, setLoginComponent] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);

    useEffect(() => {
        const intervalId = setInterval(async () => {
            try {
                const AccountIDValue = await AsyncStorage.getItem('AccountID');

                if (AccountIDValue) {
                    setshowLogoutTab(true);
                } else {
                    setshowLogoutTab(false);
                }
            } catch (err) {
                console.error("Error:", err);
                setshowLogoutTab(false);
            }
        })

        return () => {
            clearInterval(intervalId);
        };
    }, []);

    const openLoginModal = () => {
        setLoginComponent(() => Login);
        setIsModalVisible(true);
    };

    const closeLoginModal = () => {
        setIsModalVisible(false);
    };

    const logout = async () => {
        try {
          await AsyncStorage.multiRemove([
            'AccountID',
            'UserName',
          ]);
          setshowLogoutTab(false);
          Alert.alert(
            '로그아웃 완료!',
            '',
            [
              { text: '닫기', onPress: () => {} }
            ]
          );
        } catch (error) {
          console.error('로그아웃 중 오류 발생:', error);
        }
      };

    return (
        <SafeAreaView
            style={{ flex: 1, backgroundColor: "#fff", marginTop: -30 }}
        >
            {!showLogoutTab && (
                <TouchableOpacity onPress={openLoginModal}>
                    <View style={styles.settingRow}>
                        <View style={styles.settingItem}>
                            <Icons
                                name="lock-closed"
                                size={20}
                                color={ "#000"}
                            />
                            <Text
                                style={[
                                    styles.settingText,
                                    { color: "#000" },
                                ]}
                            >
                                로그인
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
                )}
                {showLogoutTab && (  // 조건부 렌더링
                <TouchableOpacity onPress={logout}>
                    <View style={styles.settingRow}>
                        <View style={styles.settingItem}>
                            <Icon
                                name="logout"
                                size={20}
                                color={"#000"}
                            />
                            <Text
                                style={[
                                    styles.settingText,
                                    { color: "#000" },
                                ]}
                            >
                                로그아웃
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
                )}
            <Divider style={{ backgroundColor: "#000" }} />
            <Text style={[styles.header, { color: "#000"  }]}>
                테스트
            </Text>
            <View style={styles.settingRow}>
                <View style={styles.settingItem}>
                    <Text
                        style={[
                            styles.settingText,
                            { color: "#000" },
                        ]}
                    >
                        테스트
                    </Text>
                </View>
            </View>
            <Modal
            style={{ flex: 1, backgroundColor: 'lightgray' }}
                    animationType="slide"
                    transparent={false}
                    visible={isModalVisible}
                    onRequestClose={closeLoginModal}
                >
                    <Login closeLoginModal={closeLoginModal}/>
                </Modal>
        </SafeAreaView>
        
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    header: {
        fontSize: 18,
        marginVertical: 8,
        marginLeft: 8,
        fontWeight: "500",
    },
    settingRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginVertical: 8,
        marginHorizontal: 16,
        paddingVertical: 8,
    },
    anonymous: {
        marginBottom: -5,
    },
    settingItem: {
        flexDirection: "row",
        alignItems: "center",
    },
    settingText: {
        marginLeft: 8,
    },
    IosClosebtn: {
        position: "absolute",
        top: 60,
        right: 20
    },
    AndroidClosebtn: {
        position: "absolute",
        top: 40,
        right: 20
    }
});
